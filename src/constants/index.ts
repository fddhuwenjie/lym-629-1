export const BORROW_PERIOD_DAYS = 30;
export const MAX_RENEW_TIMES = 2;
export const RENEW_EXTEND_DAYS = 30;
export const OVERDUE_FINE_PER_DAY = 0.5;

export const STATUS_LABELS = {
  copy: {
    available: '可借',
    borrowed: '已借出',
    transferring: '调拨中',
    lost: '丢失',
    damaged: '损坏',
  },
  request: {
    pending: '待匹配',
    matched: '已匹配',
    transferring: '调拨中',
    arrived: '已到馆',
    borrowed: '已借出',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已驳回',
  },
  transfer: {
    pending: '待出库',
    in_transit: '运输中',
    arrived: '已签收',
    cancelled: '已取消',
  },
  borrow: {
    borrowed: '借阅中',
    returned: '已归还',
    overdue: '已逾期',
    renewed: '已续借',
    lost: '已丢失',
  },
};

export const STATUS_COLORS = {
  copy: {
    available: 'bg-emerald-100 text-emerald-800',
    borrowed: 'bg-amber-100 text-amber-800',
    transferring: 'bg-blue-100 text-blue-800',
    lost: 'bg-red-100 text-red-800',
    damaged: 'bg-orange-100 text-orange-800',
  },
  request: {
    pending: 'bg-gray-100 text-gray-800',
    matched: 'bg-blue-100 text-blue-800',
    transferring: 'bg-indigo-100 text-indigo-800',
    arrived: 'bg-teal-100 text-teal-800',
    borrowed: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-100 text-gray-500',
    rejected: 'bg-red-100 text-red-800',
  },
  transfer: {
    pending: 'bg-gray-100 text-gray-800',
    in_transit: 'bg-blue-100 text-blue-800',
    arrived: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-100 text-gray-500',
  },
  borrow: {
    borrowed: 'bg-amber-100 text-amber-800',
    returned: 'bg-emerald-100 text-emerald-800',
    overdue: 'bg-red-100 text-red-800',
    renewed: 'bg-indigo-100 text-indigo-800',
    lost: 'bg-gray-100 text-gray-500',
  },
};

export const ACTION_LABELS = {
  transfer_start: '调拨出库',
  transfer_arrive: '调拨签收',
  transfer_cancel: '调拨取消',
  borrow_out: '图书借出',
  return_in: '图书归还',
  manual: '人工调整',
};

export const EXPORT_TYPE_LABELS = {
  borrow_records: '借阅记录',
  overdue: '逾期记录',
  transfer: '调拨记录',
};
