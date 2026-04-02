import { useEffect } from 'react';
import { OrderItemStatus } from '@menurest/shared-types';
import { useKdsStore } from '../stores/kdsStore';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { Header } from './Header';
import { OrderCard } from './OrderCard';

export function KdsBoard() {
  const {
    restaurantId,
    orders,
    loading,
    setConfig,
    loadOrders,
    addOrder,
    addItems,
    updateItemStatus,
    updateOrderStatus,
  } = useKdsStore();
  const { playBell, playWhoosh } = useSound();
  const socketRef = useSocket(restaurantId);

  // Read restaurant ID from URL (e.g., /60325)
  useEffect(() => {
    const path = window.location.pathname.replace('/', '');
    const id = parseInt(path, 10);
    if (id && !isNaN(id)) {
      setConfig(id);
    } else {
      setConfig(1);
    }
  }, []);

  // Load orders on config change
  useEffect(() => {
    if (restaurantId) loadOrders();
  }, [restaurantId]);

  // WebSocket events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleOrderCreated = (data: any) => {
      addOrder(data.order || data);
      playBell();
    };

    const handleItemAdded = (data: any) => {
      addItems(data.orderId, data.items);
      playBell();
    };

    const handleStatusChanged = (data: any) => {
      if (data.itemId && data.itemStatus) {
        updateItemStatus(data.orderId, data.itemId, data.itemStatus);
      } else {
        updateOrderStatus(data.orderId, data.status);
      }
      if (data.status === 'ready') playWhoosh();
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:item_added', handleItemAdded);
    socket.on('order:status_changed', handleStatusChanged);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:item_added', handleItemAdded);
      socket.off('order:status_changed', handleStatusChanged);
    };
  }, [socketRef.current]);

  // Sort: oldest first, but ready ones go to end
  const sortedOrders = [...orders].sort((a, b) => {
    const aAllReady = a.items.filter((i) => i.status !== 'cancelled').every((i) => i.status === OrderItemStatus.READY);
    const bAllReady = b.items.filter((i) => i.status !== 'cancelled').every((i) => i.status === OrderItemStatus.READY);
    if (aAllReady !== bAllReady) return aAllReady ? 1 : -1;
    return a.receivedAt - b.receivedAt;
  });

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Header orderCount={orders.length} />

      <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <div className="text-6xl mb-4 opacity-30">🍽</div>
            <p className="text-xl font-medium">Нет активных заказов</p>
            <p className="text-sm mt-1">Новые заказы появятся автоматически</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-min">
            {sortedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
