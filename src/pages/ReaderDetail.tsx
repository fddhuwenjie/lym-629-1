import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  BookOpen,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  CreditCard,
} from 'lucide-react';
import { useReaderStore } from '../stores/readerStore';
import { useBorrowStore } from '../stores/borrowStore';
import { useBookStore } from '../stores/bookStore';
import { useLibraryStore } from '../stores/libraryStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';

type TabType = 'borrowing' | 'history' | 'fines';

export const ReaderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReaderById, updateDebt } = useReaderStore();
  const { getActiveBorrowsByReader, getAllBorrowsByReader, renewBook } = useBorrowStore();
  const { getCopyById, getBookById } = useBookStore();
  const { getLibraryById } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<TabType>('borrowing');

  const reader = getReaderById(id || '');

  if (!reader) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">读者不存在</p>
        <Link to="/readers" className="text-[#1e3a5f] hover:underline mt-4 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const activeBorrows = getActiveBorrowsByReader(reader.id);
  const allBorrows = getAllBorrowsByReader(reader.id);
  const overdueCount = activeBorrows.filter((b) => b.status === 'overdue').length;

  const handleRenew = (recordId: string) => {
    renewBook(recordId);
  };

  const handlePayFine = () => {
    if (reader.debt > 0) {
      updateDebt(reader.id, -reader.debt);
    }
  };

  const tabs = [
    { id: 'borrowing', label: '在借图书', count: activeBorrows.length },
    { id: 'history', label: '借阅历史', count: allBorrows.length },
    { id: 'fines', label: '欠费记录', count: reader.debt > 0 ? 1 : 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/readers')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">读者档案</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 bg-[#d4a853]/10 rounded-full flex items-center justify-center">
            <User size={36} className="text-[#d4a853]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{reader.name}</h2>
              {reader.debt > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  有欠费
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-gray-600">{reader.cardNo}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-gray-400" />
                <span className="text-gray-600">{reader.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-600">{reader.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-600">
                  {formatDate(reader.createdAt, 'yyyy-MM-dd')} 注册
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]">{activeBorrows.length}</p>
              <p className="text-xs text-gray-500 mt-1">在借图书</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              <p className="text-xs text-gray-500 mt-1">逾期数量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">¥{reader.debt.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">欠费金额</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{allBorrows.length}</p>
              <p className="text-xs text-gray-500 mt-1">累计借阅</p>
            </div>
          </div>
        </div>

        {reader.debt > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-600" />
                <div>
                  <p className="font-medium text-red-800">存在未缴纳费用</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    当前欠费 ¥{reader.debt.toFixed(2)}，请及时缴纳
                  </p>
                </div>
              </div>
              <button
                onClick={handlePayFine}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                缴费
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[#1e3a5f]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-[#d4a853]/20 text-[#d4a853]'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a853]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'borrowing' && (
            <div className="space-y-3">
              {activeBorrows.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                  暂无在借图书
                </div>
              ) : (
                activeBorrows.map((record) => {
                  const copy = getCopyById(record.copyId);
                  const book = copy ? getBookById(copy.bookId) : null;
                  const library = getLibraryById(record.borrowLibraryId);
                  const overdueDays = getOverdueDays(record.dueDate);

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-white border border-gray-200 rounded flex items-center justify-center">
                          <BookOpen size={24} className="text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{book?.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            副本：{copy?.barcode} · {library?.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>借出：{formatDate(record.borrowDate, 'yyyy-MM-dd')}</span>
                            <span className={overdueDays > 0 ? 'text-red-600' : ''}>
                              应还：{formatDate(record.dueDate, 'yyyy-MM-dd')}
                            </span>
                            <span>已续借 {record.renewTimes} 次</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge type="borrow" status={record.status} />
                        {record.status !== 'lost' && (
                          <button
                            onClick={() => handleRenew(record.id)}
                            disabled={record.renewTimes >= reader.maxRenewTimes}
                            className="px-3 py-1.5 text-xs bg-[#d4a853] text-white rounded hover:bg-[#c49a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            续借
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {allBorrows.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                  暂无借阅历史
                </div>
              ) : (
                allBorrows.map((record) => {
                  const copy = getCopyById(record.copyId);
                  const book = copy ? getBookById(copy.bookId) : null;
                  const library = getLibraryById(record.borrowLibraryId);

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-14 bg-white border border-gray-200 rounded flex items-center justify-center">
                          <BookOpen size={18} className="text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{book?.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {library?.name} · {copy?.barcode}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatDate(record.borrowDate, 'yyyy-MM-dd')}</span>
                            <span>→</span>
                            <span>
                              {record.returnDate
                                ? formatDate(record.returnDate, 'yyyy-MM-dd')
                                : '未归还'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge type="borrow" status={record.status} size="sm" />
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'fines' && (
            <div className="space-y-3">
              {reader.debt <= 0 && allBorrows.filter((b) => b.fine > 0).length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <AlertTriangle size={32} className="mx-auto mb-2 text-gray-300" />
                  暂无欠费记录
                </div>
              ) : (
                <>
                  {reader.debt > 0 && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={20} className="text-red-600" />
                          <div>
                            <p className="font-medium text-red-800">待缴费用</p>
                            <p className="text-sm text-red-600 mt-0.5">
                              逾期罚款，请及时缴纳
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600">
                            ¥{reader.debt.toFixed(2)}
                          </p>
                          <button
                            onClick={handlePayFine}
                            className="mt-2 px-4 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            立即缴费
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">历史罚款记录</h4>
                    <div className="space-y-2">
                      {allBorrows
                        .filter((b) => b.fine > 0)
                        .map((record) => {
                          const copy = getCopyById(record.copyId);
                          const book = copy ? getBookById(copy.bookId) : null;
                          return (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{book?.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  逾期 {getOverdueDays(record.dueDate)} 天 ·
                                  {formatDate(record.borrowDate, 'yyyy-MM-dd')}
                                </p>
                              </div>
                              <span className="font-medium text-orange-600">
                                ¥{record.fine.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
