import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transfer, TransferChain, TransferRecord, TransferStatus } from '../types';
import { generateId } from '../utils/id';
import { useBookStore } from './bookStore';
import { useRequestStore } from './requestStore';
import { useAuthStore } from './authStore';

interface TransferState {
  transfers: Transfer[];
  transferChains: TransferChain[];
  transferRecords: TransferRecord[];
  createTransfer: (data: {
    copyId: string;
    fromLibraryId: string;
    toLibraryId: string;
    requestId?: string;
  }) => Transfer;
  createTransferChain: (data: {
    copyId: string;
    route: string[];
    requestId?: string;
  }) => { chain: TransferChain; transfers: Transfer[] } | null;
  startTransfer: (transferId: string) => { success: boolean; message: string };
  arriveTransfer: (transferId: string) => { success: boolean; message: string };
  cancelTransfer: (transferId: string, reason?: string) => { success: boolean; message: string };
  rollbackChain: (chainId: string, reason?: string) => { success: boolean; message: string };
  getTransferById: (id: string) => Transfer | undefined;
  getTransfersByCopy: (copyId: string) => Transfer[];
  getTransfersByStatus: (status: TransferStatus) => Transfer[];
  getInTransitCount: () => number;
  getTransferRecordsByCopy: (copyId: string) => TransferRecord[];
  addTransferRecord: (record: Omit<TransferRecord, 'id' | 'createdAt'>) => void;
  getChainById: (id: string) => TransferChain | undefined;
  getChainByTransfer: (transferId: string) => TransferChain | undefined;
  getChainByCopy: (copyId: string) => TransferChain[];
  getChainsByStatus: (status: TransferChain['status']) => TransferChain[];
  getChainTransfers: (chainId: string) => Transfer[];
  getActiveChainCount: () => number;
  verifyCopyState: (copyId: string) => { valid: boolean; issue?: string };
}

const initialTransfers: Transfer[] = [];
const initialTransferChains: TransferChain[] = [];
const initialTransferRecords: TransferRecord[] = [];

export const useTransferStore = create<TransferState>()(
  persist(
    (set, get) => ({
      transfers: initialTransfers,
      transferChains: initialTransferChains,
      transferRecords: initialTransferRecords,

      createTransfer: (data) => {
        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;
        const { getCopyById } = useBookStore.getState();

        const copy = getCopyById(data.copyId);
        if (!copy) {
          return {} as Transfer;
        }
        if (copy.status !== 'available') {
          return {} as Transfer;
        }

        const newTransfer: Transfer = {
          ...data,
          id: generateId('trans_'),
          status: 'pending',
          operator: currentUser?.name || '系统',
          createdAt: now,
        };

        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: newTransfer.id,
          copyId: data.copyId,
          fromLibraryId: data.fromLibraryId,
          toLibraryId: data.toLibraryId,
          action: 'transfer_start',
          operator: currentUser?.name || '系统',
          createdAt: now,
        };

        set((state) => ({
          transfers: [...state.transfers, newTransfer],
          transferRecords: [...state.transferRecords, record],
        }));

        useBookStore.getState().updateCopyStatus(data.copyId, 'transferring');

        if (data.requestId) {
          useRequestStore.getState().updateRequestStatus(data.requestId, 'transferring');
        }

        return newTransfer;
      },

      createTransferChain: (data) => {
        const { copyId, route, requestId } = data;
        const { getCopyById, updateCopyStatus } = useBookStore.getState();
        const currentUser = useAuthStore.getState().currentUser;

        if (route.length < 2) {
          return null;
        }

        const copy = getCopyById(copyId);
        if (!copy) {
          return null;
        }
        if (copy.status !== 'available') {
          return null;
        }
        if (copy.currentLibraryId !== route[0]) {
          return null;
        }

        const now = new Date().toISOString();
        const chainId = generateId('chain_');
        const createdTransfers: Transfer[] = [];

        let prevTransferId: string | undefined;

        for (let i = 0; i < route.length - 1; i++) {
          const transferId = generateId('trans_');
          const transfer: Transfer = {
            id: transferId,
            requestId,
            chainId,
            prevTransferId,
            copyId,
            fromLibraryId: route[i],
            toLibraryId: route[i + 1],
            status: i === 0 ? 'pending' : 'pending',
            operator: currentUser?.name || '系统',
            createdAt: now,
          };
          if (prevTransferId) {
            createdTransfers[createdTransfers.length - 1].nextTransferId = transferId;
          }
          createdTransfers.push(transfer);
          prevTransferId = transferId;
        }

        const chain: TransferChain = {
          id: chainId,
          copyId,
          requestId,
          transferIds: createdTransfers.map((t) => t.id),
          status: 'active',
          createdAt: now,
        };

        const firstTransfer = createdTransfers[0];
        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: firstTransfer.id,
          copyId,
          fromLibraryId: firstTransfer.fromLibraryId,
          toLibraryId: firstTransfer.toLibraryId,
          action: 'transfer_start',
          operator: currentUser?.name || '系统',
          remark: `跨馆调拨链创建，途经${route.length}个馆点`,
          createdAt: now,
        };

        set((state) => ({
          transfers: [...state.transfers, ...createdTransfers],
          transferChains: [...state.transferChains, chain],
          transferRecords: [...state.transferRecords, record],
        }));

        updateCopyStatus(copyId, 'transferring');

        if (requestId) {
          useRequestStore.getState().updateRequestStatus(requestId, 'transferring');
        }

        return { chain, transfers: createdTransfers };
      },

      startTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer) return { success: false, message: '调拨记录不存在' };
        if (transfer.status !== 'pending') return { success: false, message: '调拨状态不允许出库' };

        if (transfer.prevTransferId) {
          const prev = get().getTransferById(transfer.prevTransferId);
          if (!prev || prev.status !== 'arrived') {
            return { success: false, message: '前一段调拨尚未签收，无法开始本段调拨' };
          }
        }

        const { getCopyById } = useBookStore.getState();
        const copy = getCopyById(transfer.copyId);
        if (!copy || copy.status !== 'transferring') {
          return { success: false, message: '副本状态异常，请先核实' };
        }
        if (copy.currentLibraryId !== transfer.fromLibraryId) {
          return { success: false, message: '副本所在位置与源馆点不符' };
        }

        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;

        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId ? { ...t, status: 'in_transit' as TransferStatus } : t
          ),
        }));

        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: transfer.id,
          copyId: transfer.copyId,
          fromLibraryId: transfer.fromLibraryId,
          toLibraryId: transfer.toLibraryId,
          action: 'transfer_start',
          operator: currentUser?.name || '系统',
          remark: transfer.chainId ? '调拨链出库' : '调拨出库',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));

        return { success: true, message: '调拨已出库' };
      },

      arriveTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer) return { success: false, message: '调拨记录不存在' };
        if (transfer.status !== 'in_transit' && transfer.status !== 'pending') {
          return { success: false, message: '调拨状态不允许签收' };
        }

        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;

        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId
              ? { ...t, status: 'arrived' as TransferStatus, arrivedAt: now }
              : t
          ),
        }));

        useBookStore.getState().updateCopyLocation(transfer.copyId, transfer.toLibraryId);

        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: transfer.id,
          copyId: transfer.copyId,
          fromLibraryId: transfer.fromLibraryId,
          toLibraryId: transfer.toLibraryId,
          action: 'transfer_arrive',
          operator: currentUser?.name || '系统',
          remark: transfer.chainId ? `调拨链第${get().getChainTransfers(transfer.chainId).findIndex((t) => t.id === transfer.id) + 1}段签收` : '到馆签收',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));

        if (transfer.chainId) {
          const chain = get().getChainById(transfer.chainId);
          const chainTransfers = get().getChainTransfers(transfer.chainId);
          const isLast = chainTransfers.findIndex((t) => t.id === transfer.id) === chainTransfers.length - 1;

          if (isLast && chain) {
            set((state) => ({
              transferChains: state.transferChains.map((c) =>
                c.id === chain.id ? { ...c, status: 'completed' as const } : c
              ),
            }));
            useBookStore.getState().updateCopyStatus(transfer.copyId, 'available');

            if (transfer.requestId) {
              useRequestStore.getState().updateRequestStatus(transfer.requestId, 'arrived');
            }
          }
        } else {
          useBookStore.getState().updateCopyStatus(transfer.copyId, 'available');

          if (transfer.requestId) {
            useRequestStore.getState().updateRequestStatus(transfer.requestId, 'arrived');
          }
        }

        return { success: true, message: '到馆签收成功' };
      },

      cancelTransfer: (transferId, reason) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer) return { success: false, message: '调拨记录不存在' };
        if (transfer.status === 'arrived' || transfer.status === 'cancelled' || transfer.status === 'rolled_back') {
          return { success: false, message: '调拨状态不允许取消' };
        }

        if (transfer.chainId) {
          return get().rollbackChain(transfer.chainId, reason || '链条中某段调拨被取消');
        }

        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;

        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId
              ? { ...t, status: 'cancelled' as TransferStatus, cancelledAt: now }
              : t
          ),
        }));

        useBookStore.getState().updateCopyLocation(transfer.copyId, transfer.fromLibraryId);
        useBookStore.getState().updateCopyStatus(transfer.copyId, 'available');

        if (transfer.requestId) {
          useRequestStore.getState().updateRequest(transfer.requestId, {
            status: 'pending',
            matchedCopyId: undefined,
          });
        }

        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: transfer.id,
          copyId: transfer.copyId,
          fromLibraryId: transfer.toLibraryId,
          toLibraryId: transfer.fromLibraryId,
          action: 'transfer_cancel',
          operator: currentUser?.name || '系统',
          remark: reason || '调拨取消，副本回库',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));

        return { success: true, message: '调拨已取消，副本已回库' };
      },

      rollbackChain: (chainId, reason) => {
        const chain = get().getChainById(chainId);
        if (!chain) return { success: false, message: '流转链不存在' };
        if (chain.status === 'rolled_back') return { success: false, message: '流转链已回滚' };

        const chainTransfers = get().getChainTransfers(chainId);
        if (chainTransfers.length === 0) return { success: false, message: '流转链无调拨记录' };

        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;

        let arrivedIndex = -1;
        for (let i = chainTransfers.length - 1; i >= 0; i--) {
          if (chainTransfers[i].status === 'arrived') {
            arrivedIndex = i;
            break;
          }
        }

        const returnLibraryId = arrivedIndex >= 0
          ? chainTransfers[arrivedIndex].fromLibraryId
          : chainTransfers[0].fromLibraryId;

        set((state) => ({
          transfers: state.transfers.map((t) => {
            if (t.chainId !== chainId) return t;
            if (t.status === 'arrived') {
              return { ...t, status: 'rolled_back' as TransferStatus, rolledBackAt: now };
            }
            if (t.status === 'pending' || t.status === 'in_transit') {
              return { ...t, status: 'rolled_back' as TransferStatus, rolledBackAt: now, cancelledAt: now };
            }
            return t;
          }),
          transferChains: state.transferChains.map((c) =>
            c.id === chainId
              ? { ...c, status: 'rolled_back' as const, rolledBackAt: now, rollbackReason: reason }
              : c
          ),
        }));

        useBookStore.getState().updateCopyLocation(chain.copyId, returnLibraryId);
        useBookStore.getState().updateCopyStatus(chain.copyId, 'available');

        if (chain.requestId) {
          useRequestStore.getState().updateRequest(chain.requestId, {
            status: 'pending',
            matchedCopyId: undefined,
          });
        }

        const record: TransferRecord = {
          id: generateId('rec_'),
          copyId: chain.copyId,
          fromLibraryId: chainTransfers[chainTransfers.length - 1].toLibraryId,
          toLibraryId: returnLibraryId,
          action: 'transfer_cancel',
          operator: currentUser?.name || '系统',
          remark: `整链回滚（共${chainTransfers.length}段），原因：${reason || '未说明'}`,
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));

        return { success: true, message: `流转链已回滚，副本已返回${returnLibraryId}` };
      },

      getTransferById: (id) => get().transfers.find((t) => t.id === id),
      getTransfersByCopy: (copyId) =>
        get().transfers.filter((t) => t.copyId === copyId),
      getTransfersByStatus: (status) =>
        get().transfers.filter((t) => t.status === status),
      getInTransitCount: () =>
        get().transfers.filter((t) => t.status === 'in_transit' || t.status === 'pending').length,
      getTransferRecordsByCopy: (copyId) =>
        get().transferRecords.filter((r) => r.copyId === copyId).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      addTransferRecord: (record) => {
        const newRecord: TransferRecord = {
          ...record,
          id: generateId('rec_'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          transferRecords: [...state.transferRecords, newRecord],
        }));
      },

      getChainById: (id) => get().transferChains.find((c) => c.id === id),
      getChainByTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        return transfer?.chainId ? get().getChainById(transfer.chainId) : undefined;
      },
      getChainByCopy: (copyId) =>
        get().transferChains.filter((c) => c.copyId === copyId),
      getChainsByStatus: (status) =>
        get().transferChains.filter((c) => c.status === status),
      getChainTransfers: (chainId) =>
        get().transfers
          .filter((t) => t.chainId === chainId)
          .sort((a, b) => {
            const chain = get().getChainById(chainId);
            if (!chain) return 0;
            return chain.transferIds.indexOf(a.id) - chain.transferIds.indexOf(b.id);
          }),
      getActiveChainCount: () =>
        get().transferChains.filter((c) => c.status === 'active').length,

      verifyCopyState: (copyId) => {
        const copy = useBookStore.getState().getCopyById(copyId);
        if (!copy) return { valid: false, issue: '副本不存在' };

        const activeTransfers = get().getTransfersByCopy(copyId).filter(
          (t) => t.status === 'pending' || t.status === 'in_transit'
        );

        if (copy.status === 'transferring' && activeTransfers.length === 0) {
          return { valid: false, issue: '副本标记为调拨中但无活动调拨记录' };
        }
        if (copy.status !== 'transferring' && activeTransfers.length > 0) {
          return { valid: false, issue: '存在活动调拨但副本未标记为调拨中' };
        }

        return { valid: true };
      },
    }),
    {
      name: 'library-transfer-storage',
    }
  )
);
