import { useState } from 'react';
import { BookOpen, ArrowRightLeft, RefreshCcw, Search, User, Book } from 'lucide-react';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useBorrowStore } from '../stores/borrowStore';
import { useLibraryStore } from '../stores/libraryStore';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Toast';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';

type TabType = 'borrow' | 'return' | 'renew';

export const Borrow = () => {
  const [activeTab, setActiveTab] = useState<TabType>('borrow');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [selectedReader, setSelectedReader] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('lib_main');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [returnKeyword, setReturnKeyword] = useState('');
  const [returnLibraryId, setReturnLibraryId] = useState<string>('lib_main');
  const [renewKeyword, setRenewKeyword] = useState('');

  const { copies, getCopyById, getBookById, searchBooks } = useBookStore();
  const { readers, getReaderById, searchReaders } = useReaderStore();
  const { borrowBook, returnBook, renewBook, getActiveBorrowsByReader, getOverdueRecords } =
    useBorrowStore();
  const { getActiveLibraries, getLibraryById } = useLibraryStore();

  const libraries = getActiveLibraries();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleBorrow = () => {
    if (!selectedCopy) {
      showToast('请选择要借出的副本', 'error');
      return;
    }
    if (!selectedReader) {
      showToast('请选择读者', 'error');
      return;
    }

    const result = borrowBook({
      copyId: selectedCopy,
      readerId: selectedReader,
      borrowLibraryId: selectedLibrary,
    });

    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      setSelectedCopy(null);
      setSelectedReader(null);
      setSearchKeyword('');
    }
  };

  const handleReturn = () => {
    if (!returnKeyword.trim()) {
      showToast('请输入副本条码或借阅编号', 'error');
      return;
    }

    const copy = copies.find(
      (c) => c.barcode.toLowerCase() === returnKeyword.toLowerCase().trim()
    );

    if (!copy) {
      showToast('未找到该副本', 'error');
      return;
    }

    const result = returnBook(copy.id, returnLibraryId);
    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      setReturnKeyword('');
    }
  };

  const handleRenew = (borrowRecordId: string) => {
    const result = renewBook(borrowRecordId);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const availableCopies = copies.filter(
    (c) => c.status === 'available' && c.currentLibraryId === selectedLibrary
  );

  const filteredCopies = availableCopies.filter((c) => {
    if (!searchKeyword) return true;
    const book = getBookById(c.bookId);
    return (
      book?.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.barcode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      book?.author.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  });

  const readerSearchResults = searchKeyword ? searchReaders(searchKeyword) : [];

  const overdueRecords = getOverdueRecords();

  const activeBorrowsForRenew = renewKeyword
    ? getActiveBorrowsByReader(renewKeyword).filter(
        (r) => r.status !== 'returned' && r.status !== 'lost'
      )
    : [];

  const tabs = [
    { id: 'borrow', label: '借出登记', icon: BookOpen },
    { id: 'return', label: '归还登记', icon: ArrowRightLeft },
    { id: 'renew', label: '续借办理', icon: RefreshCcw },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">借还管理</h1>
        <p className="text-gray-500 mt-1">图书借出、归还与续借管理</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#1e3a5f] border-b-2 border-[#d4a853] bg-[#d4a853]/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'borrow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    借出馆点
                  </label>
                  <select
                    value={selectedLibrary}
                    onChange={(e) => setSelectedLibrary(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
                  >
                    {libraries.map((lib) => (
                      <option key={lib.id} value={lib.id}>
                        {lib.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    搜索图书或读者
                  </label>
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="输入书名、条码或读者姓名..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    可借副本 ({filteredCopies.length})
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {filteredCopies.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">
                        <Book size={32} className="mx-auto mb-2 text-gray-300" />
                        暂无可用副本
                      </div>
                    ) : (
                      filteredCopies.map((copy) => {
                        const book = getBookById(copy.bookId);
                        const isSelected = selectedCopy === copy.id;
                        return (
                          <div
                            key={copy.id}
                            onClick={() => setSelectedCopy(copy.id)}
                            className={`p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                              isSelected
                                ? 'bg-[#d4a853]/10 border-l-4 border-l-[#d4a853]'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {book?.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {copy.barcode} · {book?.author}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 bg-[#d4a853] rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    选择读者
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {searchKeyword && readerSearchResults.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">
                        <User size={32} className="mx-auto mb-2 text-gray-300" />
                        未找到读者
                      </div>
                    ) : !searchKeyword ? (
                      <div className="py-8 text-center text-gray-400">
                        请输入关键词搜索读者
                      </div>
                    ) : (
                      readerSearchResults.map((reader) => {
                        const isSelected = selectedReader === reader.id;
                        return (
                          <div
                            key={reader.id}
                            onClick={() => setSelectedReader(reader.id)}
                            className={`p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                              isSelected
                                ? 'bg-[#d4a853]/10 border-l-4 border-l-[#d4a853]'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <User size={16} className="text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {reader.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {reader.cardNo}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {reader.debt > 0 && (
                                  <span className="text-xs text-red-600">
                                    欠费 ¥{reader.debt.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 bg-[#d4a853] rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleBorrow}
                  disabled={!selectedCopy || !selectedReader}
                  className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认借出
                </button>
              </div>
            </div>
          )}

          {activeTab === 'return' && (
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  归还馆点
                </label>
                <select
                  value={returnLibraryId}
                  onChange={(e) => setReturnLibraryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
                >
                  {libraries.map((lib) => (
                    <option key={lib.id} value={lib.id}>
                      {lib.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  提示：需归还到借出时的馆点
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  副本条码
                </label>
                <input
                  type="text"
                  placeholder="请输入副本条码..."
                  value={returnKeyword}
                  onChange={(e) => setReturnKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReturn()}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none text-lg"
                />
              </div>

              <button
                onClick={handleReturn}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                确认归还
              </button>

              {overdueRecords.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    逾期提醒 ({overdueRecords.length})
                  </h3>
                  <div className="space-y-2">
                    {overdueRecords.slice(0, 5).map((record) => {
                      const reader = getReaderById(record.readerId);
                      const copy = getCopyById(record.copyId);
                      const book = copy ? getBookById(copy.bookId) : null;
                      return (
                        <div
                          key={record.id}
                          className="p-3 bg-red-50 border border-red-100 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                {book?.title}
                              </p>
                              <p className="text-xs text-red-600 mt-0.5">
                                {reader?.name} · 逾期 {getOverdueDays(record.dueDate)} 天
                              </p>
                            </div>
                            <StatusBadge type="borrow" status="overdue" size="sm" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'renew' && (
            <div className="space-y-6">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  搜索读者
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="输入读者姓名或证号..."
                    value={renewKeyword}
                    onChange={(e) => setRenewKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
                  />
                </div>
              </div>

              {renewKeyword && (
                <div className="space-y-3">
                  {activeBorrowsForRenew.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      该读者暂无在借图书
                    </div>
                  ) : (
                    activeBorrowsForRenew.map((record) => {
                      const copy = getCopyById(record.copyId);
                      const book = copy ? getBookById(copy.bookId) : null;
                      const reader = getReaderById(record.readerId);
                      const library = getLibraryById(record.borrowLibraryId);
                      const overdueDays = getOverdueDays(record.dueDate);
                      const reader_ = getReaderById(record.readerId);
                      const maxRenew = reader_?.maxRenewTimes || 2;

                      return (
                        <div
                          key={record.id}
                          className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-16 bg-white border border-gray-200 rounded flex items-center justify-center">
                              <BookOpen size={24} className="text-gray-300" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {book?.title}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                副本：{copy?.barcode}
                              </p>
                              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                <span>读者：{reader?.name}</span>
                                <span>借出馆：{library?.name}</span>
                                <span>借出时间：{formatDate(record.borrowDate, 'yyyy-MM-dd')}</span>
                                <span
                                  className={overdueDays > 0 ? 'text-red-600' : ''}
                                >
                                  应还日期：
                                  {formatDate(record.dueDate, 'yyyy-MM-dd')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <StatusBadge
                                  type="borrow"
                                  status={record.status}
                                  size="sm"
                                />
                                <span className="text-xs text-gray-500">
                                  已续借 {record.renewTimes}/{maxRenew} 次
                                </span>
                                {overdueDays > 0 && (
                                  <span className="text-xs text-red-600">
                                    逾期 {overdueDays} 天
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRenew(record.id)}
                            disabled={record.renewTimes >= maxRenew}
                            className="px-4 py-2 bg-[#d4a853] text-white rounded-lg hover:bg-[#c49a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            办理续借
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!renewKeyword && (
                <div className="py-8 text-center text-gray-400">
                  请输入读者信息查询在借图书
                </div>
              )}
            </div>
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
