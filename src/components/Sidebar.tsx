import {
  LayoutDashboard,
  FileText,
  Truck,
  BookOpen,
  AlertTriangle,
  Users,
  Download,
  Settings,
  LogOut,
  BookMarked,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: '馆藏流转看板',
    path: '/',
    roles: ['librarian', 'reader'],
  },
  {
    icon: FileText,
    label: '借阅申请',
    path: '/requests',
    roles: ['librarian', 'reader'],
  },
  {
    icon: Truck,
    label: '调拨管理',
    path: '/transfers',
    roles: ['librarian'],
  },
  {
    icon: BookOpen,
    label: '借还管理',
    path: '/borrow',
    roles: ['librarian'],
  },
  {
    icon: AlertTriangle,
    label: '逾期催还',
    path: '/overdue',
    roles: ['librarian'],
  },
  {
    icon: Users,
    label: '读者档案',
    path: '/readers',
    roles: ['librarian'],
  },
  {
    icon: Download,
    label: '记录导出',
    path: '/export',
    roles: ['librarian'],
  },
  {
    icon: Settings,
    label: '系统设置',
    path: '/settings',
    roles: ['librarian'],
  },
];

export const Sidebar = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(currentUser?.role || 'reader')
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col h-screen">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4a853] rounded-lg flex items-center justify-center">
            <BookMarked size={24} className="text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">馆际互借系统</h1>
            <p className="text-xs text-white/60">图书馆管理平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-[#d4a853] text-[#1e3a5f] font-medium shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="mb-4 px-2">
          <p className="text-xs text-white/60 mb-1">当前用户</p>
          <p className="text-sm font-medium">
            {currentUser?.name || '未登录'}
          </p>
          <p className="text-xs text-white/60">
            {currentUser?.role === 'librarian' ? '馆员' : '读者'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </aside>
  );
};
