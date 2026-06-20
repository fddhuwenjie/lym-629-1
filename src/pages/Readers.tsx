import { useState } from 'react';
import { Users, Search, Eye, BookOpen, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReaderStore } from '../stores/readerStore';
import { useBorrowStore } from '../stores/borrowStore';
import { formatDate } from '../utils/date';

export const Readers = () => {
  const navigate = useNavigate();
  const { readers, searchReaders } = useReaderStore();
  const { getActiveBorrowsByReader, getAllBorrowsByReader } = useBorrowStore();

  const [searchKeyword, setSearchKeyword] = useState('');

  const displayReaders = searchKeyword ? searchReaders(searchKeyword) : readers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">读者档案</h1>
        <p className="text-gray-500 mt-1">管理读者信息与借阅记录</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">读者总数</p>
              <p className="text-2xl font-bold text-gray-900">{readers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">在借人数</p>
              <p className="text-2xl font-bold text-gray-900">
                {readers.filter((r) => getActiveBorrowsByReader(r.id).length > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">欠费读者</p>
              <p className="text-2xl font-bold text-red-600">
                {readers.filter((r) => r.debt > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">累计借阅</p>
              <p className="text-2xl font-bold text-gray-900">
                {readers.reduce((sum, r) => sum + getAllBorrowsByReader(r.id).length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="搜索读者姓名、证号、电话或邮箱..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {displayReaders.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无读者</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    读者信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    读者证号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    联系电话
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    在借数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    欠费金额
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayReaders.map((reader) => {
                  const activeBorrows = getActiveBorrowsByReader(reader.id);
                  return (
                    <tr key={reader.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#d4a853]/10 rounded-full flex items-center justify-center">
                            <Users size={18} className="text-[#d4a853]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {reader.name}
                            </p>
                            <p className="text-xs text-gray-500">{reader.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {reader.cardNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {reader.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {activeBorrows.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reader.debt > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            ¥{reader.debt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">¥0.00</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(reader.createdAt, 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => navigate(`/readers/${reader.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#2a4d73] transition-colors"
                        >
                          <Eye size={12} />
                          查看档案
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
