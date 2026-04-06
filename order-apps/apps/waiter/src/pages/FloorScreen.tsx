import React, { useEffect, useState } from 'react';
import { useFloorStore } from '../stores/floorStore';
import { useOrdersStore } from '../stores/ordersStore';
import { useAuthStore } from '../stores/authStore';
import { useWaiterSocket } from '../hooks/useSocket';
import { API_BASE, RESTAURANT_ID, menuApi, ordersApi } from '../lib/api';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
  photoUrl?: string;
}

interface MenuCategory {
  section_title: string;
  items: MenuItem[];
}

interface CartItem {
  dish: MenuItem;
  quantity: number;
  comment?: string;
}

// Table positions from Mango kiosk CSS (original 1414x795 canvas)
const MANGO_TABLES = [
  { number: 99, x: 167, y: 354, w: 209, h: 209 },
  { number: 1, x: 466, y: 53, w: 303, h: 220 },
  { number: 2, x: 787, y: 51, w: 305, h: 221 },
  { number: 3, x: 1141, y: 109, w: 104, h: 164 },
  { number: 4, x: 440, y: 306, w: 224, h: 98 },
  { number: 5, x: 671, y: 306, w: 225, h: 98 },
  { number: 6, x: 899, y: 306, w: 225, h: 98 },
  { number: 7, x: 440, y: 404, w: 161, h: 99 },
  { number: 8, x: 671, y: 404, w: 225, h: 99 },
  { number: 9, x: 899, y: 404, w: 225, h: 99 },
  { number: 10, x: 440, y: 516, w: 224, h: 194 },
  { number: 11, x: 664, y: 515, w: 221, h: 198 },
  { number: 12, x: 903, y: 515, w: 222, h: 197 },
];

const CANVAS_W = 1414;
const CANVAS_H = 795;

export function FloorScreen() {
  const { tables, loadTables } = useFloorStore();
  const { orders, loadOrders, notifications } = useOrdersStore();
  const { staff } = useAuthStore();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeMenuCat, setActiveMenuCat] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');

  useWaiterSocket();

  useEffect(() => { loadTables(); loadOrders(); }, []);
  useEffect(() => {
    const i = setInterval(() => loadOrders(), 10000);
    return () => clearInterval(i);
  }, []);

  const openNewOrder = (tableNum: number) => {
    setSelectedTable(tableNum);
    setShowNewOrder(true);
    setCart([]);
    setMenuSearch('');
    if (menu.length === 0) {
      menuApi.getMenu().then(setMenu).catch(() => {});
    }
  };

  const addToCart = (dish: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.dish.id === dish.id);
      if (existing) return prev.map(c => c.dish.id === dish.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { dish, quantity: 1 }];
    });
  };

  const removeFromCart = (dishId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.dish.id === dishId);
      if (existing && existing.quantity > 1) return prev.map(c => c.dish.id === dishId ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter(c => c.dish.id !== dishId);
    });
  };

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setSubmitting(true);
    try {
      const table = tables.find(t => t.number === selectedTable);
      await ordersApi.create({
        tableId: table?.id || selectedTable,
        items: cart.map(c => ({ dishId: c.dish.id, quantity: c.quantity, comment: c.comment })),
      });
      setShowNewOrder(false);
      setCart([]);
      await loadOrders();
    } catch (err) {
      console.error('Order error:', err);
    }
    setSubmitting(false);
  };

  const cartTotal = cart.reduce((s, c) => s + c.dish.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const getTableOrder = (num: number) => {
    const t = tables.find(t => t.number === num);
    if (!t) return null;
    return orders.find(o => o.tableId === t.id && !['paid', 'cancelled'].includes(o.status)) || null;
  };

  const getStatus = (num: number): 'free' | 'occupied' | 'ready' => {
    const o = getTableOrder(num);
    if (!o) return 'free';
    if (o.items.some((i: any) => i.status === 'ready')) return 'ready';
    return 'occupied';
  };

  const STYLES = {
    free: { border: 'rgba(52,211,153,0.5)', bg: 'rgba(52,211,153,0.08)', text: '#34D399', label: 'Свободен' },
    occupied: { border: 'rgba(96,165,250,0.6)', bg: 'rgba(96,165,250,0.12)', text: '#60A5FA', label: 'Занят' },
    ready: { border: 'rgba(245,158,11,0.7)', bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Готов!' },
  };

  const selectedOrder = selectedTable ? getTableOrder(selectedTable) : null;
  const activeOrders = orders.filter(o => !['paid', 'cancelled'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Зал</h1>
            <p className="text-[11px] text-[#A0A0B0]">{staff?.name} · {activeOrders} заказов</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3">
              {Object.entries(STYLES).map(([k, s]) => (
                <span key={k} className="flex items-center gap-1.5 text-[10px]" style={{ color: s.text }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.text }} />
                  {s.label}
                </span>
              ))}
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
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="px-4 pt-3 space-y-2 flex-shrink-0">
          {notifications.slice(0, 2).map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-base">✅</span>
              <p className="text-xs text-[#EAEAEA] flex-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main: floor plan + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor plan with Mango image */}
        <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
          <div className="relative" style={{ width: '100%', maxWidth: 900, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}>
            {/* Background image */}
            <img src="/floor-plan.png" alt="Схема зала" className="w-full h-full rounded-xl" style={{ display: 'block' }} />

            {/* Interactive table overlays */}
            {MANGO_TABLES.map(t => {
              const status = getStatus(t.number);
              const s = STYLES[status];
              const order = getTableOrder(t.number);
              const isSel = selectedTable === t.number;

              return (
                <button key={t.number}
                  onClick={() => setSelectedTable(t.number === selectedTable ? null : t.number)}
                  className="absolute transition-all hover:brightness-110"
                  style={{
                    left: `${(t.x / CANVAS_W) * 100}%`,
                    top: `${(t.y / CANVAS_H) * 100}%`,
                    width: `${(t.w / CANVAS_W) * 100}%`,
                    height: `${(t.h / CANVAS_H) * 100}%`,
                    background: s.bg,
                    border: `${isSel ? 3 : 2}px solid ${s.border}`,
                    borderRadius: 12,
                  }}
                >
                  {/* Status dot */}
                  {status === 'ready' && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full animate-ping" style={{ background: s.text }} />
                  )}
                  {status === 'ready' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: s.text }} />
                  )}

                  {/* Order info overlay */}
                  {status !== 'free' && order && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">
                        {order.items.length} поз. · {order.totalAmount}₽
                      </span>
                      {status === 'ready' && (
                        <span className="text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full" style={{ background: s.text, color: '#000' }}>
                          ГОТОВ
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: order details */}
        <div className="w-60 flex-shrink-0 border-l border-[#2A2A4A] bg-[#16162A] overflow-y-auto">
          {selectedTable && selectedOrder ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Стол {selectedTable}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ color: STYLES[getStatus(selectedTable)].text, background: STYLES[getStatus(selectedTable)].bg }}>
                  {STYLES[getStatus(selectedTable)].label}
                </span>
              </div>
              <p className="text-[10px] text-[#6C6C80] mb-3">Заказ #{selectedOrder.id}</p>

              <div className="space-y-1.5 mb-4">
                {selectedOrder.items.map((item: any) => {
                  const statusIcon = item.status === 'ready' ? '✅' : item.status === 'preparing' ? '🔥' : item.status === 'served' ? '✓' : '⏳';
                  const statusBg = item.status === 'ready' ? 'bg-yellow-500/10 border-yellow-500/20' :
                    item.status === 'preparing' ? 'bg-blue-500/10 border-blue-500/20' :
                    item.status === 'served' ? 'bg-green-500/10 border-green-500/20 opacity-50' :
                    'bg-[#1E2A47] border-[#2A2A4A]';
                  return (
                    <div key={item.id} className={`p-2 rounded-lg text-xs border ${statusBg}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-white truncate flex-1">{item.dishName}</span>
                        <span className="text-[#A0A0B0] flex-shrink-0 ml-2">{item.unitPrice}₽</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-[#6C6C80]">{item.quantity}x</span>
                        <span className="text-[10px]">{statusIcon}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#2A2A4A]">
                <span className="text-xs text-[#A0A0B0]">Итого</span>
                <span className="text-sm font-bold text-white">{selectedOrder.totalAmount} ₽</span>
              </div>
            </div>
          ) : selectedTable ? (
            <div className="p-4 text-center pt-12">
              <p className="text-3xl font-black text-white mb-1">{selectedTable}</p>
              <p className="text-xs font-medium" style={{ color: STYLES.free.text }}>Свободен</p>
              <button onClick={() => openNewOrder(selectedTable)}
                className="mt-4 w-full px-4 py-2.5 rounded-xl bg-[#E8491D] text-white text-xs font-semibold hover:opacity-90 transition">
                Создать заказ
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <p className="text-[11px] text-[#6C6C80] text-center leading-relaxed">
                Нажмите на стол<br/>для просмотра заказа
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex">
          {/* Menu */}
          <div className="flex-1 bg-[#1A1A2E] flex flex-col">
            <div className="p-4 border-b border-[#2A2A4A] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Новый заказ — Стол {selectedTable}</h2>
                <p className="text-[10px] text-[#6C6C80] mt-0.5">Выберите блюда из меню</p>
              </div>
              <button onClick={() => setShowNewOrder(false)} className="text-[#6C6C80] hover:text-white text-lg">✕</button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <input value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                placeholder="Поиск блюда..."
                className="w-full px-3 py-2 rounded-xl bg-[#16162A] border border-[#2A2A4A] text-xs text-white placeholder-[#6C6C80] focus:outline-none focus:border-[#E8491D]" />
            </div>

            {/* Category tabs */}
            {menu.length > 0 && (
              <div className="px-4 flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {menu.map((cat, i) => (
                  <button key={i} onClick={() => setActiveMenuCat(i)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                      activeMenuCat === i ? 'bg-[#E8491D] text-white' : 'bg-[#1E2A47] text-[#A0A0B0]'
                    }`}>
                    {cat.section_title}
                  </button>
                ))}
              </div>
            )}

            {/* Dishes */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {menu.length === 0 ? (
                <p className="text-center text-[#6C6C80] text-xs py-8">Загрузка меню...</p>
              ) : (
                (menuSearch
                  ? menu.flatMap(c => c.items).filter(d => d.name.toLowerCase().includes(menuSearch.toLowerCase()))
                  : menu[activeMenuCat]?.items || []
                ).map(dish => {
                  const inCart = cart.find(c => c.dish.id === dish.id);
                  return (
                    <div key={dish.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#16162A] border border-[#2A2A4A]">
                      {dish.photoUrl ? (
                        <img src={dish.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#1E2A47] flex items-center justify-center text-base flex-shrink-0">🍽</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{dish.name}</p>
                        <p className="text-[11px] text-[#E8491D] font-semibold">{dish.price} ₽</p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeFromCart(dish.id)}
                            className="w-7 h-7 rounded-lg bg-[#2A2A4A] text-white text-xs flex items-center justify-center hover:bg-red-500/30 transition">−</button>
                          <span className="text-white text-xs font-bold w-4 text-center">{inCart.quantity}</span>
                          <button onClick={() => addToCart(dish)}
                            className="w-7 h-7 rounded-lg bg-[#E8491D] text-white text-xs flex items-center justify-center hover:opacity-80 transition">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(dish)}
                          className="w-7 h-7 rounded-lg bg-[#E8491D] text-white text-xs flex items-center justify-center hover:opacity-80 transition">+</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="w-72 bg-[#16162A] border-l border-[#2A2A4A] flex flex-col">
            <div className="p-4 border-b border-[#2A2A4A]">
              <h3 className="text-sm font-bold text-white">Корзина</h3>
              <p className="text-[10px] text-[#6C6C80]">{cartCount} позиций</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {cart.length === 0 ? (
                <p className="text-center text-[#6C6C80] text-[11px] py-8">Добавьте блюда из меню</p>
              ) : cart.map(c => (
                <div key={c.dish.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#1A1A2E] border border-[#2A2A4A]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white truncate">{c.dish.name}</p>
                    <p className="text-[10px] text-[#A0A0B0]">{c.dish.price} × {c.quantity} = {c.dish.price * c.quantity} ₽</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => removeFromCart(c.dish.id)} className="w-6 h-6 rounded bg-[#2A2A4A] text-white text-[10px] flex items-center justify-center">−</button>
                    <button onClick={() => addToCart(c.dish)} className="w-6 h-6 rounded bg-[#2A2A4A] text-white text-[10px] flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#2A2A4A]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#A0A0B0]">Итого</span>
                <span className="text-lg font-bold text-white">{cartTotal} ₽</span>
              </div>
              <button onClick={submitOrder} disabled={cart.length === 0 || submitting}
                className="w-full py-3 rounded-xl bg-[#E8491D] text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition">
                {submitting ? 'Отправляем...' : 'Отправить на кухню'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
