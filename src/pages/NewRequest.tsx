import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { useBookStore } from '../stores/bookStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useReaderStore } from '../stores/readerStore';
import { useRequestStore } from '../stores/requestStore';
import { useAuthStore } from '../stores/authStore';
import { Toast } from '../components/Toast';
import { Book } from '../types';

export const NewRequest = () => {
  const navigate = useNavigate();
  const { books, searchBooks } = useBookStore();
  const { getActiveLibraries } = useLibraryStore();
  const { createRequest } = useRequestStore();
  const { currentUser } = useAuthStore();
  const { getReaderById } = useReaderStore();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [targetLibraryId, setTargetLibraryId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const libraries = getActiveLibraries();
  const displayBooks = searchKeyword ? searchBooks(searchKeyword) : books;

  const isLibrarian = currentUser?.role === 'librarian';
  const [readerId, setReaderId] = useState(currentUser?.id || 'rd_001');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      showToast('请选择图书', 'error');
      return;
    }
    if (!targetLibraryId) {
      showToast('请选择目标馆点', 'error');
      return;
    }
    if (!readerId && !isLibrarian) {
      showToast('请选择读者', 'error');
      return;
    }

    const request = createRequest({
      readerId: isLibrarian ? readerId : currentUser?.id || 'rd_001',
      bookId: selectedBook.id,
      targetLibraryId,
    });

    if (request) {
      showToast('申请提交成功！', 'success');
      setTimeout(() => navigate('/requests'), 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建借阅申请</h1>
          <p className="text-gray-500 mt-1">提交图书借阅申请</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isLibrarian && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">读者信息</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择读者 <span className="text-red-500">*</span>
              </label>
              <select
                value={readerId}
                onChange={(e) => setReaderId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
              >
                <option value="">请选择读者</option>
                {useReaderStore.getState().readers.map((reader) => (
                  <option key={reader.id} value={reader.id}>
                    {reader.name} - {reader.cardNo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择图书</h2>
          <div className="mb-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="搜索书名、作者或ISBN..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {displayBooks.length === 0 ? (
              <div className="py-8 text-center text-gray-400">暂无图书</div>
            ) : (
              displayBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedBook?.id === book.id
                      ? 'bg-[#d4a853]/10 border-l-4 border-[#d4a853]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{book.author}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {book.category} · {book.isbn}
                      </p>
                    </div>
                    {selectedBook?.id === book.id && (
                      <div className="w-5 h-5 bg-[#d4a853] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">目标馆点</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {libraries.map((lib) => (
              <button
                key={lib.id}
                type="button"
                onClick={() => setTargetLibraryId(lib.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  targetLibraryId === lib.id
                    ? 'border-[#d4a853] bg-[#d4a853]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{lib.name}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{lib.address}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors shadow-sm"
          >
            提交申请
          </button>
        </div>
      </form>

      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
