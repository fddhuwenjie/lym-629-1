export const BORROW_PERIOD_DAYS = 30;
export const MAX_RENEW_TIMES = 2;
export const RENEW_EXTEND_DAYS = 30;
export const OVERDUE_FINE_PER_DAY = 0.5;

export const OVERDUE_TIER_THRESHOLDS = {
  tier1: 7,
  tier2: 30,
  tier3: 60,
};

export const RISK_LEVEL_THRESHOLDS = {
  highOverdueCount: 2,
  highDebtAmount: 10,
  mediumOverdueCount: 1,
  mediumDebtAmount: 5,
};

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
    rolled_back: '已回滚',
  },
  risk: {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  },
  overdueTier: {
    tier1: '1-7天',
    tier2: '8-30天',
    tier3: '31-60天',
    tier4: '60天以上',
  },
  chain: {
    active: '流转中',
    completed: '已完成',
    rolled_back: '已回滚',
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
    rolled_back: 'bg-purple-100 text-purple-700',
  },
  risk: {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  },
  overdueTier: {
    tier1: 'bg-yellow-100 text-yellow-700',
    tier2: 'bg-orange-100 text-orange-700',
    tier3: 'bg-red-100 text-red-700',
    tier4: 'bg-red-200 text-red-800',
  },
  chain: {
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    rolled_back: 'bg-purple-100 text-purple-700',
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
  overdue_stat: '逾期分层统计',
  transfer_chain: '调拨流转链',
};
