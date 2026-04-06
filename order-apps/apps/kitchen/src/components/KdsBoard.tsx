import { useEffect, useState, useRef } from 'react';
import { OrderItemStatus } from '@menurest/shared-types';
import { useKdsStore } from '../stores/kdsStore';
import type { KdsOrder } from '../stores/kdsStore';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { Header } from './Header';
import { OrderCard } from './OrderCard';

const COLUMNS = [
  { id: 'new', title: 'Новые заказы', color: '#E8491D' },
  { id: 'ready', title: 'Готовы к выдаче', color: '#34D399' },
] as const;

export function KdsBoard() {
  const {
    restaurantId, orders, loading, setConfig, loadOrders,
    addOrder, addItems, updateItemStatus, updateOrderStatus, markAllReady,
  } = useKdsStore();
  const { playBell, playWhoosh } = useSound();
  const socketRef = useSocket(restaurantId);
  const [dragOrder, setDragOrder] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname.replace('/', '');
    const id = parseInt(path, 10);
    setConfig(id && !isNaN(id) ? id : 1);
  }, []);

  useEffect(() => { if (restaurantId) loadOrders(); }, [restaurantId]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!restaurantId) return;
    const i = setInterval(() => loadOrders(), 15000);
    return () => clearInterval(i);
  }, [restaurantId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onCreated = (data: any) => { addOrder(data.order || data); playBell(); };
    const onItemAdded = (data: any) => { addItems(data.orderId, data.items); playBell(); };
    const onStatusChanged = (data: any) => {
      if (data.itemId && data.itemStatus) updateItemStatus(data.orderId, data.itemId, data.itemStatus);
      else updateOrderStatus(data.orderId, data.status);
      if (data.status === 'ready') playWhoosh();
    };
    socket.on('order:created', onCreated);
    socket.on('order:item_added', onItemAdded);
    socket.on('order:status_changed', onStatusChanged);
    return () => { socket.off('order:created', onCreated); socket.off('order:item_added', onItemAdded); socket.off('order:status_changed', onStatusChanged); };
  }, [socketRef.current]);

  const getOrderColumn = (order: KdsOrder): string => {
    const activeItems = order.items.filter(i => i.status !== 'cancelled');
    if (activeItems.length === 0) return 'new';
    const allReady = activeItems.every(i => i.status === OrderItemStatus.READY);
    return allReady ? 'ready' : 'new';
  };

  const columnOrders = (colId: string) =>
    orders.filter(o => getOrderColumn(o) === colId).sort((a, b) => a.receivedAt - b.receivedAt);

  // Drag and drop
  const handleDragStart = (orderId: number) => setDragOrder(orderId);
  const handleDragEnd = () => { setDragOrder(null); setDragOverCol(null); };
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverCol(colId); };
  const handleDrop = async (colId: string) => {
    if (!dragOrder) return;
    const order = orders.find(o => o.id === dragOrder);
    if (!order) return;
    if (colId === 'ready') await markAllReady(order.id);
    setDragOrder(null);
    setDragOverCol(null);
  };

  const moveToReady = async (order: KdsOrder) => {
    await markAllReady(order.id);
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Header orderCount={orders.length} />

      <main className="flex-1 overflow-hidden flex gap-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <div className="text-6xl mb-4 opacity-30">🍽</div>
            <p className="text-xl font-medium">Нет активных заказов</p>
            <p className="text-sm mt-1">Новые заказы появятся автоматически</p>
          </div>
        ) : (
          COLUMNS.map(col => {
            const colOrders = columnOrders(col.id);
            const isDragOver = dragOverCol === col.id;
            return (
              <div key={col.id}
                className={`flex-1 flex flex-col border-r border-border/30 last:border-r-0 transition-colors ${isDragOver ? 'bg-surface/30' : ''}`}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                    <span className="text-sm font-semibold text-text-primary">{col.title}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.color + '20', color: col.color }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colOrders.map(order => (
                    <div key={order.id}
                      draggable
                      onDragStart={() => handleDragStart(order.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing ${dragOrder === order.id ? 'opacity-50' : ''}`}
                    >
                      <OrderCard
                        order={order}
                        showReadyButton={col.id === 'new'}
                        onMarkReady={() => moveToReady(order)}
                      />
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-text-muted text-xs opacity-40">
                      {col.id === 'new' ? 'Ожидаем заказы' : 'Всё отдано'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
