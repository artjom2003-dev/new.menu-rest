import React from 'react';
import { useOrdersStore } from '../stores/ordersStore';

export function StatsScreen() {
  const { orders } = useOrdersStore();
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-20 px-4 pt-6">
      <h1 className="text-lg font-bold text-white mb-6">Статистика смены</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#16213E] rounded-2xl p-4 border border-[#2A2A4A]">
          <p className="text-xs text-[#A0A0B0] mb-1">Заказов</p>
          <p className="text-3xl font-black text-white">{totalOrders}</p>
        </div>
        <div className="bg-[#16213E] rounded-2xl p-4 border border-[#2A2A4A]">
          <p className="text-xs text-[#A0A0B0] mb-1">Выручка</p>
          <p className="text-3xl font-black text-[#E8491D]">{totalRevenue.toLocaleString()} ₽</p>
        </div>
        <div className="bg-[#16213E] rounded-2xl p-4 border border-[#2A2A4A] col-span-2">
          <p className="text-xs text-[#A0A0B0] mb-1">Средний чек</p>
          <p className="text-3xl font-black text-white">{avgCheck.toLocaleString()} ₽</p>
        </div>
      </div>
    </div>
  );
}
