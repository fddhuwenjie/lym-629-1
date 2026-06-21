import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reader, RiskLevel } from '../types';
import { generateId } from '../utils/id';
import { RISK_LEVEL_THRESHOLDS } from '../constants';

interface ReaderState {
  readers: Reader[];
  addReader: (reader: Omit<Reader, 'id' | 'createdAt' | 'debt' | 'maxRenewTimes' | 'riskLevel'>) => void;
  updateReader: (id: string, data: Partial<Reader>) => void;
  deleteReader: (id: string) => void;
  getReaderById: (id: string) => Reader | undefined;
  getReaderByCardNo: (cardNo: string) => Reader | undefined;
  searchReaders: (keyword: string) => Reader[];
  updateDebt: (id: string, amount: number) => { success: boolean; message: string; restored?: number };
  recalculateRiskLevel: (id: string) => RiskLevel;
  recalculateAllRiskLevels: () => void;
  onDebtCleared?: (readerId: string) => { restoredCount: number };
}

const initialReaders: Reader[] = [
  {
    id: 'rd_001',
    name: '李同学',
    cardNo: 'R20230001',
    phone: '13800138001',
    email: 'li@example.com',
    debt: 0,
    maxRenewTimes: 2,
    riskLevel: 'low',
    createdAt: new Date('2023-01-15').toISOString(),
  },
  {
    id: 'rd_002',
    name: '王老师',
    cardNo: 'R20230002',
    phone: '13800138002',
    email: 'wang@example.com',
    debt: 0,
    maxRenewTimes: 3,
    riskLevel: 'low',
    createdAt: new Date('2023-02-10').toISOString(),
  },
  {
    id: 'rd_003',
    name: '赵同学',
    cardNo: 'R20230003',
    phone: '13800138003',
    email: 'zhao@example.com',
    debt: 3.5,
    maxRenewTimes: 2,
    riskLevel: 'medium',
    createdAt: new Date('2023-03-05').toISOString(),
  },
  {
    id: 'rd_004',
    name: '孙教授',
    cardNo: 'R20230004',
    phone: '13800138004',
    email: 'sun@example.com',
    debt: 0,
    maxRenewTimes: 5,
    riskLevel: 'low',
    createdAt: new Date('2023-04-01').toISOString(),
  },
  {
    id: 'rd_005',
    name: '周同学',
    cardNo: 'R20230005',
    phone: '13800138005',
    email: 'zhou@example.com',
    debt: 12.0,
    maxRenewTimes: 2,
    riskLevel: 'high',
    createdAt: new Date('2023-05-12').toISOString(),
  },
];

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      readers: initialReaders,
      addReader: (reader) => {
        const newReader: Reader = {
          ...reader,
          id: generateId('rd_'),
          debt: 0,
          maxRenewTimes: 2,
          riskLevel: 'low',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ readers: [...state.readers, newReader] }));
      },
      updateReader: (id, data) => {
        set((state) => ({
          readers: state.readers.map((r) => (r.id === id ? { ...r, ...data } : r)),
        }));
      },
      deleteReader: (id) => {
        set((state) => ({
          readers: state.readers.filter((r) => r.id !== id),
        }));
      },
      getReaderById: (id) => get().readers.find((r) => r.id === id),
      getReaderByCardNo: (cardNo) => get().readers.find((r) => r.cardNo === cardNo),
      searchReaders: (keyword) => {
        const kw = keyword.toLowerCase();
        return get().readers.filter(
          (r) =>
            r.name.toLowerCase().includes(kw) ||
            r.cardNo.toLowerCase().includes(kw) ||
            r.phone.includes(kw) ||
            r.email.toLowerCase().includes(kw)
        );
      },
      updateDebt: (id, amount) => {
        const reader = get().getReaderById(id);
        if (!reader) return { success: false, message: '读者不存在' };

        const oldDebt = reader.debt;
        const newDebt = Math.max(0, oldDebt + amount);
        const wasInDebt = oldDebt > 0;
        const nowCleared = wasInDebt && newDebt === 0;

        set((state) => ({
          readers: state.readers.map((r) =>
            r.id === id ? { ...r, debt: newDebt } : r
          ),
        }));

        let restoredCount = 0;
        if (nowCleared) {
          const callback = get().onDebtCleared;
          if (callback) {
            const result = callback(id);
            restoredCount = result.restoredCount;
          }
          get().recalculateRiskLevel(id);
          return {
            success: true,
            message: restoredCount > 0
              ? `缴费成功，已自动补发 ${restoredCount} 次续借资格`
              : '缴费成功',
            restored: restoredCount,
          };
        }

        get().recalculateRiskLevel(id);
        return { success: true, message: newDebt > 0 ? '费用已登记' : '费用已结清' };
      },
      recalculateRiskLevel: (id) => {
        const reader = get().getReaderById(id);
        if (!reader) return 'low';

        let overdueCount = 0;
        try {
          const borrowStore = (window as unknown as { __borrowStore_getOverdueRecords?: () => Array<{ readerId: string }> }).__borrowStore_getOverdueRecords;
          if (borrowStore) {
            overdueCount = borrowStore().filter((r) => r.readerId === id).length;
          }
        } catch {
          // ignore
        }

        let level: RiskLevel = 'low';
        const { highOverdueCount, highDebtAmount, mediumOverdueCount, mediumDebtAmount } = RISK_LEVEL_THRESHOLDS;

        if (overdueCount >= highOverdueCount || reader.debt >= highDebtAmount) {
          level = 'high';
        } else if (overdueCount >= mediumOverdueCount || reader.debt >= mediumDebtAmount) {
          level = 'medium';
        }

        set((state) => ({
          readers: state.readers.map((r) => (r.id === id ? { ...r, riskLevel: level } : r)),
        }));

        return level;
      },
      recalculateAllRiskLevels: () => {
        get().readers.forEach((r) => get().recalculateRiskLevel(r.id));
      },
    }),
    {
      name: 'library-reader-storage',
    }
  )
);
