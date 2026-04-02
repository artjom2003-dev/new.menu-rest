import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useSocket(restaurantId: number | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io(`${WS_URL}/orders`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join:kds', { restaurantId });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [restaurantId]);

  return socketRef;
}
