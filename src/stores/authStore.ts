import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';

interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (role: UserRole, username: string) => void;
  logout: () => void;
}

const mockLibrarian: User = {
  id: 'lib_001',
  name: '张馆长',
  role: 'librarian',
};

const mockReader: User = {
  id: 'rd_001',
  name: '李同学',
  role: 'reader',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isLoggedIn: false,
      login: (role, username) => {
        if (role === 'librarian') {
          set({ currentUser: mockLibrarian, isLoggedIn: true });
        } else {
          set({
            currentUser: { ...mockReader, name: username || mockReader.name },
            isLoggedIn: true,
          });
        }
      },
      logout: () => {
        set({ currentUser: null, isLoggedIn: false });
      },
    }),
    {
      name: 'library-auth-storage',
    }
  )
);
