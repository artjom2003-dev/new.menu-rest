import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface UseSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { namespace = '/orders', autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    const socket = io(`${SOCKET_URL}${namespace}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => console.log(`[Socket] Connected to ${namespace}`));
    socket.on('disconnect', (reason) => console.log(`[Socket] Disconnected: ${reason}`));
    socket.on('connect_error', (err) => console.warn(`[Socket] Error: ${err.message}`));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [namespace, autoConnect]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const joinRoom = useCallback((room: string, data: Record<string, any>) => {
    socketRef.current?.emit(`join:${room}`, data);
  }, []);

  return { socket: socketRef, emit, on, joinRoom };
}
