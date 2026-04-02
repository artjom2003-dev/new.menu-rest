import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderStatusBadge, OrderTimerBadge } from '@menurest/shared-ui';
import { useOrderStore } from '../stores/orderStore';

const STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
const STEP_LABELS = ['Отправлен', 'Принят', 'Готовится', 'Готов', 'Подан'];

export function OrderStatusScreen() {
  const { slug, tableNumber } = useParams();
  const navigate = useNavigate();
  const { activeOrder } = useOrderStore();

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-[#A0A0B0]">Заказ не найден</p>
          <button
            onClick={() => navigate(`/${slug}/table/${tableNumber}`)}
            className="mt-4 px-6 py-2 rounded-xl bg-[#E8491D] text-white text-sm font-semibold"
          >
            К меню
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEPS.indexOf(activeOrder.status);

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-6">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-xl font-bold text-white mb-1">Заказ #{activeOrder.id}</h1>
        <div className="flex items-center justify-center gap-2">
          <OrderStatusBadge status={activeOrder.status} size="md" />
          <OrderTimerBadge createdAt={activeOrder.createdAt} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-[#2A2A4A]" />
          <div
            className="absolute top-3 left-0 h-0.5 bg-[#E8491D] transition-all duration-700"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((step, i) => (
            <div key={step} className="relative flex flex-col items-center z-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= currentStep ? 'bg-[#E8491D] text-white' : 'bg-[#2A2A4A] text-[#6C6C80]'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] mt-1.5 ${i <= currentStep ? 'text-[#EAEAEA]' : 'text-[#6C6C80]'}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Order items */}
      <div className="px-4 space-y-2">
        <h2 className="text-sm font-semibold text-[#A0A0B0] mb-2">Ваш заказ</h2>
        {activeOrder.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-[#16213E] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.dishName}</p>
              <p className="text-xs text-[#6C6C80]">× {item.quantity}</p>
            </div>
            <OrderStatusBadge status={item.status} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => navigate(`/${slug}/table/${tableNumber}`)}
          className="w-full py-3 rounded-xl bg-[#E8491D] text-white font-semibold text-sm hover:bg-[#D43D15] transition"
        >
          🍽️ Дозаказать
        </button>
      </div>
    </div>
  );
}
