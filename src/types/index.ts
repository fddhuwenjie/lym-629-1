export type CopyStatus = 'available' | 'borrowed' | 'transferring' | 'lost' | 'damaged';

export type RequestStatus = 'pending' | 'matched' | 'transferring' | 'arrived' | 'borrowed' | 'completed' | 'cancelled' | 'rejected';

export type TransferStatus = 'pending' | 'in_transit' | 'arrived' | 'cancelled' | 'rolled_back';

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue' | 'renewed' | 'lost';

export type UserRole = 'librarian' | 'reader';

export type RiskLevel = 'low' | 'medium' | 'high';

export type OverdueTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface TransferChain {
  id: string;
  copyId: string;
  requestId?: string;
  transferIds: string[];
  status: 'active' | 'completed' | 'rolled_back';
  createdAt: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

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
  riskLevel: RiskLevel;
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
  chainId?: string;
  prevTransferId?: string;
  nextTransferId?: string;
  copyId: string;
  fromLibraryId: string;
  toLibraryId: string;
  status: TransferStatus;
  operator: string;
  createdAt: string;
  arrivedAt?: string;
  cancelledAt?: string;
  rolledBackAt?: string;
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
  missedRenewCount: number;
  autoRestored: boolean;
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
  type: 'borrow_records' | 'overdue' | 'transfer' | 'overdue_stat' | 'transfer_chain';
  recordCount: number;
  filters?: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface OverdueStatRow {
  readerId: string;
  readerName: string;
  readerCardNo: string;
  riskLevel: RiskLevel;
  libraryId: string;
  libraryName: string;
  overdueDays: number;
  overdueTier: OverdueTier;
  overdueCount: number;
  totalFine: number;
}

export interface OverdueFilters {
  riskLevels?: RiskLevel[];
  libraryIds?: string[];
  overdueTier?: OverdueTier;
  minOverdueDays?: number;
  maxOverdueDays?: number;
  startDate?: string;
  endDate?: string;
}
