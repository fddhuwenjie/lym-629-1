import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Library } from '../types';
import { generateId } from '../utils/id';

interface LibraryState {
  libraries: Library[];
  addLibrary: (library: Omit<Library, 'id' | 'createdAt'>) => void;
  updateLibrary: (id: string, data: Partial<Library>) => void;
  deleteLibrary: (id: string) => void;
  getLibraryById: (id: string) => Library | undefined;
  getActiveLibraries: () => Library[];
}

const initialLibraries: Library[] = [
  {
    id: 'lib_main',
    name: '中心图书馆',
    address: '市中心文化路88号',
    status: 'active',
    createdAt: new Date('2023-01-01').toISOString(),
  },
  {
    id: 'lib_east',
    name: '东区分馆',
    address: '东区科技路156号',
    status: 'active',
    createdAt: new Date('2023-03-15').toISOString(),
  },
  {
    id: 'lib_west',
    name: '西区分馆',
    address: '西区学院路42号',
    status: 'active',
    createdAt: new Date('2023-05-20').toISOString(),
  },
  {
    id: 'lib_south',
    name: '南区分馆',
    address: '南区滨江大道200号',
    status: 'active',
    createdAt: new Date('2023-08-10').toISOString(),
  },
];

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      libraries: initialLibraries,
      addLibrary: (library) => {
        const newLibrary: Library = {
          ...library,
          id: generateId('lib_'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ libraries: [...state.libraries, newLibrary] }));
      },
      updateLibrary: (id, data) => {
        set((state) => ({
          libraries: state.libraries.map((lib) =>
            lib.id === id ? { ...lib, ...data } : lib
          ),
        }));
      },
      deleteLibrary: (id) => {
        set((state) => ({
          libraries: state.libraries.filter((lib) => lib.id !== id),
        }));
      },
      getLibraryById: (id) => {
        return get().libraries.find((lib) => lib.id === id);
      },
      getActiveLibraries: () => {
        return get().libraries.filter((lib) => lib.status === 'active');
      },
    }),
    {
      name: 'library-library-storage',
    }
  )
);
