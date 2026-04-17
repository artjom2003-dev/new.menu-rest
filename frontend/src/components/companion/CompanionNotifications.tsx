'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { companionApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CompanionNotificationsContextType {
  pendingCount: number;
  refreshCount: () => void;
}

const CompanionNotificationsContext = createContext<CompanionNotificationsContextType>({
  pendingCount: 0,
  refreshCount: () => {},
});

export const useCompanionNotifications = () => useContext(CompanionNotificationsContext);

export function CompanionNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, accessToken } = useAuthStore();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(() => {
    if (!isLoggedIn) return;
    companionApi.getPendingCount()
      .then(r => setPendingCount(r.data?.count || 0))
      .catch(() => {});
  }, [isLoggedIn]);

  // Load pending count on mount and periodically
  useEffect(() => {
    if (!isLoggedIn) { setPendingCount(0); return; }
    refreshCount();
    const interval = setInterval(refreshCount, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshCount]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!isLoggedIn || !accessToken) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    let socketUrl: string;
    try { socketUrl = new URL(apiBase, window.location.origin).origin; } catch { socketUrl = window.location.origin; }

    const socket: Socket = io(`${socketUrl}/chat`, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      // Use multiplex to share the connection with ChatWidget
      multiplex: true,
    });

    socket.on('companion:request', (data: { user: { name: string } }) => {
      setPendingCount(c => c + 1);
      toast(`${data.user.name || 'Пользователь'} хочет добавить вас в друзья`, 'info');
    });

    socket.on('companion:accepted', (data: { user: { name: string } }) => {
      toast(`${data.user.name || 'Пользователь'} принял(а) вашу заявку в друзья`, 'success');
    });

    return () => { socket.disconnect(); };
  }, [isLoggedIn, accessToken, toast]);

  return (
    <CompanionNotificationsContext.Provider value={{ pendingCount, refreshCount }}>
      {children}
    </CompanionNotificationsContext.Provider>
  );
}
