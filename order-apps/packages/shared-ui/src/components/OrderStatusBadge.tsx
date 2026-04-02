import React from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидает', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  confirmed: { label: 'Принят', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  preparing: { label: 'Готовится', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  ready: { label: 'Готов', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  served: { label: 'Подан', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  paid: { label: 'Оплачен', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  cancelled: { label: 'Отменён', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

export interface OrderStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function OrderStatusBadge({ status, size = 'sm' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
