import { STATUS_LABELS, STATUS_COLORS } from '../constants';

interface StatusBadgeProps {
  type: 'copy' | 'request' | 'transfer' | 'borrow' | 'risk' | 'overdueTier' | 'chain';
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ type, status, size = 'md' }: StatusBadgeProps) => {
  const label = STATUS_LABELS[type]?.[status] || status;
  const colorClass = STATUS_COLORS[type]?.[status] || 'bg-gray-100 text-gray-600';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass}`}
    >
      {label}
    </span>
  );
};
