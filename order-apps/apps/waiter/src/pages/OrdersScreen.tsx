import React, { useEffect } from 'react';
import { OrderStatusBadge, OrderTimerBadge } from '@menurest/shared-ui';
import { useOrdersStore } from '../stores/ordersStore';

export function OrdersScreen() {
  const { loadOrders, getActiveOrders, statusFilter, setStatusFilter, markItemServed } = useOrdersStore();

  useEffect(() => { loadOrders(); }, []);
  const orders = getActiveOrders();

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-20">
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A] px-4 py-3">
        <h1 className="text-lg font-bold text-white mb-3">Мои заказы</h1>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[null, 'confirmed', 'preparing', 'ready', 'served'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                statusFilter === s ? 'bg-[#E8491D] text-white' : 'bg-[#1E2A47] text-[#A0A0B0]'
              }`}
            >
              {s === null ? 'Все' : s === 'confirmed' ? 'Принят' : s === 'preparing' ? 'Готовится' : s === 'ready' ? 'Готов' : 'Подан'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-[#16213E] rounded-2xl p-4 border border-[#2A2A4A]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">#{order.tableNumber}</span>
                <span className="text-[10px] text-[#6C6C80]">{order.source === 'qr' ? '📱 QR' : '👤 Официант'}</span>
              </div>
              <div className="flex items-center gap-2">
                <OrderTimerBadge createdAt={order.createdAt} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <OrderStatusBadge status={item.status} />
                    <span className="text-sm text-[#EAEAEA] truncate">{item.dishName}</span>
                    <span className="text-xs text-[#6C6C80]">×{item.quantity}</span>
                  </div>
                  {item.status === 'ready' && (
                    <button
                      onClick={() => markItemServed(order.id, item.id)}
                      className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/30 transition"
                    >
                      Подано ✓
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2A2A4A]">
              <span className="text-sm font-bold text-[#E8491D]">{order.totalAmount} ₽</span>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <p className="text-center text-[#6C6C80] text-sm py-12">Нет активных заказов</p>
        )}
      </div>
    </div>
  );
}
