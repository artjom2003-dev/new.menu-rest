import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderTimerBadge } from '@menurest/shared-ui';
import { useFloorStore } from '../stores/floorStore';
import { useOrdersStore } from '../stores/ordersStore';
import { useAuthStore } from '../stores/authStore';
import { useWaiterSocket } from '../hooks/useSocket';
import type { Table } from '@menurest/shared-types';

const STATUS_COLORS: Record<string, string> = {
  free: '#34D399',
  occupied: '#60A5FA',
  check_requested: '#F59E0B',
};

const ZONE_LABELS: Record<string, string> = {
  hall: 'Зал',
  terrace: 'Терраса',
  vip: 'VIP',
  bar: 'Бар',
};

function TableCard({ table }: { table: Table }) {
  const navigate = useNavigate();
  const { getOrderByTable } = useOrdersStore();
  const order = getOrderByTable(table.id);
  const color = STATUS_COLORS[table.status] || '#6B7280';
  const hasReadyItem = order?.items.some((i) => i.status === 'ready');

  return (
    <button
      onClick={() => navigate(`/table/${table.id}`)}
      className={`relative rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
        hasReadyItem ? 'animate-pulse' : ''
      }`}
      style={{ borderColor: color, background: `${color}08` }}
    >
      {hasReadyItem && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping" />
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-black text-white">{table.number}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}20` }}>
          {ZONE_LABELS[table.zone] || table.zone}
        </span>
      </div>
      {table.status === 'free' ? (
        <p className="text-xs text-[#6C6C80]">Свободен · {table.capacity} мест</p>
      ) : (
        <div className="space-y-1">
          {table.guestCount && <p className="text-xs text-[#A0A0B0]">{table.guestCount} гостей</p>}
          {order && <p className="text-xs font-semibold" style={{ color }}>{order.totalAmount} ₽</p>}
          {table.occupiedSince && <OrderTimerBadge createdAt={table.occupiedSince} />}
        </div>
      )}
    </button>
  );
}

export function FloorScreen() {
  const { tables, activeZone, loading, loadTables, setActiveZone, getFilteredTables } = useFloorStore();
  const { loadOrders, notifications } = useOrdersStore();
  const { staff } = useAuthStore();

  // WebSocket for real-time order updates
  useWaiterSocket();

  useEffect(() => { loadTables(); loadOrders(); }, []);

  const filtered = getFilteredTables();
  const zones = [...new Set(tables.map((t) => t.zone))];

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">Зал</h1>
            <p className="text-[11px] text-[#A0A0B0]">{staff?.name} · {tables.filter((t) => t.status !== 'free').length} занятых</p>
          </div>
          <div className="relative">
            <span className="text-xl">🔔</span>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8491D] text-[9px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
        </div>

        {/* Zone filter */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveZone(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              !activeZone ? 'bg-[#E8491D] text-white' : 'bg-[#1E2A47] text-[#A0A0B0]'
            }`}
          >
            Все
          </button>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setActiveZone(z === activeZone ? null : z)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeZone === z ? 'bg-[#E8491D] text-white' : 'bg-[#1E2A47] text-[#A0A0B0]'
              }`}
            >
              {ZONE_LABELS[z] || z}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {notifications.slice(0, 3).map((n) => (
            <div key={n.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
              n.type === 'ready' ? 'bg-green-500/10 border-green-500/20' :
              n.type === 'check' ? 'bg-yellow-500/10 border-yellow-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <span className="text-lg">{n.type === 'ready' ? '✅' : n.type === 'check' ? '📋' : '📱'}</span>
              <p className="text-xs text-[#EAEAEA] flex-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {filtered.map((t) => <TableCard key={t.id} table={t} />)}
      </div>
    </div>
  );
}
