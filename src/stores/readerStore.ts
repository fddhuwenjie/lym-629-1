import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reader } from '../types';
import { generateId } from '../utils/id';

interface ReaderState {
  readers: Reader[];
  addReader: (reader: Omit<Reader, 'id' | 'createdAt' | 'debt' | 'maxRenewTimes'>) => void;
  updateReader: (id: string, data: Partial<Reader>) => void;
  deleteReader: (id: string) => void;
  getReaderById: (id: string) => Reader | undefined;
  getReaderByCardNo: (cardNo: string) => Reader | undefined;
  searchReaders: (keyword: string) => Reader[];
  updateDebt: (id: string, amount: number) => void;
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
        set((state) => ({
          readers: state.readers.map((r) =>
            r.id === id ? { ...r, debt: Math.max(0, r.debt + amount) } : r
          ),
        }));
      },
    }),
    {
      name: 'library-reader-storage',
    }
  )
);
