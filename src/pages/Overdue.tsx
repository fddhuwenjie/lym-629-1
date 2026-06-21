import { useState, useMemo } from 'react';
import { AlertTriangle, Phone, Mail, MessageSquare, Clock, User, BookOpen, Shield, ShieldAlert, ShieldCheck, X, ChevronDown, RotateCcw, Library as LibraryIcon, Calendar } from 'lucide-react';
import { useBorrowStore, getOverdueTier } from '../stores/borrowStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { OverdueFilters, RiskLevel, OverdueTier } from '../types';
import { STATUS_LABELS } from '../constants';

export const Overdue = () => {
  const { getFilteredOverdueRecords, getOverdueStats, sendReminder, getReminderRecordsByBorrow } = useBorrowStore();
  const { getCopyById, getBookById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById, getActiveLibraries } = useLibraryStore();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info'>('success');
  const [detailRecord, setDetailRecord] = useState<string | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [reminderMethod, setReminderMethod] = useState<'email' | 'phone' | 'sms'>('email');

  const [selectedRiskLevels, setSelectedRiskLevels] = useState<RiskLevel[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [selectedOverdueTier, setSelectedOverdueTier] = useState<OverdueTier | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);

  const filters: OverdueFilters = useMemo(() => {
    const f: OverdueFilters = {};
    if (selectedRiskLevels.length > 0) f.riskLevels = selectedRiskLevels;
    if (selectedLibraryIds.length > 0) f.libraryIds = selectedLibraryIds;
    if (selectedOverdueTier !== 'all') f.overdueTier = selectedOverdueTier;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    return f;
  }, [selectedRiskLevels, selectedLibraryIds, selectedOverdueTier, startDate, endDate]);

  const overdueRecords = useMemo(() => getFilteredOverdueRecords(filters), [filters, getFilteredOverdueRecords]);
  const allStats = getOverdueStats();

  const currentStats = useMemo(() => {
    const byRisk: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
    const byLibrary: Record<string, number> = {};
    const byTier: Record<OverdueTier, number> = { tier1: 0, tier2: 0, tier3: 0, tier4: 0 };
    let totalFine = 0;

    for (const r of overdueRecords) {
      const reader = getReaderById(r.readerId);
      if (reader) byRisk[reader.riskLevel]++;
      byLibrary[r.borrowLibraryId] = (byLibrary[r.borrowLibraryId] || 0) + 1;
      const tier = getOverdueTier(getOverdueDays(r.dueDate));
      byTier[tier]++;
      totalFine += r.fine;
    }

    return { byRisk, byLibrary, byTier, totalFine };
  }, [overdueRecords, getReaderById]);

  const totalOverdue = overdueRecords.length;
  const totalFine = currentStats.totalFine;
  const avgOverdueDays = totalOverdue > 0
    ? Math.round(overdueRecords.reduce((sum, r) => sum + getOverdueDays(r.dueDate), 0) / totalOverdue)
    : 0;
  const pendingReminders = overdueRecords.filter((r) => r.reminderCount === 0).length;

  const libraries = getActiveLibraries();
  const maxLibraryCount = Math.max(0, ...Object.values(currentStats.byLibrary));

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSendReminder = (recordId: string) => {
    setSelectedRecordId(recordId);
    setReminderModalOpen(true);
  };

  const confirmSendReminder = () => {
    if (!selectedRecordId) return;
    sendReminder(selectedRecordId, reminderMethod);
    showToast('催还通知已发送', 'success');
    setReminderModalOpen(false);
    setSelectedRecordId(null);
  };

  const resetFilters = () => {
    setSelectedRiskLevels([]);
    setSelectedLibraryIds([]);
    setSelectedOverdueTier('all');
    setStartDate('');
    setEndDate('');
  };

  const toggleRiskLevel = (level: RiskLevel) => {
    setSelectedRiskLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleLibrary = (libId: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(libId) ? prev.filter((l) => l !== libId) : [...prev, libId]
    );
  };

  const currentRecord = detailRecord ? overdueRecords.find((r) => r.id === detailRecord) : null;
  const reminderRecords = detailRecord ? getReminderRecordsByBorrow(detailRecord) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">逾期催还</h1>
        <p className="text-gray-500 mt-1">管理逾期图书，发起催还通知</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">逾期总数</p>
              <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均逾期</p>
              <p className="text-2xl font-bold text-gray-900">{avgOverdueDays} 天</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-lg">¥</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">累计罚款</p>
              <p className="text-2xl font-bold text-orange-600">¥{totalFine.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待催还</p>
              <p className="text-2xl font-bold text-gray-900">{pendingReminders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">低风险</p>
              <p className="text-2xl font-bold text-emerald-600">{currentStats.byRisk.low}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">中风险</p>
              <p className="text-2xl font-bold text-amber-600">{currentStats.byRisk.medium}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">高风险</p>
              <p className="text-2xl font-bold text-red-600">{currentStats.byRisk.high}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">全</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">全部总计</p>
              <p className="text-2xl font-bold text-gray-900">{allStats.byRisk.low + allStats.byRisk.medium + allStats.byRisk.high}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <LibraryIcon size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">馆点逾期分布</h3>
          </div>
          <div className="space-y-3">
            {libraries.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无馆点数据</p>
            ) : (
              libraries.map((lib) => {
                const count = currentStats.byLibrary[lib.id] || 0;
                const percent = maxLibraryCount > 0 ? (count / maxLibraryCount) * 100 : 0;
                return (
                  <div key={lib.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate pr-2">{lib.name}</span>
                      <span className="font-medium text-gray-900 flex-shrink-0">{count} 条</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#d4a853] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">逾期天数分段</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['tier1', 'tier2', 'tier3', 'tier4'] as OverdueTier[]).map((tier) => {
              const tierColors: Record<OverdueTier, { bg: string; text: string; bar: string }> = {
                tier1: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-400' },
                tier2: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-400' },
                tier3: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-400' },
                tier4: { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-500' },
              };
              const c = tierColors[tier];
              const count = currentStats.byTier[tier];
              return (
                <div key={tier} className={`rounded-lg p-3 ${c.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${c.text}`}>
                      {STATUS_LABELS.overdueTier[tier]}
                    </span>
                    <span className={`text-lg font-bold ${c.text}`}>{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                      style={{ width: totalOverdue > 0 ? `${(count / totalOverdue) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">风险等级</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => {
                const isActive = selectedRiskLevels.includes(level);
                const activeStyles: Record<RiskLevel, string> = {
                  low: 'bg-emerald-500 text-white border-emerald-500',
                  medium: 'bg-amber-500 text-white border-amber-500',
                  high: 'bg-red-500 text-white border-red-500',
                };
                const inactiveStyles: Record<RiskLevel, string> = {
                  low: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50',
                  medium: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
                  high: 'bg-white text-red-700 border-red-200 hover:bg-red-50',
                };
                return (
                  <button
                    key={level}
                    onClick={() => toggleRiskLevel(level)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      isActive ? activeStyles[level] : inactiveStyles[level]
                    }`}
                  >
                    {STATUS_LABELS.risk[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-gray-600">馆点</label>
            <button
              onClick={() => setLibraryDropdownOpen(!libraryDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 min-w-[160px] justify-between"
            >
              <span className={selectedLibraryIds.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                {selectedLibraryIds.length === 0
                  ? '全部馆点'
                  : `已选 ${selectedLibraryIds.length} 个`}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {libraryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLibraryDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
                  {libraries.map((lib) => {
                    const isActive = selectedLibraryIds.includes(lib.id);
                    return (
                      <button
                        key={lib.id}
                        onClick={() => toggleLibrary(lib.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          isActive ? 'text-[#1e3a5f] bg-[#1e3a5f]/5' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate pr-2">{lib.name}</span>
                        {isActive && <span className="text-[#1e3a5f] font-medium">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">逾期天数</label>
            <select
              value={selectedOverdueTier}
              onChange={(e) => setSelectedOverdueTier(e.target.value as OverdueTier | 'all')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/30"
            >
              <option value="all">全部</option>
              <option value="tier1">1-7天</option>
              <option value="tier2">8-30天</option>
              <option value="tier3">31-60天</option>
              <option value="tier4">60天以上</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">应还日期从</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">应还日期到</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/30"
            />
          </div>

          <div className="flex items-end gap-2 ml-auto">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={14} />
              重置筛选
            </button>
          </div>
        </div>

        {(selectedRiskLevels.length > 0 || selectedLibraryIds.length > 0 || selectedOverdueTier !== 'all' || startDate || endDate) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">当前筛选：</span>
            {selectedRiskLevels.map((level) => (
              <button
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {STATUS_LABELS.risk[level]}
                <X size={12} />
              </button>
            ))}
            {selectedLibraryIds.map((libId) => {
              const lib = getLibraryById(libId);
              return (
                <button
                  key={libId}
                  onClick={() => toggleLibrary(libId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {lib?.name || libId}
                  <X size={12} />
                </button>
              );
            })}
            {selectedOverdueTier !== 'all' && (
              <button
                onClick={() => setSelectedOverdueTier('all')}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {STATUS_LABELS.overdueTier[selectedOverdueTier]}
                <X size={12} />
              </button>
            )}
            {startDate && (
              <button
                onClick={() => setStartDate('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                从 {startDate}
                <X size={12} />
              </button>
            )}
            {endDate && (
              <button
                onClick={() => setEndDate('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                到 {endDate}
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">逾期列表</h2>
            <span className="text-sm text-gray-500">共 {totalOverdue} 条记录</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {overdueRecords.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无逾期记录</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图书信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    读者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    风险等级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借出馆点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借出日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    应还日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    逾期天数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    逾期分段
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    罚款
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    催还次数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueRecords.map((record) => {
                  const copy = getCopyById(record.copyId);
                  const book = copy ? getBookById(copy.bookId) : null;
                  const reader = getReaderById(record.readerId);
                  const library = getLibraryById(record.borrowLibraryId);
                  const overdueDays = getOverdueDays(record.dueDate);
                  const tier = getOverdueTier(overdueDays);

                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                            <BookOpen size={18} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {book?.title}
                            </p>
                            <p className="text-xs text-gray-500">{copy?.barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={14} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{reader?.name}</p>
                            <p className="text-xs text-gray-500">{reader?.cardNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge type="risk" status={reader?.riskLevel || 'low'} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {library?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.borrowDate, 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.dueDate, 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-red-600">
                          {overdueDays} 天
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge type="overdueTier" status={tier} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600">
                          ¥{record.fine.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.reminderCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {record.reminderCount} 次
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetailRecord(record.id)}
                            className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => handleSendReminder(record.id)}
                            className="px-3 py-1.5 text-xs text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                          >
                            催还
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="发送催还通知"
        size="sm"
      >
        <p className="text-gray-600 mb-4">选择催还方式：</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setReminderMethod('email')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'email'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mail size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">邮件</span>
          </button>
          <button
            onClick={() => setReminderMethod('phone')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'phone'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Phone size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">电话</span>
          </button>
          <button
            onClick={() => setReminderMethod('sms')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'sms'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <MessageSquare size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">短信</span>
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setReminderModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmSendReminder}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            发送
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title="逾期详情"
        size="lg"
      >
        {currentRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">图书：</span>
                <span className="font-medium">
                  {getBookById(getCopyById(currentRecord.copyId)?.bookId || '')?.title}
                </span>
              </div>
              <div>
                <span className="text-gray-500">副本：</span>
                <span className="font-medium">
                  {getCopyById(currentRecord.copyId)?.barcode}
                </span>
              </div>
              <div>
                <span className="text-gray-500">读者：</span>
                <span className="font-medium">
                  {getReaderById(currentRecord.readerId)?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">风险等级：</span>
                <StatusBadge type="risk" status={getReaderById(currentRecord.readerId)?.riskLevel || 'low'} size="sm" />
              </div>
              <div>
                <span className="text-gray-500">借出馆点：</span>
                <span className="font-medium">
                  {getLibraryById(currentRecord.borrowLibraryId)?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">逾期分段：</span>
                <StatusBadge type="overdueTier" status={getOverdueTier(getOverdueDays(currentRecord.dueDate))} size="sm" />
              </div>
              <div>
                <span className="text-gray-500">借出日期：</span>
                <span>{formatDate(currentRecord.borrowDate, 'yyyy-MM-dd')}</span>
              </div>
              <div>
                <span className="text-gray-500">应还日期：</span>
                <span>{formatDate(currentRecord.dueDate, 'yyyy-MM-dd')}</span>
              </div>
              <div>
                <span className="text-gray-500">逾期天数：</span>
                <span className="text-red-600 font-medium">
                  {getOverdueDays(currentRecord.dueDate)} 天
                </span>
              </div>
              <div>
                <span className="text-gray-500">累计罚款：</span>
                <span className="text-orange-600 font-medium">
                  ¥{currentRecord.fine.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">续借次数：</span>
                <span>{currentRecord.renewTimes} 次</span>
              </div>
              <div>
                <span className="text-gray-500">催还次数：</span>
                <span>{currentRecord.reminderCount} 次</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">催还记录</h4>
              {reminderRecords.length === 0 ? (
                <p className="text-sm text-gray-400">暂无催还记录</p>
              ) : (
                <div className="space-y-2">
                  {reminderRecords.map((rem) => (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {rem.method === 'email' && <Mail size={14} className="text-blue-500" />}
                        {rem.method === 'phone' && <Phone size={14} className="text-green-500" />}
                        {rem.method === 'sms' && <MessageSquare size={14} className="text-purple-500" />}
                        <span className="text-gray-700">
                          {rem.method === 'email' && '邮件催还'}
                          {rem.method === 'phone' && '电话催还'}
                          {rem.method === 'sms' && '短信催还'}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        <span className="text-xs">操作人：{rem.operator}</span>
                        <span className="mx-2">·</span>
                        <span className="text-xs">{formatDate(rem.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
