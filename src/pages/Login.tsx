import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, User, Users } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

export const Login = () => {
  const [role, setRole] = useState<UserRole>('librarian');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role, username || (role === 'librarian' ? '张馆长' : '李同学'));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2a4d73] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#d4a853]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#d4a853]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1e3a5f] px-8 py-8 text-center">
            <div className="w-16 h-16 bg-[#d4a853] rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookMarked size={32} className="text-[#1e3a5f]" />
            </div>
            <h1 className="text-2xl font-bold text-white">馆际互借与催还系统</h1>
            <p className="text-white/60 text-sm mt-2">Interlibrary Loan & Reminder System</p>
          </div>

          <div className="p-8">
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('librarian')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  role === 'librarian'
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users size={18} className="mx-auto mb-1" />
                馆员登录
              </button>
              <button
                type="button"
                onClick={() => setRole('reader')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  role === 'reader'
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User size={18} className="mx-auto mb-1" />
                读者登录
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {role === 'librarian' ? '工号 / 姓名' : '读者证号 / 姓名'}
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'librarian' ? '请输入馆员姓名' : '请输入读者姓名'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2a4d73] transition-colors shadow-md hover:shadow-lg"
              >
                登录系统
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                演示账号：直接点击登录即可体验
                <br />
                馆员拥有全部权限，读者可提交申请和查询状态
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
