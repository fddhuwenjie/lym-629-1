import { useState } from 'react';
import { Settings as SettingsIcon, Building2, BookOpen, Plus, Trash2, Edit2, Database, RefreshCw } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { formatDate } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'libraries' | 'books' | 'data';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabType>('libraries');
  const { libraries, addLibrary, updateLibrary, deleteLibrary } = useLibraryStore();
  const { books, copies, addBook, deleteBook, addCopy, deleteCopy } = useBookStore();

  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<string | null>(null);
  const [libraryForm, setLibraryForm] = useState({ name: '', address: '', status: 'active' as 'active' | 'inactive' });

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: '' });

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [copyForm, setCopyForm] = useState({ barcode: '', libraryId: '' });

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'library' | 'book' | 'copy'; id: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAddLibrary = () => {
    setEditingLibrary(null);
    setLibraryForm({ name: '', address: '', status: 'active' });
    setLibraryModalOpen(true);
  };

  const handleEditLibrary = (id: string) => {
    const lib = libraries.find((l) => l.id === id);
    if (lib) {
      setEditingLibrary(id);
      setLibraryForm({ name: lib.name, address: lib.address, status: lib.status as 'active' | 'inactive' });
      setLibraryModalOpen(true);
    }
  };

  const saveLibrary = () => {
    if (!libraryForm.name.trim()) {
      showToast('请输入馆点名称', 'error');
      return;
    }

    if (editingLibrary) {
      updateLibrary(editingLibrary, libraryForm);
      showToast('馆点更新成功', 'success');
    } else {
      addLibrary(libraryForm);
      showToast('馆点添加成功', 'success');
    }

    setLibraryModalOpen(false);
  };

  const handleDeleteLibrary = (id: string) => {
    setConfirmDelete({ type: 'library', id });
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setBookForm({ title: '', author: '', isbn: '', category: '' });
    setBookModalOpen(true);
  };

  const handleEditBook = (id: string) => {
    const book = books.find((b) => b.id === id);
    if (book) {
      setEditingBook(id);
      setBookForm({ title: book.title, author: book.author, isbn: book.isbn, category: book.category });
      setBookModalOpen(true);
    }
  };

  const saveBook = () => {
    if (!bookForm.title.trim()) {
      showToast('请输入书名', 'error');
      return;
    }

    if (editingBook) {
      // updateBook exists in store
      useBookStore.getState().updateBook(editingBook, bookForm);
      showToast('图书更新成功', 'success');
    } else {
      addBook(bookForm);
      showToast('图书添加成功', 'success');
    }

    setBookModalOpen(false);
  };

  const handleDeleteBook = (id: string) => {
    setConfirmDelete({ type: 'book', id });
  };

  const handleAddCopy = (bookId: string) => {
    setSelectedBookId(bookId);
    setCopyForm({ barcode: '', libraryId: libraries[0]?.id || '' });
    setCopyModalOpen(true);
  };

  const saveCopy = () => {
    if (!copyForm.barcode.trim()) {
      showToast('请输入副本条码', 'error');
      return;
    }
    if (!copyForm.libraryId) {
      showToast('请选择所属馆点', 'error');
      return;
    }
    if (!selectedBookId) return;

    addCopy({
      bookId: selectedBookId,
      barcode: copyForm.barcode,
      currentLibraryId: copyForm.libraryId,
      status: 'available',
    });

    showToast('副本添加成功', 'success');
    setCopyModalOpen(false);
  };

  const handleDeleteCopy = (id: string) => {
    setConfirmDelete({ type: 'copy', id });
  };

  const confirmDeleteAction = () => {
    if (!confirmDelete) return;

    switch (confirmDelete.type) {
      case 'library':
        deleteLibrary(confirmDelete.id);
        showToast('馆点已删除', 'success');
        break;
      case 'book':
        deleteBook(confirmDelete.id);
        showToast('图书已删除', 'success');
        break;
      case 'copy':
        deleteCopy(confirmDelete.id);
        showToast('副本已删除', 'success');
        break;
    }
    setConfirmDelete(null);
  };

  const tabs = [
    { id: 'libraries', label: '馆点管理', icon: Building2 },
    { id: 'books', label: '图书管理', icon: BookOpen },
    { id: 'data', label: '数据管理', icon: Database },
  ];

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleResetData = () => {
    const storageKeys = [
      'library-auth-storage',
      'library-book-storage',
      'library-reader-storage',
      'library-request-storage',
      'library-transfer-storage',
      'library-borrow-storage',
      'library-export-storage',
      'library-library-storage',
    ];
    storageKeys.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#d4a853]/10 rounded-lg flex items-center justify-center">
          <SettingsIcon size={24} className="text-[#d4a853]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-500 mt-1">管理馆点、图书等基础数据</p>
        </div>
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
          {activeTab === 'libraries' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={handleAddLibrary}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors text-sm"
                >
                  <Plus size={16} />
                  添加馆点
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        馆点名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        地址
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        馆藏数量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {libraries.map((lib) => {
                      const libCopies = copies.filter((c) => c.currentLibraryId === lib.id);
                      return (
                        <tr key={lib.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-[#d4a853]/10 rounded-lg flex items-center justify-center">
                                <Building2 size={18} className="text-[#d4a853]" />
                              </div>
                              <span className="font-medium text-gray-900">{lib.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {lib.address}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {libCopies.length} 册
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                lib.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {lib.status === 'active' ? '启用' : '停用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(lib.createdAt, 'yyyy-MM-dd')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditLibrary(lib.id)}
                                className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
                                title="编辑"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteLibrary(lib.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'books' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={handleAddBook}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors text-sm"
                >
                  <Plus size={16} />
                  添加图书
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((book) => {
                  const bookCopies = copies.filter((c) => c.bookId === book.id);
                  const availableCopies = bookCopies.filter((c) => c.status === 'available');
                  return (
                    <div
                      key={book.id}
                      className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-16 bg-white border border-gray-200 rounded flex items-center justify-center">
                            <BookOpen size={22} className="text-gray-300" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{book.title}</h4>
                            <p className="text-sm text-gray-500 mt-0.5">{book.author}</p>
                            <p className="text-xs text-gray-400 mt-1">{book.category}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditBook(book.id)}
                            className="p-1 text-gray-400 hover:text-[#1e3a5f] rounded"
                            title="编辑"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-500">
                          <span className="font-medium text-emerald-600">{availableCopies.length}</span>
                          <span className="mx-1">/</span>
                          <span>{bookCopies.length}</span>
                          <span className="text-xs ml-1">册可借</span>
                        </div>
                        <button
                          onClick={() => handleAddCopy(book.id)}
                          className="text-xs text-[#1e3a5f] hover:text-[#d4a853] font-medium"
                        >
                          + 添加副本
                        </button>
                      </div>

                      {bookCopies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-2">副本列表</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {bookCopies.map((copy) => (
                              <div
                                key={copy.id}
                                className="flex items-center justify-between text-xs py-1"
                              >
                                <div className="flex items-center gap-2">
                                  <StatusBadge type="copy" status={copy.status} size="sm" />
                                  <span className="text-gray-600">{copy.barcode}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteCopy(copy.id)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Database size={20} className="text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800">数据管理</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      所有业务数据自动保存到浏览器本地存储（localStorage），重启后可复查。
                      重置数据将清除所有业务数据并恢复为初始演示数据。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">馆点数量</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{libraries.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">图书数量</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{books.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">副本数量</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{copies.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">读者数量</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{useReaderStore.getState().readers.length}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                >
                  <RefreshCw size={18} />
                  重置演示数据
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={libraryModalOpen} onClose={() => setLibraryModalOpen(false)} title={editingLibrary ? '编辑馆点' : '添加馆点'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">馆点名称</label>
            <input
              type="text"
              value={libraryForm.name}
              onChange={(e) => setLibraryForm({ ...libraryForm, name: e.target.value })}
              placeholder="请输入馆点名称"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input
              type="text"
              value={libraryForm.address}
              onChange={(e) => setLibraryForm({ ...libraryForm, address: e.target.value })}
              placeholder="请输入馆点地址"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={libraryForm.status}
              onChange={(e) => setLibraryForm({ ...libraryForm, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setLibraryModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={saveLibrary}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>

      <Modal isOpen={bookModalOpen} onClose={() => setBookModalOpen(false)} title={editingBook ? '编辑图书' : '添加图书'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">书名</label>
            <input
              type="text"
              value={bookForm.title}
              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              placeholder="请输入书名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
            <input
              type="text"
              value={bookForm.author}
              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
              placeholder="请输入作者"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
            <input
              type="text"
              value={bookForm.isbn}
              onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
              placeholder="请输入ISBN"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <input
              type="text"
              value={bookForm.category}
              onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
              placeholder="请输入分类"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setBookModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={saveBook}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>

      <Modal isOpen={copyModalOpen} onClose={() => setCopyModalOpen(false)} title="添加副本" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">副本条码</label>
            <input
              type="text"
              value={copyForm.barcode}
              onChange={(e) => setCopyForm({ ...copyForm, barcode: e.target.value })}
              placeholder="请输入副本条码"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属馆点</label>
            <select
              value={copyForm.libraryId}
              onChange={(e) => setCopyForm({ ...copyForm, libraryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d4a853] focus:border-[#d4a853] outline-none bg-white"
            >
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>
                  {lib.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setCopyModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={saveCopy}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            添加
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="确认删除" size="sm">
        <p className="text-gray-600 mb-6">
          确定要删除吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmDeleteAction}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            确认删除
          </button>
        </div>
      </Modal>

      <Modal isOpen={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="重置演示数据" size="sm">
        <p className="text-gray-600 mb-6">
          确定要重置所有演示数据吗？此操作将清除所有业务数据并恢复为初始状态，不可撤销。
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setResetConfirmOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleResetData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            确认重置
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
