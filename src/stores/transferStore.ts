import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transfer, TransferRecord, TransferStatus } from '../types';
import { generateId } from '../utils/id';
import { useBookStore } from './bookStore';
import { useRequestStore } from './requestStore';
import { useAuthStore } from './authStore';

interface TransferState {
  transfers: Transfer[];
  transferRecords: TransferRecord[];
  createTransfer: (data: {
    copyId: string;
    fromLibraryId: string;
    toLibraryId: string;
    requestId?: string;
  }) => Transfer;
  startTransfer: (transferId: string) => void;
  arriveTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;
  getTransferById: (id: string) => Transfer | undefined;
  getTransfersByCopy: (copyId: string) => Transfer[];
  getTransfersByStatus: (status: TransferStatus) => Transfer[];
  getInTransitCount: () => number;
  getTransferRecordsByCopy: (copyId: string) => TransferRecord[];
  addTransferRecord: (record: Omit<TransferRecord, 'id' | 'createdAt'>) => void;
}

const initialTransfers: Transfer[] = [];

const initialTransferRecords: TransferRecord[] = [];

export const useTransferStore = create<TransferState>()(
  persist(
    (set, get) => ({
      transfers: initialTransfers,
      transferRecords: initialTransferRecords,
      createTransfer: (data) => {
        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().currentUser;
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
      startTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer || transfer.status !== 'pending') return;

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
          remark: '调拨出库',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));
      },
      arriveTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer || (transfer.status !== 'in_transit' && transfer.status !== 'pending')) return;

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
        useBookStore.getState().updateCopyStatus(transfer.copyId, 'available');

        if (transfer.requestId) {
          useRequestStore.getState().updateRequestStatus(transfer.requestId, 'arrived');
        }

        const record: TransferRecord = {
          id: generateId('rec_'),
          transferId: transfer.id,
          copyId: transfer.copyId,
          fromLibraryId: transfer.fromLibraryId,
          toLibraryId: transfer.toLibraryId,
          action: 'transfer_arrive',
          operator: currentUser?.name || '系统',
          remark: '到馆签收',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));
      },
      cancelTransfer: (transferId) => {
        const transfer = get().getTransferById(transferId);
        if (!transfer || transfer.status === 'arrived' || transfer.status === 'cancelled') return;

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
          remark: '调拨取消，副本回库',
          createdAt: now,
        };

        set((state) => ({
          transferRecords: [...state.transferRecords, record],
        }));
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
    }),
    {
      name: 'library-transfer-storage',
    }
  )
);
