'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOpen, open: openChat } = useChatStore();
  const { isLoggedIn, _hydrated } = useAuthStore();
  const opened = useRef(false);

  // Open chat widget on mount
  useEffect(() => {
    if (!_hydrated || !isLoggedIn || opened.current) return;
    opened.current = true;
    const convId = searchParams.get('conv');
    openChat(convId ? { conversationId: Number(convId) } : undefined);
  }, [_hydrated, isLoggedIn, searchParams, openChat]);

  // When chat widget closes, navigate back
  useEffect(() => {
    if (opened.current && !isOpen) {
      router.back();
    }
  }, [isOpen, router]);

  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text3)', fontSize: 14 }}>
        {!_hydrated ? '' : !isLoggedIn ? 'Войдите, чтобы открыть чат' : ''}
      </p>
    </div>
  );
}
