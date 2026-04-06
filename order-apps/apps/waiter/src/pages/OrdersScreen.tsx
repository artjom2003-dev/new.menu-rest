import React, { useEffect } from 'react';
import { OrderStatusBadge, OrderTimerBadge } from '@menurest/shared-ui';
import { useOrdersStore } from '../stores/ordersStore';

export function OrdersScreen() {
  const { loadOrders, getActiveOrders, statusFilter, setStatusFilter, markItemServed } = useOrdersStore();

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => { const i = setInterval(() => loadOrders(), 10000); return () => clearInterval(i); }, []);
  const orders = getActiveOrders();

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-20">
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A] px-4 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-white">Заказы</h1>
          <span className="text-[10px] text-[#6C6C80]">{orders.length} активных</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { s: null, label: 'Все' },
            { s: 'pending', label: 'Новые' },
            { s: 'preparing', label: 'Готовится' },
            { s: 'ready', label: 'Готов' },
            { s: 'served', label: 'Подан' },
          ].map(({ s, label }) => (
            <button key={s || 'all'} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                statusFilter === s ? 'bg-[#E8491D] text-white' : 'bg-[#1E2A47] text-[#A0A0B0]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pt-2 space-y-1.5">
        {orders.map((order) => (
          <div key={order.id} className="bg-[#16213E] rounded-xl p-3 border border-[#2A2A4A]">
            {/* Header */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Стол {order.tableNumber || order.tableId}</span>
                <span className="text-[9px] text-[#6C6C80]">{order.source === 'qr' ? '📱' : '👤'} #{order.id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <OrderTimerBadge createdAt={order.createdAt} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            {/* Items — compact */}
            <div className="space-y-0.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-[#1A1A2E]/50">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    item.status === 'ready' ? 'bg-green-400' :
                    item.status === 'preparing' ? 'bg-amber-400' :
                    item.status === 'served' ? 'bg-green-400/30' : 'bg-[#6C6C80]'
                  }`} />
                  <span className={`text-[12px] flex-1 truncate ${
                    item.status === 'served' ? 'text-[#6C6C80] line-through' : 'text-[#EAEAEA]'
                  }`}>{item.dishName}</span>
                  <span className="text-[10px] text-[#6C6C80]">{item.quantity}x</span>
                  {item.status === 'ready' && (
                    <button onClick={() => markItemServed(order.id, item.id)}
                      className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-[10px] font-semibold hover:bg-green-500/25 transition">
                      Подано
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#2A2A4A]/50">
              <span className="text-[11px] text-[#6C6C80]">{order.items.length} поз.</span>
              <span className="text-xs font-bold text-[#E8491D]">{order.totalAmount} ₽</span>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <p className="text-center text-[#6C6C80] text-xs py-12">Нет активных заказов</p>
        )}
      </div>
    </div>
  );
}
