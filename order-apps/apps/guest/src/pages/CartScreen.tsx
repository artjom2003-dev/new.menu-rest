import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CartPanel } from '@menurest/shared-ui';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useMenuStore } from '../stores/menuStore';

export function CartScreen() {
  const { slug, tableNumber } = useParams();
  const navigate = useNavigate();
  const { items, orderComment, updateQuantity, removeItem, setItemComment, setOrderComment, clear } = useCartStore();
  const { submitOrder, loading } = useOrderStore();
  const { restaurant } = useMenuStore();

  const handleSubmit = async () => {
    if (!restaurant || !tableNumber) return;
    const order = await submitOrder({
      restaurantId: restaurant.id,
      tableId: Number(tableNumber),
      items: items.map((i) => ({ dishId: i.dishId, quantity: i.quantity, comment: i.comment })),
      comment: orderComment,
    });
    clear();
    navigate(`/${slug}/table/${tableNumber}/order/${order.id}`);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#1E2A47] flex items-center justify-center text-[#A0A0B0]">
          ←
        </button>
        <h1 className="text-lg font-bold text-white">Корзина</h1>
      </div>

      {/* Auth banner */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-[#E8491D]/10 border border-[#E8491D]/20">
        <p className="text-xs text-[#E8491D]">🎁 Войдите и получите <b>10 баллов</b> за заказ</p>
      </div>

      {/* Cart */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <CartPanel
          items={items}
          orderComment={orderComment}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onItemComment={setItemComment}
          onOrderComment={setOrderComment}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
}
