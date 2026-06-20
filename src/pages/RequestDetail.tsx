import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Truck, BookOpen, User, MapPin, Clock } from 'lucide-react';
import { useRequestStore } from '../stores/requestStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTransferStore } from '../stores/transferStore';
import { useBorrowStore } from '../stores/borrowStore';
import { useAuthStore } from '../stores/authStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';

export const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useRequestStore((state) => state.getRequestById(id || ''));
  const { getBookById, getCopyById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById } = useLibraryStore();
  const { transfers, createTransfer, getTransfersByStatus } = useTransferStore();
  const { borrowBook } = useBorrowStore();
  const { currentUser } = useAuthStore();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [confirmModal, setConfirmModal] = useState<{
    type: 'transfer' | 'borrow' | 'cancel' | 'reject';
    title: string;
    message: string;
  } | null>(null);

  const isLibrarian = currentUser?.role === 'librarian';

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">申请不存在</p>
        <Link to="/requests" className="text-[#1e3a5f] hover:underline mt-4 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const book = getBookById(request.bookId);
  const reader = getReaderById(request.readerId);
  const targetLibrary = getLibraryById(request.targetLibraryId);
  const matchedCopy = request.matchedCopyId ? getCopyById(request.matchedCopyId) : null;
  const copyLibrary = matchedCopy ? getLibraryById(matchedCopy.currentLibraryId) : null;

  const relatedTransfers = transfers.filter((t) => t.requestId === request.id);
  const latestTransfer = relatedTransfers[0];

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleInitiateTransfer = () => {
    if (!matchedCopy || !targetLibrary) return;
    setConfirmModal({
      type: 'transfer',
      title: '确认发起调拨',
      message: `确定要将 ${book?.title} 从 ${copyLibrary?.name} 调拨到 ${targetLibrary?.name} 吗？`,
    });
  };

  const handleBorrow = () => {
    setConfirmModal({
      type: 'borrow',
      title: '确认借出',
      message: `确定要将 ${book?.title} 借给 ${reader?.name} 吗？`,
    });
  };

  const handleCancel = () => {
    setConfirmModal({
      type: 'cancel',
      title: '确认取消',
      message: '确定要取消此借阅申请吗？',
    });
  };

  const handleReject = () => {
    setConfirmModal({
      type: 'reject',
      title: '确认驳回',
      message: '确定要驳回此借阅申请吗？',
    });
  };

  const confirmAction = () => {
    if (!confirmModal) return;

    switch (confirmModal.type) {
      case 'transfer':
        if (matchedCopy && targetLibrary) {
          createTransfer({
            copyId: matchedCopy.id,
            fromLibraryId: matchedCopy.currentLibraryId,
            toLibraryId: targetLibrary.id,
            requestId: request.id,
          });
          showToast('调拨已发起', 'success');
        }
        break;
      case 'borrow':
        if (matchedCopy && targetLibrary) {
          const result = borrowBook({
            copyId: matchedCopy.id,
            readerId: request.readerId,
            borrowLibraryId: targetLibrary.id,
            requestId: request.id,
          });
          showToast(result.message, result.success ? 'success' : 'error');
        }
        break;
      case 'cancel':
        useRequestStore.getState().updateRequestStatus(request.id, 'cancelled');
        showToast('申请已取消', 'info');
        break;
      case 'reject':
        useRequestStore.getState().updateRequestStatus(request.id, 'rejected');
        showToast('申请已驳回', 'info');
        break;
    }
    setConfirmModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申请详情</h1>
          <p className="text-gray-500 mt-1">申请编号：{request.id}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge type="request" status={request.status} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">图书信息</h2>
            <div className="flex items-start gap-4">
              <div className="w-16 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <BookOpen size={32} className="text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{book?.title}</h3>
                <p className="text-gray-600 mt-1">{book?.author}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  <span>ISBN：{book?.isbn}</span>
                  <span>分类：{book?.category}</span>
                </div>
              </div>
            </div>
          </div>

          {matchedCopy && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">匹配副本</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">副本条码：</span>
                  <span className="font-medium text-gray-900">{matchedCopy.barcode}</span>
                </div>
                <div>
                  <span className="text-gray-500">当前位置：</span>
                  <span className="font-medium text-gray-900">{copyLibrary?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">副本状态：</span>
                  <StatusBadge type="copy" status={matchedCopy.status} size="sm" />
                </div>
              </div>
            </div>
          )}

          {relatedTransfers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">调拨记录</h2>
              <div className="space-y-3">
                {relatedTransfers.map((transfer) => {
                  const fromLib = getLibraryById(transfer.fromLibraryId);
                  const toLib = getLibraryById(transfer.toLibraryId);
                  return (
                    <div
                      key={transfer.id}
                      className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Truck size={18} className="text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {fromLib?.name} → {toLib?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            发起时间：{formatDate(transfer.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge type="transfer" status={transfer.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">申请人</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#d4a853]/10 rounded-full flex items-center justify-center">
                <User size={24} className="text-[#d4a853]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{reader?.name}</p>
                <p className="text-sm text-gray-500">{reader?.cardNo}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">联系电话</span>
                <span className="text-gray-900">{reader?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">邮箱</span>
                <span className="text-gray-900">{reader?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">欠费金额</span>
                <span className={reader && reader.debt > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                  ¥{reader?.debt.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">目标馆点</h2>
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-[#d4a853] mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{targetLibrary?.name}</p>
                <p className="text-sm text-gray-500 mt-1">{targetLibrary?.address}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">申请时间</h2>
            <div className="flex items-start gap-3">
              <Clock size={20} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">{formatDate(request.createdAt)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  更新于：{formatDate(request.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">操作</h2>
            <div className="space-y-3">
              {isLibrarian && request.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      useRequestStore.getState().matchCopy(request.id);
                      showToast('匹配成功', 'success');
                    }}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    匹配副本
                  </button>
                  <button
                    onClick={handleReject}
                    className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    驳回申请
                  </button>
                </>
              )}
              {isLibrarian && request.status === 'matched' && (
                <button
                  onClick={handleInitiateTransfer}
                  className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
                >
                  发起调拨
                </button>
              )}
              {isLibrarian &&
                (request.status === 'arrived' || request.status === 'transferring') &&
                latestTransfer?.status === 'arrived' && (
                  <button
                    onClick={handleBorrow}
                    className="w-full py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    办理借出
                  </button>
                )}
              {!isLibrarian &&
                (request.status === 'pending' || request.status === 'matched') && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消申请
                  </button>
                )}
              {request.status === 'borrowed' && (
                <p className="text-sm text-emerald-600 text-center py-2">
                  图书已借出，请按时归还
                </p>
              )}
              {request.status === 'completed' && (
                <p className="text-sm text-gray-500 text-center py-2">
                  申请已完成
                </p>
              )}
              {request.status === 'cancelled' && (
                <p className="text-sm text-gray-500 text-center py-2">
                  申请已取消
                </p>
              )}
              {request.status === 'rejected' && (
                <p className="text-sm text-gray-500 text-center py-2">
                  申请已驳回
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title || ''}
        size="sm"
      >
        <p className="text-gray-600 mb-6">{confirmModal?.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmModal(null)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmAction}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            确认
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
