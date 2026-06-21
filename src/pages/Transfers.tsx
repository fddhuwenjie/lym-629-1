import { useState, useMemo } from 'react';
import { Truck, Package, MapPin, Clock, Filter, RotateCcw, Plus, GitBranch, X, ChevronRight, AlertCircle } from 'lucide-react';
import { useTransferStore } from '../stores/transferStore';
import { useBookStore } from '../stores/bookStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useRequestStore } from '../stores/requestStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { TransferStatus } from '../types';

type ViewMode = 'transfers' | 'chains';

export const Transfers = () => {
  const {
    transfers,
    transferChains,
    arriveTransfer,
    cancelTransfer,
    startTransfer,
    createTransferChain,
    rollbackChain,
    getChainTransfers,
    getChainByTransfer,
    getActiveChainCount,
    getChainsByStatus,
  } = useTransferStore();
  const { getBookById, getCopyById, copies, getAvailableCopies } = useBookStore();
  const { getLibraryById, getActiveLibraries } = useLibraryStore();
  const { getRequestById } = useRequestStore();

  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('transfers');
  const [chainStatusFilter, setChainStatusFilter] = useState<'all' | 'active' | 'completed' | 'rolled_back'>('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'arrive' | 'cancel' | 'start' | 'rollback' | null>(null);

  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [routeLibraries, setRouteLibraries] = useState<string[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAction = (transferId: string, action: 'arrive' | 'cancel' | 'start' | 'rollback') => {
    setSelectedTransfer(transferId);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedTransfer || !actionType) return;

    let result: { success: boolean; message: string } = { success: false, message: '' };

    switch (actionType) {
      case 'start':
        result = startTransfer(selectedTransfer);
        break;
      case 'arrive':
        result = arriveTransfer(selectedTransfer);
        break;
      case 'cancel': {
        const t = useTransferStore.getState().getTransferById(selectedTransfer);
        if (t?.chainId) {
          result = rollbackChain(t.chainId, '手动取消触发整链回滚');
        } else {
          result = cancelTransfer(selectedTransfer);
        }
        break;
      }
      case 'rollback':
        result = rollbackChain(selectedTransfer, '操作员主动回滚');
        break;
    }

    showToast(result.message, result.success ? 'success' : 'error');
    setSelectedTransfer(null);
    setActionType(null);
  };

  const handleAddLibraryToRoute = (libId: string) => {
    if (!routeLibraries.includes(libId)) {
      setRouteLibraries([...routeLibraries, libId]);
    }
  };

  const handleRemoveLibraryFromRoute = (index: number) => {
    setRouteLibraries(routeLibraries.filter((_, i) => i !== index));
  };

  const handleCreateChain = () => {
    if (!selectedCopyId || routeLibraries.length < 2) {
      showToast('请选择副本并至少选择2个馆点', 'error');
      return;
    }
    const result = createTransferChain({
      copyId: selectedCopyId,
      route: routeLibraries,
    });
    if (result) {
      showToast(`调拨链创建成功，共${result.transfers.length}段`, 'success');
      setChainModalOpen(false);
      setSelectedCopyId('');
      setSelectedBookId('');
      setRouteLibraries([]);
    } else {
      showToast('创建失败，请检查副本和馆点选择', 'error');
    }
  };

  const filteredTransfers = useMemo(() =>
    transfers
      .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transfers, statusFilter]
  );

  const filteredChains = useMemo(() => {
    let chains = transferChains;
    if (chainStatusFilter !== 'all') {
      chains = getChainsByStatus(chainStatusFilter as 'active' | 'completed' | 'rolled_back');
    }
    return [...chains].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transferChains, chainStatusFilter, getChainsByStatus]);

  const availableBooks = useMemo(() => {
    const bookIds = new Set(getAvailableCopies('').map((c) => c.bookId));
    return Array.from(bookIds).map((id) => getBookById(id)).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAvailableCopies, getBookById]);

  const filteredCopies = selectedBookId
    ? getAvailableCopies(selectedBookId)
    : copies.filter((c) => c.status === 'available');

  const activeLibraries = getActiveLibraries();

  const getActionTitle = () => {
    switch (actionType) {
      case 'start':
        return '确认出库';
      case 'arrive':
        return '确认签收';
      case 'cancel':
        return '确认取消';
      case 'rollback':
        return '确认回滚流转链';
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
      case 'cancel': {
        const t = selectedTransfer ? useTransferStore.getState().getTransferById(selectedTransfer) : null;
        if (t?.chainId) {
          return '此调拨属于流转链，取消将触发整链回滚。确定继续吗？';
        }
        return '确定要取消此调拨吗？取消后副本将返回源馆点。';
      }
      case 'rollback':
        return '确定要回滚整条流转链吗？所有环节将被撤销，副本将返回起始馆点。';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">调拨管理</h1>
          <p className="text-gray-500 mt-1">管理馆际图书调拨与多跳联合流转</p>
        </div>
        <button
          onClick={() => setChainModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors shadow-sm"
        >
          <Plus size={18} />
          跨馆联合调拨
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('transfers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'transfers'
                ? 'bg-[#d4a853] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Truck size={16} />
              调拨记录
            </span>
          </button>
          <button
            onClick={() => setViewMode('chains')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'chains'
                ? 'bg-[#d4a853] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <GitBranch size={16} />
              流转链
              {getActiveChainCount() > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {getActiveChainCount()}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'transfers' && (
        <>
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
                  <option value="rolled_back">已回滚</option>
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
                const chain = transfer.chainId ? getChainByTransfer(transfer.id) : null;
                const chainTransfers = chain ? getChainTransfers(chain.id) : [];
                const chainIndex = chainTransfers.findIndex((t) => t.id === transfer.id);

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
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{book?.title}</h3>
                            <StatusBadge type="transfer" status={transfer.status} />
                            {chain && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">
                                <GitBranch size={12} />
                                流转链第 {chainIndex + 1}/{chainTransfers.length} 段
                              </span>
                            )}
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
                          {chain?.rollbackReason && (
                            <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                              <AlertCircle size={12} />
                              回滚原因：{chain.rollbackReason}
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
                          {transfer.status === 'rolled_back' && transfer.rolledBackAt && (
                            <p className="text-sm text-purple-600">
                              回滚时间：{formatDate(transfer.rolledBackAt)}
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
        </>
      )}

      {viewMode === 'chains' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <GitBranch size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">流转链总数</p>
                  <p className="text-xl font-bold text-gray-900">{transferChains.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Truck size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">流转中</p>
                  <p className="text-xl font-bold text-gray-900">
                    {getChainsByStatus('active').length}
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
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-xl font-bold text-gray-900">
                    {getChainsByStatus('completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <RotateCcw size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">已回滚</p>
                  <p className="text-xl font-bold text-gray-900">
                    {getChainsByStatus('rolled_back').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={chainStatusFilter}
                onChange={(e) => setChainStatusFilter(e.target.value as typeof chainStatusFilter)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
              >
                <option value="all">全部状态</option>
                <option value="active">流转中</option>
                <option value="completed">已完成</option>
                <option value="rolled_back">已回滚</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredChains.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <GitBranch size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无流转链</p>
                <button
                  onClick={() => setChainModalOpen(true)}
                  className="mt-4 px-4 py-2 text-sm text-[#1e3a5f] bg-[#d4a853]/10 rounded-lg hover:bg-[#d4a853]/20 transition-colors"
                >
                  创建第一条流转链
                </button>
              </div>
            ) : (
              filteredChains.map((chain) => {
                const cTransfers = getChainTransfers(chain.id);
                const copy = getCopyById(chain.copyId);
                const book = copy ? getBookById(copy.bookId) : null;

                return (
                  <div
                    key={chain.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <GitBranch size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{book?.title}</h3>
                            <StatusBadge type="chain" status={chain.status} />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            副本 {copy?.barcode} · {cTransfers.length} 段流转
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {chain.status === 'active' && (
                          <button
                            onClick={() => handleAction(chain.id, 'rollback')}
                            className="px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <span className="flex items-center gap-1">
                              <RotateCcw size={14} />
                              整链回滚
                            </span>
                          </button>
                        )}
                        {chain.rolledBackAt && (
                          <p className="text-xs text-gray-500">
                            回滚于 {formatDate(chain.rolledBackAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                      {cTransfers.map((t, idx) => {
                        const fromLib = getLibraryById(t.fromLibraryId);
                        const toLib = getLibraryById(t.toLibraryId);
                        return (
                          <div key={t.id} className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-48 bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">第 {idx + 1} 段</span>
                                <StatusBadge type="transfer" status={t.status} size="sm" />
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin size={12} className="text-gray-400" />
                                <span className="text-gray-600 truncate">{fromLib?.name}</span>
                              </div>
                              <div className="flex items-center justify-center my-1">
                                <ChevronRight size={14} className="text-gray-300" />
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin size={12} className="text-[#d4a853]" />
                                <span className="text-gray-900 font-medium truncate">{toLib?.name}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {chain.rollbackReason && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-700 flex items-start gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">回滚原因：</span>
                          {chain.rollbackReason}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={chainModalOpen}
        onClose={() => setChainModalOpen(false)}
        title="创建跨馆联合调拨链"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择图书
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setSelectedCopyId('');
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            >
              <option value="">-- 请选择图书 --</option>
              {availableBooks.map(
                (b) =>
                  b && (
                    <option key={b.id} value={b.id}>
                      {b.title} · {b.author}
                    </option>
                  )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择副本
            </label>
            <select
              value={selectedCopyId}
              onChange={(e) => {
                setSelectedCopyId(e.target.value);
                const c = getCopyById(e.target.value);
                if (c) {
                  setRouteLibraries([c.currentLibraryId]);
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
              disabled={!selectedBookId}
            >
              <option value="">-- 请先选择图书 --</option>
              {filteredCopies.map((c) => {
                const lib = getLibraryById(c.currentLibraryId);
                return (
                  <option key={c.id} value={c.id}>
                    {c.barcode} · 当前在 {lib?.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              流转路径（按顺序添加途经馆点）
            </label>
            <div className="bg-gray-50 rounded-lg p-4 mb-3 min-h-[60px]">
              {routeLibraries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">
                  请先选择副本以确定起始馆点
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {routeLibraries.map((libId, idx) => {
                    const lib = getLibraryById(libId);
                    return (
                      <div key={`${libId}-${idx}`} className="flex items-center gap-2">
                        {idx > 0 && <ChevronRight size={16} className="text-gray-400" />}
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            idx === 0
                              ? 'bg-[#d4a853] text-white'
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <MapPin size={14} />
                          {lib?.name}
                          {idx > 0 && (
                            <button
                              onClick={() => handleRemoveLibraryFromRoute(idx)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {activeLibraries.map((lib) => (
                <button
                  key={lib.id}
                  onClick={() => handleAddLibraryToRoute(lib.id)}
                  disabled={!selectedCopyId || routeLibraries.includes(lib.id)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    routeLibraries.includes(lib.id)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : selectedCopyId
                        ? 'bg-white border-gray-200 hover:border-[#d4a853] hover:bg-[#d4a853]/5 text-gray-700'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-1 justify-center">
                    <MapPin size={12} />
                    {lib.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">说明</p>
                <ul className="mt-1 space-y-0.5 text-blue-600">
                  <li>· 系统会根据路径自动生成多段调拨记录</li>
                  <li>· 任意环节取消都会自动回滚整条链条</li>
                  <li>· 只有前一段签收后，下一段才能出库</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setChainModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreateChain}
            disabled={!selectedCopyId || routeLibraries.length < 2}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建流转链
          </button>
        </div>
      </Modal>

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
