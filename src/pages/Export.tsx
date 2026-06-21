import { useState } from 'react';
import { Download, FileText, Calendar, Filter, Clock, BarChart3, GitBranch } from 'lucide-react';
import { useBorrowStore, getOverdueTier } from '../stores/borrowStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTransferStore } from '../stores/transferStore';
import { useExportStore } from '../stores/exportStore';
import { downloadCSV } from '../utils/csv';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';
import { Toast } from '../components/Toast';
import { EXPORT_TYPE_LABELS, STATUS_LABELS } from '../constants';
import type { RiskLevel, OverdueTier, OverdueFilters } from '../types';

type ExportType = 'borrow_records' | 'overdue' | 'overdue_stat' | 'transfer_chain';

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

const OVERDUE_DAY_OPTIONS = [
  { value: 'all', label: '全部', min: undefined, max: undefined },
  { value: '1-7', label: '1-7天', min: 1, max: 7 },
  { value: '8-30', label: '8-30天', min: 8, max: 30 },
  { value: '31-60', label: '31-60天', min: 31, max: 60 },
  { value: '60+', label: '60天以上', min: 61, max: undefined },
];

const OVERDUE_TIER_OPTIONS: { value: OverdueTier | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'tier1', label: '1-7天' },
  { value: 'tier2', label: '8-30天' },
  { value: 'tier3', label: '31-60天' },
  { value: 'tier4', label: '60天以上' },
];

export const Export = () => {
  const { borrowRecords, getFilteredOverdueRecords } = useBorrowStore();
  const { getCopyById, getBookById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById, libraries } = useLibraryStore();
  const { transferChains, getChainTransfers } = useTransferStore();
  const { addExportRecord, exportHistory } = useExportStore();

  const [exportType, setExportType] = useState<ExportType>('borrow_records');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [overdueRiskLevels, setOverdueRiskLevels] = useState<RiskLevel[]>([]);
  const [overdueLibraryId, setOverdueLibraryId] = useState<string>('all');
  const [overdueDayRange, setOverdueDayRange] = useState('all');

  const [statRiskLevels, setStatRiskLevels] = useState<RiskLevel[]>([]);
  const [statLibraryIds, setStatLibraryIds] = useState<string[]>([]);
  const [statOverdueTier, setStatOverdueTier] = useState<OverdueTier | 'all'>('all');

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const toggleRiskLevel = (levels: RiskLevel[], setLevels: (v: RiskLevel[]) => void, level: RiskLevel) => {
    if (levels.includes(level)) {
      setLevels(levels.filter((l) => l !== level));
    } else {
      setLevels([...levels, level]);
    }
  };

  const toggleLibraryId = (id: string) => {
    if (statLibraryIds.includes(id)) {
      setStatLibraryIds(statLibraryIds.filter((l) => l !== id));
    } else {
      setStatLibraryIds([...statLibraryIds, id]);
    }
  };

  const handleExport = () => {
    let records: Record<string, unknown>[] = [];
    let columns: { key: string; label: string }[] = [];
    let fileName = '';

    if (exportType === 'borrow_records') {
      columns = [
        { key: 'recordId', label: '借阅编号' },
        { key: 'bookTitle', label: '图书名称' },
        { key: 'copyBarcode', label: '副本条码' },
        { key: 'readerName', label: '读者姓名' },
        { key: 'readerCardNo', label: '读者证号' },
        { key: 'borrowLibrary', label: '借出馆点' },
        { key: 'borrowDate', label: '借出日期' },
        { key: 'dueDate', label: '应还日期' },
        { key: 'returnDate', label: '归还日期' },
        { key: 'returnLibrary', label: '归还馆点' },
        { key: 'renewTimes', label: '续借次数' },
        { key: 'reminderCount', label: '催还次数' },
        { key: 'status', label: '借阅状态' },
        { key: 'fine', label: '罚款金额' },
        { key: 'currentLocation', label: '当前副本位置' },
      ];

      records = borrowRecords
        .filter((r) => {
          if (startDate && r.borrowDate < startDate) return false;
          if (endDate && r.borrowDate > endDate) return false;
          return true;
        })
        .map((r) => {
          const copy = getCopyById(r.copyId);
          const book = copy ? getBookById(copy.bookId) : null;
          const reader = getReaderById(r.readerId);
          const borrowLib = getLibraryById(r.borrowLibraryId);
          const returnLib = r.returnLibraryId ? getLibraryById(r.returnLibraryId) : null;
          const currentLib = copy ? getLibraryById(copy.currentLibraryId) : null;

          return {
            recordId: r.id,
            bookTitle: book?.title || '',
            copyBarcode: copy?.barcode || '',
            readerName: reader?.name || '',
            readerCardNo: reader?.cardNo || '',
            borrowLibrary: borrowLib?.name || '',
            borrowDate: formatDate(r.borrowDate, 'yyyy-MM-dd'),
            dueDate: formatDate(r.dueDate, 'yyyy-MM-dd'),
            returnDate: r.returnDate ? formatDate(r.returnDate, 'yyyy-MM-dd') : '',
            returnLibrary: returnLib?.name || '',
            renewTimes: r.renewTimes,
            reminderCount: r.reminderCount,
            status: r.status,
            fine: r.fine.toFixed(2),
            currentLocation: currentLib?.name || '未知',
          };
        });

      fileName = `借阅记录_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
    } else if (exportType === 'overdue') {
      columns = [
        { key: 'recordId', label: '记录编号' },
        { key: 'bookTitle', label: '图书名称' },
        { key: 'copyBarcode', label: '副本条码' },
        { key: 'readerName', label: '读者姓名' },
        { key: 'readerCardNo', label: '读者证号' },
        { key: 'readerPhone', label: '联系电话' },
        { key: 'riskLevel', label: '风险等级' },
        { key: 'borrowLibrary', label: '借出馆点' },
        { key: 'borrowDate', label: '借出日期' },
        { key: 'dueDate', label: '应还日期' },
        { key: 'overdueDays', label: '逾期天数' },
        { key: 'overdueTier', label: '逾期分段' },
        { key: 'fine', label: '罚款金额' },
        { key: 'reminderCount', label: '催还次数' },
        { key: 'currentLocation', label: '当前副本位置' },
      ];

      const dayOption = OVERDUE_DAY_OPTIONS.find((o) => o.value === overdueDayRange);
      const filters: OverdueFilters = {
        riskLevels: overdueRiskLevels.length > 0 ? overdueRiskLevels : undefined,
        libraryIds: overdueLibraryId !== 'all' ? [overdueLibraryId] : undefined,
        minOverdueDays: dayOption?.min,
        maxOverdueDays: dayOption?.max,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const filteredRecords = getFilteredOverdueRecords(filters);

      records = filteredRecords.map((r) => {
        const copy = getCopyById(r.copyId);
        const book = copy ? getBookById(copy.bookId) : null;
        const reader = getReaderById(r.readerId);
        const borrowLib = getLibraryById(r.borrowLibraryId);
        const currentLib = copy ? getLibraryById(copy.currentLibraryId) : null;
        const days = getOverdueDays(r.dueDate);
        const tier = getOverdueTier(days);

        return {
          recordId: r.id,
          bookTitle: book?.title || '',
          copyBarcode: copy?.barcode || '',
          readerName: reader?.name || '',
          readerCardNo: reader?.cardNo || '',
          readerPhone: reader?.phone || '',
          riskLevel: reader ? STATUS_LABELS.risk[reader.riskLevel] : '',
          borrowLibrary: borrowLib?.name || '',
          borrowDate: formatDate(r.borrowDate, 'yyyy-MM-dd'),
          dueDate: formatDate(r.dueDate, 'yyyy-MM-dd'),
          overdueDays: days,
          overdueTier: STATUS_LABELS.overdueTier[tier],
          fine: r.fine.toFixed(2),
          reminderCount: r.reminderCount,
          currentLocation: currentLib?.name || '未知',
        };
      });

      fileName = `逾期记录_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
    } else if (exportType === 'overdue_stat') {
      columns = [
        { key: 'readerName', label: '读者姓名' },
        { key: 'readerCardNo', label: '读者证号' },
        { key: 'riskLevel', label: '风险等级' },
        { key: 'borrowLibrary', label: '借出馆点' },
        { key: 'maxOverdueDays', label: '逾期天数' },
        { key: 'overdueTier', label: '逾期分段' },
        { key: 'overdueCount', label: '逾期笔数' },
        { key: 'totalFine', label: '累计罚款' },
      ];

      const filters: OverdueFilters = {
        riskLevels: statRiskLevels.length > 0 ? statRiskLevels : undefined,
        libraryIds: statLibraryIds.length > 0 ? statLibraryIds : undefined,
        overdueTier: statOverdueTier !== 'all' ? statOverdueTier : undefined,
      };

      const filteredRecords = getFilteredOverdueRecords(filters);

      const readerMap = new Map<string, {
        readerId: string;
        readerName: string;
        readerCardNo: string;
        riskLevel: RiskLevel;
        libraryId: string;
        libraryName: string;
        maxOverdueDays: number;
        maxTier: OverdueTier;
        overdueCount: number;
        totalFine: number;
      }>();

      for (const r of filteredRecords) {
        const reader = getReaderById(r.readerId);
        const lib = getLibraryById(r.borrowLibraryId);
        if (!reader) continue;

        const days = getOverdueDays(r.dueDate);
        const tier = getOverdueTier(days);
        const key = r.readerId;

        if (!readerMap.has(key)) {
          readerMap.set(key, {
            readerId: r.readerId,
            readerName: reader.name,
            readerCardNo: reader.cardNo,
            riskLevel: reader.riskLevel,
            libraryId: r.borrowLibraryId,
            libraryName: lib?.name || '',
            maxOverdueDays: days,
            maxTier: tier,
            overdueCount: 1,
            totalFine: r.fine,
          });
        } else {
          const existing = readerMap.get(key)!;
          existing.overdueCount += 1;
          existing.totalFine += r.fine;
          if (days > existing.maxOverdueDays) {
            existing.maxOverdueDays = days;
            existing.maxTier = tier;
          }
        }
      }

      records = Array.from(readerMap.values()).map((item) => ({
        readerName: item.readerName,
        readerCardNo: item.readerCardNo,
        riskLevel: STATUS_LABELS.risk[item.riskLevel],
        borrowLibrary: item.libraryName,
        maxOverdueDays: item.maxOverdueDays,
        overdueTier: STATUS_LABELS.overdueTier[item.maxTier],
        overdueCount: item.overdueCount,
        totalFine: item.totalFine.toFixed(2),
      }));

      fileName = `逾期分层统计_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
    } else if (exportType === 'transfer_chain') {
      columns = [
        { key: 'chainId', label: '链ID' },
        { key: 'bookTitle', label: '图书名称' },
        { key: 'copyBarcode', label: '副本条码' },
        { key: 'segmentCount', label: '段数' },
        { key: 'chainStatus', label: '链状态' },
        { key: 'createdAt', label: '创建时间' },
        { key: 'rolledBackAt', label: '回滚时间' },
        { key: 'rollbackReason', label: '回滚原因' },
        { key: 'segmentIndex', label: '段序号' },
        { key: 'fromLibrary', label: '源馆' },
        { key: 'toLibrary', label: '目标馆' },
        { key: 'transferStatus', label: '段状态' },
        { key: 'outboundTime', label: '出库时间' },
        { key: 'signedTime', label: '签收时间' },
      ];

      records = [];

      for (const chain of transferChains) {
        const copy = getCopyById(chain.copyId);
        const book = copy ? getBookById(copy.bookId) : null;
        const chainTransfers = getChainTransfers(chain.id);

        records.push({
          chainId: chain.id,
          bookTitle: book?.title || '',
          copyBarcode: copy?.barcode || '',
          segmentCount: chainTransfers.length,
          chainStatus: STATUS_LABELS.chain[chain.status],
          createdAt: formatDate(chain.createdAt, 'yyyy-MM-dd HH:mm:ss'),
          rolledBackAt: chain.rolledBackAt ? formatDate(chain.rolledBackAt, 'yyyy-MM-dd HH:mm:ss') : '',
          rollbackReason: chain.rollbackReason || '',
          segmentIndex: '',
          fromLibrary: '',
          toLibrary: '',
          transferStatus: '',
          outboundTime: '',
          signedTime: '',
        });

        chainTransfers.forEach((transfer, idx) => {
          const fromLib = getLibraryById(transfer.fromLibraryId);
          const toLib = getLibraryById(transfer.toLibraryId);

          records.push({
            chainId: '',
            bookTitle: '',
            copyBarcode: '',
            segmentCount: '',
            chainStatus: '',
            createdAt: '',
            rolledBackAt: '',
            rollbackReason: '',
            segmentIndex: idx + 1,
            fromLibrary: fromLib?.name || '',
            toLibrary: toLib?.name || '',
            transferStatus: STATUS_LABELS.transfer[transfer.status],
            outboundTime: transfer.createdAt ? formatDate(transfer.createdAt, 'yyyy-MM-dd HH:mm:ss') : '',
            signedTime: transfer.arrivedAt ? formatDate(transfer.arrivedAt, 'yyyy-MM-dd HH:mm:ss') : '',
          });
        });
      }

      fileName = `调拨流转链_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
    }

    if (records.length === 0) {
      showToast('没有符合条件的记录可导出', 'error');
      return;
    }

    downloadCSV(records, columns, fileName);

    addExportRecord({
      fileName,
      type: exportType,
      recordCount: records.length,
    });

    showToast(`成功导出 ${records.length} 条记录`, 'success');
  };

  const renderDateFilter = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          开始日期
        </label>
        <div className="relative">
          <Calendar
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          结束日期
        </label>
        <div className="relative">
          <Calendar
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderRiskLevelFilter = (
    levels: RiskLevel[],
    setLevels: (v: RiskLevel[]) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        风险等级（可多选）
      </label>
      <div className="flex flex-wrap gap-2">
        {RISK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleRiskLevel(levels, setLevels, opt.value)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              levels.includes(opt.value)
                ? 'border-[#d4a853] bg-[#d4a853]/10 text-[#d4a853]'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderOverdueAdvancedFilters = () => (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Filter size={16} className="text-[#d4a853]" />
        高级筛选条件
      </div>
      {renderRiskLevelFilter(overdueRiskLevels, setOverdueRiskLevels)}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          借出馆点
        </label>
        <select
          value={overdueLibraryId}
          onChange={(e) => setOverdueLibraryId(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
        >
          <option value="all">全部馆点</option>
          {libraries.map((lib) => (
            <option key={lib.id} value={lib.id}>
              {lib.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          逾期天数
        </label>
        <select
          value={overdueDayRange}
          onChange={(e) => setOverdueDayRange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
        >
          {OVERDUE_DAY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStatFilters = () => (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Filter size={16} className="text-[#d4a853]" />
        统计筛选条件
      </div>
      {renderRiskLevelFilter(statRiskLevels, setStatRiskLevels)}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          馆点（可多选）
        </label>
        <div className="flex flex-wrap gap-2">
          {libraries.map((lib) => (
            <button
              key={lib.id}
              onClick={() => toggleLibraryId(lib.id)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                statLibraryIds.includes(lib.id)
                  ? 'border-[#d4a853] bg-[#d4a853]/10 text-[#d4a853]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {lib.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          逾期分段
        </label>
        <select
          value={statOverdueTier}
          onChange={(e) => setStatOverdueTier(e.target.value as OverdueTier | 'all')}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
        >
          {OVERDUE_TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">记录导出</h1>
        <p className="text-gray-500 mt-1">导出借阅、逾期、调拨等记录，包含催还次数和副本位置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">导出设置</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导出类型
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setExportType('borrow_records')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      exportType === 'borrow_records'
                        ? 'border-[#d4a853] bg-[#d4a853]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText
                      size={24}
                      className={exportType === 'borrow_records' ? 'text-[#d4a853]' : 'text-gray-400'}
                    />
                    <p className="font-medium text-gray-900 mt-2">借阅记录</p>
                    <p className="text-xs text-gray-500 mt-1">全部借阅历史</p>
                  </button>
                  <button
                    onClick={() => setExportType('overdue')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      exportType === 'overdue'
                        ? 'border-[#d4a853] bg-[#d4a853]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock
                      size={24}
                      className={exportType === 'overdue' ? 'text-[#d4a853]' : 'text-gray-400'}
                    />
                    <p className="font-medium text-gray-900 mt-2">逾期记录</p>
                    <p className="text-xs text-gray-500 mt-1">逾期未还图书</p>
                  </button>
                  <button
                    onClick={() => setExportType('overdue_stat')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      exportType === 'overdue_stat'
                        ? 'border-[#d4a853] bg-[#d4a853]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <BarChart3
                      size={24}
                      className={exportType === 'overdue_stat' ? 'text-[#d4a853]' : 'text-gray-400'}
                    />
                    <p className="font-medium text-gray-900 mt-2">逾期分层统计</p>
                    <p className="text-xs text-gray-500 mt-1">按读者维度汇总</p>
                  </button>
                  <button
                    onClick={() => setExportType('transfer_chain')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      exportType === 'transfer_chain'
                        ? 'border-[#d4a853] bg-[#d4a853]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <GitBranch
                      size={24}
                      className={exportType === 'transfer_chain' ? 'text-[#d4a853]' : 'text-gray-400'}
                    />
                    <p className="font-medium text-gray-900 mt-2">调拨流转链</p>
                    <p className="text-xs text-gray-500 mt-1">完整链条与分段</p>
                  </button>
                </div>
              </div>

              {exportType === 'borrow_records' && renderDateFilter()}
              {exportType === 'overdue' && (
                <div className="space-y-4">
                  {renderDateFilter()}
                  {renderOverdueAdvancedFilters()}
                </div>
              )}
              {exportType === 'overdue_stat' && renderStatFilters()}
              {exportType === 'transfer_chain' && (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p className="flex items-start gap-2">
                    <span className="text-[#d4a853]">•</span>
                    调拨流转链导出无需筛选条件，将导出所有流转链及其分段详情。
                  </p>
                  <p className="flex items-start gap-2 mt-2">
                    <span className="text-[#d4a853]">•</span>
                    每个链条先输出汇总行，再输出各段详情行。
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors shadow-sm"
                >
                  <Download size={18} />
                  导出 CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">导出说明</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                导出文件为 CSV 格式，可用 Excel 打开
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                包含催还次数、当前副本位置等完整信息
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                可按日期范围、风险等级等条件筛选
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                导出记录将保存到历史记录中
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                逾期分层统计按读者维度汇总统计
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                调拨流转链包含汇总行与分段详情
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">统计信息</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">总借阅记录</span>
                <span className="font-medium text-gray-900">{borrowRecords.length} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">逾期记录</span>
                <span className="font-medium text-red-600">
                  {borrowRecords.filter((r) => r.status === 'overdue').length} 条
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">已归还</span>
                <span className="font-medium text-emerald-600">
                  {borrowRecords.filter((r) => r.status === 'returned').length} 条
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">调拨流转链</span>
                <span className="font-medium text-blue-600">
                  {transferChains.length} 条
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">导出历史</span>
                <span className="font-medium text-gray-900">{exportHistory.length} 次</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">导出历史</h2>
        </div>
        <div className="overflow-x-auto">
          {exportHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Download size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无导出记录</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    记录数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    导出时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exportHistory.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#d4a853]" />
                        <span className="text-sm font-medium text-gray-900">
                          {record.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {EXPORT_TYPE_LABELS[record.type as keyof typeof EXPORT_TYPE_LABELS] || record.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.recordCount} 条
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
