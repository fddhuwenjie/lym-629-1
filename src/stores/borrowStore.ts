import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BorrowRecord, ReminderRecord, BorrowStatus } from '../types';
import { generateId } from '../utils/id';
import { addDays, getOverdueDays, isOverdue } from '../utils/date';
import { useBookStore } from './bookStore';
import { useReaderStore } from './readerStore';
import { useRequestStore } from './requestStore';
import { useTransferStore } from './transferStore';
import { useAuthStore } from './authStore';
import { BORROW_PERIOD_DAYS, OVERDUE_FINE_PER_DAY, RENEW_EXTEND_DAYS } from '../constants';

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
        const { copies, getCopyById, updateCopyStatus } = useBookStore.getState();
        const { getReaderById } = useReaderStore.getState();
        const { getRequestById } = useRequestStore.getState();
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
        const { getCopyById, updateCopyStatus, updateCopyLocation } = useBookStore.getState();
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
          return { success: false, message: '读者存在欠费未处理，请先缴清费用' };
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
    }),
    {
      name: 'library-borrow-storage',
    }
  )
);
