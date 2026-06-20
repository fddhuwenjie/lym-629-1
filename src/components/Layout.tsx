import { ReactNode, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useBorrowStore } from '../stores/borrowStore';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();
  const checkOverdue = useBorrowStore((state) => state.checkOverdue);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      checkOverdue();
      const interval = setInterval(checkOverdue, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, checkOverdue]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#faf8f5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
