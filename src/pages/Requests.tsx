import { useState } from 'react';
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRequestStore } from '../stores/requestStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAuthStore } from '../stores/authStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { RequestStatus } from '../types';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';

export const Requests = () => {
  const navigate = useNavigate();
  const { requests, matchCopy, updateRequestStatus } = useRequestStore();
  const { getBookById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById } = useLibraryStore();
  const { currentUser } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchRequestId, setMatchRequestId] = useState<string | null>(null);

  const isLibrarian = currentUser?.role === 'librarian';

  const filteredRequests = requests
    .filter((r) => {
      if (!isLibrarian && r.readerId !== currentUser?.id) {
        return r.readerId === 'rd_001';
      }
      return true;
    })
    .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
    .filter((r) => {
      if (!searchKeyword) return true;
      const book = getBookById(r.bookId);
      const reader = getReaderById(r.readerId);
      return (
        book?.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        reader?.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.id.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleMatch = (requestId: string) => {
    setMatchRequestId(requestId);
    setMatchModalOpen(true);
  };

  const confirmMatch = () => {
    if (!matchRequestId) return;
    const copyId = matchCopy(matchRequestId);
    if (copyId) {
      showToast('匹配成功！已为申请找到可借副本', 'success');
    } else {
      showToast('暂无可用副本，请稍后再试', 'error');
    }
    setMatchModalOpen(false);
    setMatchRequestId(null);
  };

  const handleReject = (requestId: string) => {
    updateRequestStatus(requestId, 'rejected');
    showToast('申请已驳回', 'info');
  };

  const handleCancel = (requestId: string) => {
    updateRequestStatus(requestId, 'cancelled');
    showToast('申请已取消', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">借阅申请</h1>
          <p className="text-gray-500 mt-1">管理所有借阅申请</p>
        </div>
        {(isLibrarian || currentUser?.role === 'reader') && (
          <button
            onClick={() => navigate('/requests/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors shadow-sm"
          >
            <Plus size={18} />
            新建申请
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="搜索书名、读者姓名或申请编号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
            >
              <option value="all">全部状态</option>
              <option value="pending">待匹配</option>
              <option value="matched">已匹配</option>
              <option value="transferring">调拨中</option>
              <option value="arrived">已到馆</option>
              <option value="borrowed">已借出</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  图书信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  目标馆点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    暂无申请记录
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const book = getBookById(request.bookId);
                  const reader = getReaderById(request.readerId);
                  const library = getLibraryById(request.targetLibraryId);
                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {book?.title}
                        </div>
                        <div className="text-xs text-gray-500">{book?.author}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {reader?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {library?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge type="request" status={request.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/requests/${request.id}`)}
                            className="p-2 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye size={16} />
                          </button>
                          {isLibrarian && request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleMatch(request.id)}
                                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              >
                                匹配副本
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                              >
                                驳回
                              </button>
                            </>
                          )}
                          {!isLibrarian &&
                            (request.status === 'pending' ||
                              request.status === 'matched') && (
                              <button
                                onClick={() => handleCancel(request.id)}
                                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                              >
                                取消
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        title="确认匹配副本"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          系统将自动为该申请匹配最优的可借副本，是否确认？
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setMatchModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmMatch}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            确认匹配
          </button>
        </div>
      </Modal>

      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
