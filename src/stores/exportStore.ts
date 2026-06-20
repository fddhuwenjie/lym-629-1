import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExportHistory } from '../types';
import { generateId } from '../utils/id';

interface ExportState {
  exportHistory: ExportHistory[];
  addExportRecord: (record: Omit<ExportHistory, 'id' | 'createdAt'>) => void;
  getExportHistory: () => ExportHistory[];
  getExportById: (id: string) => ExportHistory | undefined;
}

const initialExportHistory: ExportHistory[] = [];

export const useExportStore = create<ExportState>()(
  persist(
    (set, get) => ({
      exportHistory: initialExportHistory,
      addExportRecord: (record) => {
        const newRecord: ExportHistory = {
          ...record,
          id: generateId('exp_'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          exportHistory: [newRecord, ...state.exportHistory],
        }));
      },
      getExportHistory: () => get().exportHistory,
      getExportById: (id) => get().exportHistory.find((e) => e.id === id),
    }),
    {
      name: 'library-export-storage',
    }
  )
);
