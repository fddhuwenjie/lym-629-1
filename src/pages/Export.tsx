import { useState } from 'react';
import { Download, FileText, Calendar, Filter, Clock } from 'lucide-react';
import { useBorrowStore } from '../stores/borrowStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useExportStore } from '../stores/exportStore';
import { downloadCSV } from '../utils/csv';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';
import { Toast } from '../components/Toast';
import { EXPORT_TYPE_LABELS } from '../constants';

export const Export = () => {
  const { borrowRecords } = useBorrowStore();
  const { getCopyById, getBookById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById } = useLibraryStore();
  const { addExportRecord, exportHistory } = useExportStore();

  const [exportType, setExportType] = useState<'borrow_records' | 'overdue' | 'transfer'>('borrow_records');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
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
        { key: 'readerPhone', label: '联系电话' },
        { key: 'borrowDate', label: '借出日期' },
        { key: 'dueDate', label: '应还日期' },
        { key: 'overdueDays', label: '逾期天数' },
        { key: 'fine', label: '罚款金额' },
        { key: 'reminderCount', label: '催还次数' },
        { key: 'currentLocation', label: '当前副本位置' },
      ];

      records = borrowRecords
        .filter((r) => r.status === 'overdue')
        .filter((r) => {
          if (startDate && r.dueDate < startDate) return false;
          if (endDate && r.dueDate > endDate) return false;
          return true;
        })
        .map((r) => {
          const copy = getCopyById(r.copyId);
          const book = copy ? getBookById(copy.bookId) : null;
          const reader = getReaderById(r.readerId);
          const currentLib = copy ? getLibraryById(copy.currentLibraryId) : null;

          return {
            recordId: r.id,
            bookTitle: book?.title || '',
            copyBarcode: copy?.barcode || '',
            readerName: reader?.name || '',
            readerPhone: reader?.phone || '',
            borrowDate: formatDate(r.borrowDate, 'yyyy-MM-dd'),
            dueDate: formatDate(r.dueDate, 'yyyy-MM-dd'),
            overdueDays: getOverdueDays(r.dueDate),
            fine: r.fine.toFixed(2),
            reminderCount: r.reminderCount,
            currentLocation: currentLib?.name || '未知',
          };
        });

      fileName = `逾期记录_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">记录导出</h1>
        <p className="text-gray-500 mt-1">导出借阅、逾期等记录，包含催还次数和副本位置</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                </div>
              </div>

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
                可按日期范围筛选导出数据
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a853]">•</span>
                导出记录将保存到历史记录中
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
                      {EXPORT_TYPE_LABELS[record.type]}
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
