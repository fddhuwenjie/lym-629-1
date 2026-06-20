export type CopyStatus = 'available' | 'borrowed' | 'transferring' | 'lost' | 'damaged';

export type RequestStatus = 'pending' | 'matched' | 'transferring' | 'arrived' | 'borrowed' | 'completed' | 'cancelled' | 'rejected';

export type TransferStatus = 'pending' | 'in_transit' | 'arrived' | 'cancelled';

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue' | 'renewed' | 'lost';

export type UserRole = 'librarian' | 'reader';

export interface Library {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  cover?: string;
  createdAt: string;
}

export interface Copy {
  id: string;
  bookId: string;
  barcode: string;
  currentLibraryId: string;
  status: CopyStatus;
  createdAt: string;
}

export interface Reader {
  id: string;
  name: string;
  cardNo: string;
  phone: string;
  email: string;
  debt: number;
  maxRenewTimes: number;
  createdAt: string;
}

export interface BorrowRequest {
  id: string;
  readerId: string;
  bookId: string;
  targetLibraryId: string;
  status: RequestStatus;
  matchedCopyId?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  requestId?: string;
  copyId: string;
  fromLibraryId: string;
  toLibraryId: string;
  status: TransferStatus;
  operator: string;
  createdAt: string;
  arrivedAt?: string;
  cancelledAt?: string;
}

export interface TransferRecord {
  id: string;
  transferId?: string;
  copyId: string;
  fromLibraryId?: string;
  toLibraryId: string;
  action: 'transfer_start' | 'transfer_arrive' | 'transfer_cancel' | 'borrow_out' | 'return_in' | 'manual';
  operator: string;
  remark?: string;
  createdAt: string;
}

export interface BorrowRecord {
  id: string;
  readerId: string;
  copyId: string;
  borrowLibraryId: string;
  requestId?: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  returnLibraryId?: string;
  renewTimes: number;
  reminderCount: number;
  status: BorrowStatus;
  fine: number;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  borrowRecordId: string;
  method: 'email' | 'phone' | 'sms';
  operator: string;
  createdAt: string;
}

export interface ExportHistory {
  id: string;
  fileName: string;
  type: 'borrow_records' | 'overdue' | 'transfer';
  recordCount: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}
