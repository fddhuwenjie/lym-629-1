import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, Copy, CopyStatus } from '../types';
import { generateId } from '../utils/id';

interface BookState {
  books: Book[];
  copies: Copy[];
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => void;
  updateBook: (id: string, data: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  addCopy: (copy: Omit<Copy, 'id' | 'createdAt'>) => void;
  updateCopy: (id: string, data: Partial<Copy>) => void;
  updateCopyStatus: (id: string, status: CopyStatus) => void;
  updateCopyLocation: (id: string, libraryId: string) => void;
  deleteCopy: (id: string) => void;
  getBookById: (id: string) => Book | undefined;
  getCopyById: (id: string) => Copy | undefined;
  getCopiesByBook: (bookId: string) => Copy[];
  getCopiesByLibrary: (libraryId: string) => Copy[];
  getAvailableCopies: (bookId: string) => Copy[];
  searchBooks: (keyword: string) => Book[];
}

const initialBooks: Book[] = [
  {
    id: 'book_001',
    isbn: '9787020002207',
    title: '红楼梦',
    author: '曹雪芹',
    category: '古典文学',
    createdAt: new Date('2023-01-10').toISOString(),
  },
  {
    id: 'book_002',
    isbn: '9787020002214',
    title: '三国演义',
    author: '罗贯中',
    category: '古典文学',
    createdAt: new Date('2023-01-12').toISOString(),
  },
  {
    id: 'book_003',
    isbn: '9787560032083',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    category: '历史',
    createdAt: new Date('2023-02-01').toISOString(),
  },
  {
    id: 'book_004',
    isbn: '9787111213826',
    title: '代码大全',
    author: 'Steve McConnell',
    category: '计算机',
    createdAt: new Date('2023-02-15').toISOString(),
  },
  {
    id: 'book_005',
    isbn: '9787111407010',
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    category: '计算机',
    createdAt: new Date('2023-03-01').toISOString(),
  },
  {
    id: 'book_006',
    isbn: '9787544270878',
    title: '活着',
    author: '余华',
    category: '当代文学',
    createdAt: new Date('2023-03-10').toISOString(),
  },
];

const initialCopies: Copy[] = [
  { id: 'copy_001', bookId: 'book_001', barcode: 'LB-001-001', currentLibraryId: 'lib_main', status: 'available', createdAt: new Date('2023-01-10').toISOString() },
  { id: 'copy_002', bookId: 'book_001', barcode: 'LB-001-002', currentLibraryId: 'lib_east', status: 'available', createdAt: new Date('2023-01-11').toISOString() },
  { id: 'copy_003', bookId: 'book_001', barcode: 'LB-001-003', currentLibraryId: 'lib_west', status: 'available', createdAt: new Date('2023-01-12').toISOString() },
  { id: 'copy_004', bookId: 'book_002', barcode: 'LB-002-001', currentLibraryId: 'lib_main', status: 'borrowed', createdAt: new Date('2023-01-13').toISOString() },
  { id: 'copy_005', bookId: 'book_002', barcode: 'LB-002-002', currentLibraryId: 'lib_east', status: 'available', createdAt: new Date('2023-01-14').toISOString() },
  { id: 'copy_006', bookId: 'book_003', barcode: 'LB-003-001', currentLibraryId: 'lib_main', status: 'borrowed', createdAt: new Date('2023-02-02').toISOString() },
  { id: 'copy_007', bookId: 'book_003', barcode: 'LB-003-002', currentLibraryId: 'lib_south', status: 'available', createdAt: new Date('2023-02-03').toISOString() },
  { id: 'copy_008', bookId: 'book_004', barcode: 'LB-004-001', currentLibraryId: 'lib_west', status: 'available', createdAt: new Date('2023-02-16').toISOString() },
  { id: 'copy_009', bookId: 'book_004', barcode: 'LB-004-002', currentLibraryId: 'lib_main', status: 'available', createdAt: new Date('2023-02-17').toISOString() },
  { id: 'copy_010', bookId: 'book_005', barcode: 'LB-005-001', currentLibraryId: 'lib_east', status: 'borrowed', createdAt: new Date('2023-03-02').toISOString() },
  { id: 'copy_011', bookId: 'book_005', barcode: 'LB-005-002', currentLibraryId: 'lib_main', status: 'available', createdAt: new Date('2023-03-03').toISOString() },
  { id: 'copy_012', bookId: 'book_006', barcode: 'LB-006-001', currentLibraryId: 'lib_south', status: 'available', createdAt: new Date('2023-03-11').toISOString() },
  { id: 'copy_013', bookId: 'book_006', barcode: 'LB-006-002', currentLibraryId: 'lib_west', status: 'available', createdAt: new Date('2023-03-12').toISOString() },
  { id: 'copy_014', bookId: 'book_002', barcode: 'LB-002-003', currentLibraryId: 'lib_south', status: 'available', createdAt: new Date('2023-03-13').toISOString() },
  { id: 'copy_015', bookId: 'book_001', barcode: 'LB-001-004', currentLibraryId: 'lib_south', status: 'available', createdAt: new Date('2023-03-14').toISOString() },
];

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: initialBooks,
      copies: initialCopies,
      addBook: (book) => {
        const newBook: Book = {
          ...book,
          id: generateId('book_'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ books: [...state.books, newBook] }));
      },
      updateBook: (id, data) => {
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...data } : b)),
        }));
      },
      deleteBook: (id) => {
        set((state) => ({
          books: state.books.filter((b) => b.id !== id),
          copies: state.copies.filter((c) => c.bookId !== id),
        }));
      },
      addCopy: (copy) => {
        const newCopy: Copy = {
          ...copy,
          id: generateId('copy_'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ copies: [...state.copies, newCopy] }));
      },
      updateCopy: (id, data) => {
        set((state) => ({
          copies: state.copies.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },
      updateCopyStatus: (id, status) => {
        set((state) => ({
          copies: state.copies.map((c) => (c.id === id ? { ...c, status } : c)),
        }));
      },
      updateCopyLocation: (id, libraryId) => {
        set((state) => ({
          copies: state.copies.map((c) =>
            c.id === id ? { ...c, currentLibraryId: libraryId } : c
          ),
        }));
      },
      deleteCopy: (id) => {
        set((state) => ({
          copies: state.copies.filter((c) => c.id !== id),
        }));
      },
      getBookById: (id) => get().books.find((b) => b.id === id),
      getCopyById: (id) => get().copies.find((c) => c.id === id),
      getCopiesByBook: (bookId) => get().copies.filter((c) => c.bookId === bookId),
      getCopiesByLibrary: (libraryId) =>
        get().copies.filter((c) => c.currentLibraryId === libraryId),
      getAvailableCopies: (bookId) =>
        get().copies.filter((c) => c.bookId === bookId && c.status === 'available'),
      searchBooks: (keyword) => {
        const kw = keyword.toLowerCase();
        return get().books.filter(
          (b) =>
            b.title.toLowerCase().includes(kw) ||
            b.author.toLowerCase().includes(kw) ||
            b.isbn.includes(kw)
        );
      },
    }),
    {
      name: 'library-book-storage',
    }
  )
);
