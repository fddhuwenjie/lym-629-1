import { BookOpen, Truck, AlertTriangle, Library } from 'lucide-react';
import { useBookStore } from '../stores/bookStore';
import { useBorrowStore } from '../stores/borrowStore';
import { useTransferStore } from '../stores/transferStore';
import { useLibraryStore } from '../stores/libraryStore';
import { formatDate } from '../utils/date';
import { ACTION_LABELS } from '../constants';

export const Dashboard = () => {
  const { copies } = useBookStore();
  const { getActiveBorrowCount, getOverdueCount } = useBorrowStore();
  const { getInTransitCount, transferRecords } = useTransferStore();
  const { libraries } = useLibraryStore();
  const { getLibraryById } = useLibraryStore();

  const totalCopies = copies.length;
  const availableCopies = copies.filter((c) => c.status === 'available').length;
  const inTransitCount = getInTransitCount();
  const overdueCount = getOverdueCount();
  const activeBorrowCount = getActiveBorrowCount();

  const stats = [
    {
      label: '总馆藏量',
      value: totalCopies,
      icon: Library,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: '可借副本',
      value: availableCopies,
      icon: BookOpen,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: '调拨中',
      value: inTransitCount,
      icon: Truck,
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: '逾期数量',
      value: overdueCount,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
  ];

  const libraryStats = libraries.map((lib) => {
    const libCopies = copies.filter((c) => c.currentLibraryId === lib.id);
    const available = libCopies.filter((c) => c.status === 'available').length;
    const borrowed = libCopies.filter((c) => c.status === 'borrowed').length;
    return {
      ...lib,
      total: libCopies.length,
      available,
      borrowed,
      transferring: libCopies.filter((c) => c.status === 'transferring').length,
    };
  });

  const maxTotal = Math.max(...libraryStats.map((l) => l.total), 1);

  const recentRecords = [...transferRecords]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getCopyBarcode = (copyId: string) => {
    const copy = useBookStore.getState().getCopyById(copyId);
    return copy?.barcode || copyId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">馆藏流转看板</h1>
        <p className="text-gray-500 mt-1">实时监控馆藏分布与流转状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 text-[#1e3a5f]">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bg} p-3 rounded-lg`}>
                <stat.icon size={24} className={stat.text} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">馆点库存分布</h2>
          <div className="space-y-5">
            {libraryStats.map((lib, index) => (
              <div
                key={lib.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-800">{lib.name}</span>
                    <span className="text-sm text-gray-500 ml-2">共 {lib.total} 册</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-emerald-600 font-medium">{lib.available}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-amber-600">{lib.borrowed}</span>
                    {lib.transferring > 0 && (
                      <>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-blue-600">{lib.transferring}调拨</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${(lib.available / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">可借</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">借出</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">调拨中</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">流转记录</h2>
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {recentRecords.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">暂无流转记录</p>
              ) : (
                recentRecords.map((record, index) => {
                  const fromLib = record.fromLibraryId
                    ? getLibraryById(record.fromLibraryId)
                    : null;
                  const toLib = getLibraryById(record.toLibraryId);
                  return (
                    <div
                      key={record.id}
                      className="relative pl-8 animate-fade-in"
                      style={{ animationDelay: `${index * 80 + 300}ms` }}
                    >
                      <div
                        className={`absolute left-2.5 top-1.5 w-2 h-2 rounded-full ${
                          record.action === 'borrow_out'
                            ? 'bg-amber-500'
                            : record.action === 'return_in'
                            ? 'bg-emerald-500'
                            : record.action === 'transfer_cancel'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {ACTION_LABELS[record.action]}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getCopyBarcode(record.copyId)}
                        </p>
                        {(fromLib || toLib) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fromLib?.name} → {toLib?.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(record.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">在借数量</p>
              <p className="text-xl font-bold text-gray-900">{activeBorrowCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <Library size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">馆点数量</p>
              <p className="text-xl font-bold text-gray-900">{libraries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日流转</p>
              <p className="text-xl font-bold text-gray-900">
                {
                  transferRecords.filter(
                    (r) =>
                      new Date(r.createdAt).toDateString() === new Date().toDateString()
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
