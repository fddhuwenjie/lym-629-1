import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BorrowRequest, RequestStatus } from '../types';
import { generateId } from '../utils/id';
import { useBookStore } from './bookStore';

interface RequestState {
  requests: BorrowRequest[];
  createRequest: (data: Omit<BorrowRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => BorrowRequest;
  updateRequestStatus: (id: string, status: RequestStatus) => void;
  updateRequest: (id: string, data: Partial<BorrowRequest>) => void;
  matchCopy: (requestId: string) => string | null;
  getRequestById: (id: string) => BorrowRequest | undefined;
  getRequestsByReader: (readerId: string) => BorrowRequest[];
  getRequestsByStatus: (status: RequestStatus) => BorrowRequest[];
  getPendingRequests: () => BorrowRequest[];
}

const initialRequests: BorrowRequest[] = [
  {
    id: 'req_001',
    readerId: 'rd_001',
    bookId: 'book_004',
    targetLibraryId: 'lib_east',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req_002',
    readerId: 'rd_002',
    bookId: 'book_001',
    targetLibraryId: 'lib_south',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

export const useRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requests: initialRequests,
      createRequest: (data) => {
        const now = new Date().toISOString();
        const newRequest: BorrowRequest = {
          ...data,
          id: generateId('req_'),
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ requests: [...state.requests, newRequest] }));
        return newRequest;
      },
      updateRequestStatus: (id, status) => {
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },
      updateRequest: (id, data) => {
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },
      matchCopy: (requestId) => {
        const request = get().getRequestById(requestId);
        if (!request) return null;

        const { copies } = useBookStore.getState();
        const { requests } = get();

        const bookCopies = copies.filter((c) => c.bookId === request.bookId);

        const matchedOrTransferringCopyIds = requests
          .filter((r) => r.status === 'matched' || r.status === 'transferring')
          .filter((r) => r.matchedCopyId)
          .map((r) => r.matchedCopyId!);

        const availableCopies = bookCopies.filter(
          (c) => c.status === 'available' && !matchedOrTransferringCopyIds.includes(c.id)
        );

        if (availableCopies.length === 0) {
          return null;
        }

        const targetLibraryCopy = availableCopies.find(
          (c) => c.currentLibraryId === request.targetLibraryId
        );
        const matchedCopy = targetLibraryCopy || availableCopies[0];

        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === requestId
              ? { ...r, matchedCopyId: matchedCopy.id, status: 'matched', updatedAt: new Date().toISOString() }
              : r
          ),
        }));

        return matchedCopy.id;
      },
      getRequestById: (id) => get().requests.find((r) => r.id === id),
      getRequestsByReader: (readerId) =>
        get().requests.filter((r) => r.readerId === readerId),
      getRequestsByStatus: (status) =>
        get().requests.filter((r) => r.status === status),
      getPendingRequests: () =>
        get().requests.filter((r) => r.status === 'pending'),
    }),
    {
      name: 'library-request-storage',
    }
  )
);
