import React from 'react';

export interface CartItem {
  dishId: number;
  name: string;
  price: number;
  quantity: number;
  comment?: string;
}

export interface CartPanelProps {
  items: CartItem[];
  orderComment?: string;
  onUpdateQuantity: (dishId: number, quantity: number) => void;
  onRemove: (dishId: number) => void;
  onItemComment: (dishId: number, comment: string) => void;
  onOrderComment?: (comment: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function CartPanel({
  items, orderComment, onUpdateQuantity, onRemove,
  onItemComment, onOrderComment, onSubmit, loading,
}: CartPanelProps) {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4 opacity-30">🛒</div>
        <p className="text-[#A0A0B0] text-sm">Корзина пуста</p>
        <p className="text-[#6C6C80] text-xs mt-1">Добавьте блюда из меню</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {items.map((item) => (
          <div key={item.dishId} className="bg-[#1E2A47] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-[#EAEAEA] truncate">{item.name}</h4>
                <p className="text-xs text-[#A0A0B0] mt-0.5">{item.price} ₽ × {item.quantity}</p>
              </div>
              <span className="font-bold text-[#E8491D] text-sm ml-3">{item.price * item.quantity} ₽</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => item.quantity > 1 ? onUpdateQuantity(item.dishId, item.quantity - 1) : onRemove(item.dishId)}
                  className="w-7 h-7 rounded-lg bg-[#16213E] text-[#A0A0B0] flex items-center justify-center text-sm hover:text-white transition"
                >
                  {item.quantity > 1 ? '−' : '🗑'}
                </button>
                <span className="text-sm font-medium text-[#EAEAEA] w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.dishId, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-[#16213E] text-[#A0A0B0] flex items-center justify-center text-sm hover:text-white transition"
                >
                  +
                </button>
              </div>
              <input
                type="text"
                placeholder="Комментарий..."
                value={item.comment || ''}
                onChange={(e) => onItemComment(item.dishId, e.target.value)}
                className="text-xs bg-[#16213E] border border-[#2A2A4A] rounded-lg px-2 py-1 text-[#A0A0B0] placeholder-[#6C6C80] w-32 focus:border-[#E8491D] focus:outline-none"
              />
            </div>
          </div>
        ))}

        {onOrderComment && (
          <div className="mt-2">
            <textarea
              placeholder="Комментарий к заказу..."
              value={orderComment || ''}
              onChange={(e) => onOrderComment(e.target.value)}
              className="w-full text-sm bg-[#1E2A47] border border-[#2A2A4A] rounded-xl px-3 py-2 text-[#A0A0B0] placeholder-[#6C6C80] resize-none h-16 focus:border-[#E8491D] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2A2A4A] pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#A0A0B0] text-sm">Итого</span>
          <span className="text-xl font-bold text-[#EAEAEA]">{total} ₽</span>
        </div>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#E8491D] text-white font-bold text-base hover:bg-[#D43D15] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Отправляем...' : 'Отправить заказ'}
        </button>
      </div>
    </div>
  );
}
