import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RESTAURANT_ID } from '../lib/api';
import { useOrdersStore } from '../stores/ordersStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useWaiterSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addOrder, updateOrderStatus, loadOrders } = useOrdersStore();

  useEffect(() => {
    const socket = io(`${WS_URL}/orders`, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join:restaurant', { restaurantId: RESTAURANT_ID });
    });

    socket.on('order:created', (data: any) => {
      addOrder(data.order || data);
    });

    socket.on('order:status_changed', (data: any) => {
      updateOrderStatus(data.orderId, data.status);
    });

    socketRef.current = socket;

    // Poll every 15s as backup
    const interval = setInterval(() => loadOrders(), 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  return socketRef;
}
