import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BorrowRecord, ReminderRecord, BorrowStatus, OverdueTier, RiskLevel, OverdueFilters } from '../types';
import { generateId } from '../utils/id';
import { addDays, getOverdueDays, isOverdue } from '../utils/date';
import { useBookStore } from './bookStore';
import { useReaderStore } from './readerStore';
import { useRequestStore } from './requestStore';
import { useTransferStore } from './transferStore';
import { useAuthStore } from './authStore';
import { BORROW_PERIOD_DAYS, OVERDUE_FINE_PER_DAY, RENEW_EXTEND_DAYS, OVERDUE_TIER_THRESHOLDS } from '../constants';

export const getOverdueTier = (days: number): OverdueTier => {
  if (days <= OVERDUE_TIER_THRESHOLDS.tier1) return 'tier1';
  if (days <= OVERDUE_TIER_THRESHOLDS.tier2) return 'tier2';
  if (days <= OVERDUE_TIER_THRESHOLDS.tier3) return 'tier3';
  return 'tier4';
};

interface BorrowState {
  borrowRecords: BorrowRecord[];
  reminderRecords: ReminderRecord[];
  borrowBook: (data: {
    copyId: string;
    readerId: string;
    borrowLibraryId: string;
    requestId?: string;
  }) => { success: boolean; message: string; record?: BorrowRecord };
  returnBook: (copyId: string, returnLibraryId: string) => { success: boolean; message: string };
  renewBook: (borrowRecordId: string) => { success: boolean; message: string };
  restoreMissedRenews: (readerId: string) => { restoredCount: number };
  sendReminder: (borrowRecordId: string, method: 'email' | 'phone' | 'sms') => void;
  getBorrowRecordById: (id: string) => BorrowRecord | undefined;
  getBorrowRecordByCopy: (copyId: string) => BorrowRecord | undefined;
  getActiveBorrowsByReader: (readerId: string) => BorrowRecord[];
  getAllBorrowsByReader: (readerId: string) => BorrowRecord[];
  getOverdueRecords: () => BorrowRecord[];
  getActiveBorrowCount: () => number;
  getOverdueCount: () => number;
  checkOverdue: () => void;
  calculateFine: (borrowRecordId: string) => number;
  getReminderRecordsByBorrow: (borrowRecordId: string) => ReminderRecord[];
  getOverdueByRiskLevel: (level: RiskLevel) => BorrowRecord[];
  getOverdueByLibrary: (libraryId: string) => BorrowRecord[];
  getOverdueByTier: (tier: OverdueTier) => BorrowRecord[];
  getFilteredOverdueRecords: (filters: OverdueFilters) => BorrowRecord[];
  getOverdueStats: () => {
    byRisk: Record<RiskLevel, number>;
    byLibrary: Record<string, number>;
    byTier: Record<OverdueTier, number>;
    totalFine: number;
  };
}

const initialBorrowRecords: BorrowRecord[] = [
  {
    id: 'br_001',
    readerId: 'rd_003',
    copyId: 'copy_006',
    borrowLibraryId: 'lib_main',
    borrowDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    renewTimes: 0,
    reminderCount: 1,
    status: 'overdue',
    fine: 2.5,
    missedRenewCount: 1,
    autoRestored: false,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'br_002',
    readerId: 'rd_005',
    copyId: 'copy_010',
    borrowLibraryId: 'lib_east',
    borrowDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    renewTimes: 1,
    reminderCount: 2,
    status: 'overdue',
    fine: 7.5,
    missedRenewCount: 0,
    autoRestored: false,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'br_003',
    readerId: 'rd_002',
    copyId: 'copy_004',
    borrowLibraryId: 'lib_main',
    borrowDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    renewTimes: 0,
    reminderCount: 0,
    status: 'borrowed',
    fine: 0,
    missedRenewCount: 0,
    autoRestored: false,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const initialReminderRecords: ReminderRecord[] = [
  {
    id: 'rem_001',
    borrowRecordId: 'br_001',
    method: 'email',
    operator: '系统',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rem_002',
    borrowRecordId: 'br_002',
    method: 'sms',
    operator: '张馆长',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rem_003',
    borrowRecordId: 'br_002',
    method: 'phone',
    operator: '张馆长',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useBorrowStore = create<BorrowState>()(
  persist(
    (set, get) => ({
      borrowRecords: initialBorrowRecords,
      reminderRecords: initialReminderRecords,

      borrowBook: (data) => {
        const { copyId, readerId, borrowLibraryId, requestId } = data;
        const { getCopyById, updateCopyStatus } = useBookStore.getState();
        const { getReaderById } = useReaderStore.getState();
        const currentUser = useAuthStore.getState().currentUser;

        const copy = getCopyById(copyId);
        if (!copy) {
          return { success: false, message: '副本不存在' };
        }

        if (copy.status === 'borrowed') {
          return { success: false, message: '该副本已外借，无法借出' };
        }

        if (copy.status === 'transferring') {
          return { success: false, message: '该副本正在调拨途中，无法借出' };
        }

        if (copy.status !== 'available') {
          return { success: false, message: '该副本当前状态不可借' };
        }

        if (copy.currentLibraryId !== borrowLibraryId) {
          return { success: false, message: '副本不在当前馆点，无法借出' };
        }

        const reader = getReaderById(readerId);
        if (!reader) {
          return { success: false, message: '读者不存在' };
        }

        if (reader.debt > 0) {
          return { success: false, message: '读者存在欠费未处理，请先缴清费用' };
        }

        const now = new Date().toISOString();
        const dueDate = addDays(now, BORROW_PERIOD_DAYS);

        const newRecord: BorrowRecord = {
          id: generateId('br_'),
          readerId,
          copyId,
          borrowLibraryId,
          requestId,
          borrowDate: now,
          dueDate,
          renewTimes: 0,
          reminderCount: 0,
          status: 'borrowed',
          fine: 0,
          missedRenewCount: 0,
          autoRestored: false,
          createdAt: now,
        };

        set((state) => ({
          borrowRecords: [...state.borrowRecords, newRecord],
        }));

        updateCopyStatus(copyId, 'borrowed');

        if (requestId) {
          useRequestStore.getState().updateRequestStatus(requestId, 'borrowed');
        }

        useTransferStore.getState().addTransferRecord({
          copyId,
          fromLibraryId: borrowLibraryId,
          toLibraryId: borrowLibraryId,
          action: 'borrow_out',
          operator: currentUser?.name || '系统',
          remark: `借给读者：${reader.name}`,
        });

        return { success: true, message: '借出成功', record: newRecord };
      },

      returnBook: (copyId, returnLibraryId) => {
        const { updateCopyStatus, updateCopyLocation } = useBookStore.getState();
        const { getReaderById, updateDebt } = useReaderStore.getState();
        const currentUser = useAuthStore.getState().currentUser;

        const activeBorrow = get()
          .borrowRecords.filter((r) => r.status !== 'returned' && r.status !== 'lost')
          .find((r) => r.copyId === copyId);

        if (!activeBorrow) {
          return { success: false, message: '该副本没有借阅记录' };
        }

        if (activeBorrow.borrowLibraryId !== returnLibraryId) {
          return { success: false, message: '归还馆点与借出馆点不一致，请归还到借出馆点' };
        }

        const now = new Date().toISOString();
        const overdueDays = getOverdueDays(activeBorrow.dueDate);
        const fine = overdueDays * OVERDUE_FINE_PER_DAY;

        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) =>
            r.id === activeBorrow.id
              ? {
                  ...r,
                  returnDate: now,
                  returnLibraryId,
                  status: 'returned' as BorrowStatus,
                  fine,
                }
              : r
          ),
        }));

        updateCopyStatus(copyId, 'available');
        updateCopyLocation(copyId, returnLibraryId);

        if (fine > 0) {
          updateDebt(activeBorrow.readerId, fine);
        }

        const reader = getReaderById(activeBorrow.readerId);

        useTransferStore.getState().addTransferRecord({
          copyId,
          fromLibraryId: returnLibraryId,
          toLibraryId: returnLibraryId,
          action: 'return_in',
          operator: currentUser?.name || '系统',
          remark: `读者归还：${reader?.name || '未知'}，逾期${overdueDays}天，罚款${fine.toFixed(2)}元`,
        });

        const requestId = activeBorrow.requestId;
        if (requestId) {
          useRequestStore.getState().updateRequestStatus(requestId, 'completed');
        }

        return { success: true, message: '归还成功' };
      },

      renewBook: (borrowRecordId) => {
        const { getReaderById } = useReaderStore.getState();
        const record = get().getBorrowRecordById(borrowRecordId);

        if (!record) {
          return { success: false, message: '借阅记录不存在' };
        }

        if (record.status === 'returned' || record.status === 'lost') {
          return { success: false, message: '该借阅已结束，无法续借' };
        }

        const reader = getReaderById(record.readerId);
        if (!reader) {
          return { success: false, message: '读者不存在' };
        }

        if (reader.debt > 0) {
          set((state) => ({
            borrowRecords: state.borrowRecords.map((r) =>
              r.id === borrowRecordId ? { ...r, missedRenewCount: r.missedRenewCount + 1 } : r
            ),
          }));
          return { success: false, message: '读者存在欠费未处理，请先缴清费用，续借资格将在缴费后自动补发' };
        }

        if (record.renewTimes >= reader.maxRenewTimes) {
          return { success: false, message: `续借次数超限，最多可续借${reader.maxRenewTimes}次` };
        }

        const newDueDate = addDays(record.dueDate, RENEW_EXTEND_DAYS);

        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) =>
            r.id === borrowRecordId
              ? {
                  ...r,
                  dueDate: newDueDate,
                  renewTimes: r.renewTimes + 1,
                  status: isOverdue(newDueDate) ? 'overdue' : 'renewed',
                }
              : r
          ),
        }));

        return { success: true, message: '续借成功' };
      },

      restoreMissedRenews: (readerId) => {
        const { getReaderById } = useReaderStore.getState();
        const reader = getReaderById(readerId);
        if (!reader) return { restoredCount: 0 };

        const activeRecords = get()
          .getActiveBorrowsByReader(readerId)
          .filter((r) => r.missedRenewCount > 0 && r.renewTimes < reader.maxRenewTimes);

        let totalRestored = 0;

        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) => {
            if (!activeRecords.find((ar) => ar.id === r.id)) return r;
            const maxRestorable = reader.maxRenewTimes - r.renewTimes;
            const toRestore = Math.min(r.missedRenewCount, maxRestorable);
            if (toRestore <= 0) return r;

            let newDueDate = r.dueDate;
            for (let i = 0; i < toRestore; i++) {
              newDueDate = addDays(newDueDate, RENEW_EXTEND_DAYS);
            }
            totalRestored += toRestore;

            return {
              ...r,
              renewTimes: r.renewTimes + toRestore,
              missedRenewCount: r.missedRenewCount - toRestore,
              dueDate: newDueDate,
              status: isOverdue(newDueDate) ? 'overdue' : 'renewed',
              autoRestored: true,
              fine: isOverdue(newDueDate) ? getOverdueDays(newDueDate) * OVERDUE_FINE_PER_DAY : 0,
            };
          }),
        }));

        return { restoredCount: totalRestored };
      },

      sendReminder: (borrowRecordId, method) => {
        const currentUser = useAuthStore.getState().currentUser;
        const now = new Date().toISOString();

        const reminder: ReminderRecord = {
          id: generateId('rem_'),
          borrowRecordId,
          method,
          operator: currentUser?.name || '系统',
          createdAt: now,
        };

        set((state) => ({
          reminderRecords: [...state.reminderRecords, reminder],
          borrowRecords: state.borrowRecords.map((r) =>
            r.id === borrowRecordId ? { ...r, reminderCount: r.reminderCount + 1 } : r
          ),
        }));
      },

      getBorrowRecordById: (id) => get().borrowRecords.find((r) => r.id === id),
      getBorrowRecordByCopy: (copyId) =>
        get()
          .borrowRecords.filter((r) => r.status !== 'returned' && r.status !== 'lost')
          .find((r) => r.copyId === copyId),
      getActiveBorrowsByReader: (readerId) =>
        get()
          .borrowRecords.filter((r) => r.readerId === readerId)
          .filter((r) => r.status !== 'returned' && r.status !== 'lost')
          .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()),
      getAllBorrowsByReader: (readerId) =>
        get()
          .borrowRecords.filter((r) => r.readerId === readerId)
          .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()),
      getOverdueRecords: () =>
        get()
          .borrowRecords.filter((r) => r.status === 'overdue')
          .sort((a, b) => {
            const overdueA = getOverdueDays(a.dueDate);
            const overdueB = getOverdueDays(b.dueDate);
            return overdueB - overdueA;
          }),
      getActiveBorrowCount: () =>
        get().borrowRecords.filter((r) => r.status !== 'returned' && r.status !== 'lost').length,
      getOverdueCount: () => get().borrowRecords.filter((r) => r.status === 'overdue').length,
      checkOverdue: () => {
        const now = new Date();
        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) => {
            if (r.status === 'returned' || r.status === 'lost') return r;
            const due = new Date(r.dueDate);
            if (now > due && r.status !== 'overdue') {
              const overdueDays = getOverdueDays(r.dueDate);
              return {
                ...r,
                status: 'overdue' as BorrowStatus,
                fine: overdueDays * OVERDUE_FINE_PER_DAY,
              };
            }
            if (r.status === 'overdue') {
              const overdueDays = getOverdueDays(r.dueDate);
              return { ...r, fine: overdueDays * OVERDUE_FINE_PER_DAY };
            }
            return r;
          }),
        }));
      },
      calculateFine: (borrowRecordId) => {
        const record = get().getBorrowRecordById(borrowRecordId);
        if (!record) return 0;
        const overdueDays = getOverdueDays(record.dueDate);
        return overdueDays * OVERDUE_FINE_PER_DAY;
      },
      getReminderRecordsByBorrow: (borrowRecordId) =>
        get()
          .reminderRecords.filter((r) => r.borrowRecordId === borrowRecordId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

      getOverdueByRiskLevel: (level) => {
        const { getReaderById } = useReaderStore.getState();
        return get().getOverdueRecords().filter((r) => {
          const reader = getReaderById(r.readerId);
          return reader?.riskLevel === level;
        });
      },

      getOverdueByLibrary: (libraryId) =>
        get().getOverdueRecords().filter((r) => r.borrowLibraryId === libraryId),

      getOverdueByTier: (tier) =>
        get().getOverdueRecords().filter((r) => getOverdueTier(getOverdueDays(r.dueDate)) === tier),

      getFilteredOverdueRecords: (filters) => {
        const { getReaderById } = useReaderStore.getState();
        return get()
          .getOverdueRecords()
          .filter((r) => {
            if (filters.riskLevels && filters.riskLevels.length > 0) {
              const reader = getReaderById(r.readerId);
              if (!reader || !filters.riskLevels.includes(reader.riskLevel)) return false;
            }
            if (filters.libraryIds && filters.libraryIds.length > 0) {
              if (!filters.libraryIds.includes(r.borrowLibraryId)) return false;
            }
            const days = getOverdueDays(r.dueDate);
            if (filters.overdueTier) {
              if (getOverdueTier(days) !== filters.overdueTier) return false;
            }
            if (filters.minOverdueDays !== undefined && days < filters.minOverdueDays) return false;
            if (filters.maxOverdueDays !== undefined && days > filters.maxOverdueDays) return false;
            if (filters.startDate && r.dueDate < filters.startDate) return false;
            if (filters.endDate && r.dueDate > filters.endDate) return false;
            return true;
          });
      },

      getOverdueStats: () => {
        const { getReaderById } = useReaderStore.getState();
        const records = get().getOverdueRecords();
        const byRisk: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
        const byLibrary: Record<string, number> = {};
        const byTier: Record<OverdueTier, number> = { tier1: 0, tier2: 0, tier3: 0, tier4: 0 };
        let totalFine = 0;

        for (const r of records) {
          const reader = getReaderById(r.readerId);
          if (reader) byRisk[reader.riskLevel]++;

          byLibrary[r.borrowLibraryId] = (byLibrary[r.borrowLibraryId] || 0) + 1;

          const tier = getOverdueTier(getOverdueDays(r.dueDate));
          byTier[tier]++;

          totalFine += r.fine;
        }

        return { byRisk, byLibrary, byTier, totalFine };
      },
    }),
    {
      name: 'library-borrow-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const w = window as unknown as { __borrowStore_getOverdueRecords?: () => BorrowRecord[] };
          w.__borrowStore_getOverdueRecords = () => state.getOverdueRecords();
        }
      },
    }
  )
);

setTimeout(() => {
  const readerState = useReaderStore.getState();
  if (!readerState.onDebtCleared) {
    readerState.onDebtCleared = (readerId: string) => {
      return useBorrowStore.getState().restoreMissedRenews(readerId);
    };
  }

  const w = window as unknown as { __borrowStore_getOverdueRecords?: () => BorrowRecord[] };
  w.__borrowStore_getOverdueRecords = () => useBorrowStore.getState().getOverdueRecords();
}, 0);
