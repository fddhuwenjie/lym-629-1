import { useState } from 'react';
import { Truck, Package, MapPin, Clock, Filter, RotateCcw } from 'lucide-react';
import { useTransferStore } from '../stores/transferStore';
import { useBookStore } from '../stores/bookStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useRequestStore } from '../stores/requestStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { TransferStatus } from '../types';

export const Transfers = () => {
  const { transfers, arriveTransfer, cancelTransfer, startTransfer } = useTransferStore();
  const { getBookById, getCopyById } = useBookStore();
  const { getLibraryById } = useLibraryStore();
  const { getRequestById } = useRequestStore();

  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'arrive' | 'cancel' | 'start' | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAction = (transferId: string, action: 'arrive' | 'cancel' | 'start') => {
    setSelectedTransfer(transferId);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedTransfer || !actionType) return;

    switch (actionType) {
      case 'start':
        startTransfer(selectedTransfer);
        showToast('调拨已出库', 'success');
        break;
      case 'arrive':
        arriveTransfer(selectedTransfer);
        showToast('到馆签收成功', 'success');
        break;
      case 'cancel':
        cancelTransfer(selectedTransfer);
        showToast('调拨已取消，副本已回库', 'success');
        break;
    }
    setSelectedTransfer(null);
    setActionType(null);
  };

  const filteredTransfers = transfers
    .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getActionTitle = () => {
    switch (actionType) {
      case 'start':
        return '确认出库';
      case 'arrive':
        return '确认签收';
      case 'cancel':
        return '确认取消';
      default:
        return '';
    }
  };

  const getActionMessage = () => {
    switch (actionType) {
      case 'start':
        return '确定该副本已出库并开始运输吗？';
      case 'arrive':
        return '确定该副本已到达目标馆点并签收吗？';
      case 'cancel':
        return '确定要取消此调拨吗？取消后副本将返回源馆点。';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">调拨管理</h1>
        <p className="text-gray-500 mt-1">管理馆际图书调拨</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">全部调拨</p>
              <p className="text-xl font-bold text-gray-900">{transfers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待出库</p>
              <p className="text-xl font-bold text-gray-900">
                {transfers.filter((t) => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">运输中</p>
              <p className="text-xl font-bold text-gray-900">
                {transfers.filter((t) => t.status === 'in_transit').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <MapPin size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已签收</p>
              <p className="text-xl font-bold text-gray-900">
                {transfers.filter((t) => t.status === 'arrived').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'all')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
            >
              <option value="all">全部状态</option>
              <option value="pending">待出库</option>
              <option value="in_transit">运输中</option>
              <option value="arrived">已签收</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Truck size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无调拨记录</p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => {
            const copy = getCopyById(transfer.copyId);
            const book = copy ? getBookById(copy.bookId) : null;
            const fromLib = getLibraryById(transfer.fromLibraryId);
            const toLib = getLibraryById(transfer.toLibraryId);
            const request = transfer.requestId
              ? getRequestById(transfer.requestId)
              : null;

            return (
              <div
                key={transfer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#d4a853]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck size={24} className="text-[#d4a853]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{book?.title}</h3>
                        <StatusBadge type="transfer" status={transfer.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        副本：{copy?.barcode}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-sm">
                        <span className="text-gray-600">{fromLib?.name}</span>
                        <RotateCcw
                          size={14}
                          className="text-gray-300"
                          style={{ transform: 'rotate(90deg)' }}
                        />
                        <span className="text-gray-600">{toLib?.name}</span>
                      </div>
                      {request && (
                        <p className="text-xs text-gray-400 mt-2">
                          关联申请：{request.id.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock size={14} />
                        <span>{formatDate(transfer.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        操作人：{transfer.operator}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {transfer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(transfer.id, 'start')}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            确认出库
                          </button>
                          <button
                            onClick={() => handleAction(transfer.id, 'cancel')}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      )}
                      {transfer.status === 'in_transit' && (
                        <>
                          <button
                            onClick={() => handleAction(transfer.id, 'arrive')}
                            className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                          >
                            到馆签收
                          </button>
                          <button
                            onClick={() => handleAction(transfer.id, 'cancel')}
                            className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            取消调拨
                          </button>
                        </>
                      )}
                      {transfer.status === 'arrived' && transfer.arrivedAt && (
                        <p className="text-sm text-emerald-600">
                          签收时间：{formatDate(transfer.arrivedAt)}
                        </p>
                      )}
                      {transfer.status === 'cancelled' && transfer.cancelledAt && (
                        <p className="text-sm text-gray-500">
                          取消时间：{formatDate(transfer.cancelledAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={!!actionType}
        onClose={() => {
          setSelectedTransfer(null);
          setActionType(null);
        }}
        title={getActionTitle()}
        size="sm"
      >
        <p className="text-gray-600 mb-6">{getActionMessage()}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setSelectedTransfer(null);
              setActionType(null);
            }}
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
