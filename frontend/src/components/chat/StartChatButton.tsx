'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';

interface StartChatButtonProps {
  userId: number;
  userName: string;
  from?: string;
}

export function StartChatButton({ userId, userName }: StartChatButtonProps) {
  const { isLoggedIn, user } = useAuthStore();
  const openChat = useChatStore(s => s.open);

  if (!isLoggedIn || user?.id === userId) return null;

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openChat({ userId }); }}
      title={`Написать ${userName}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 10,
        border: '1px solid rgba(20,184,166,0.3)',
        background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))',
        color: 'var(--teal)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20,184,166,0.22), rgba(20,184,166,0.1))';
        e.currentTarget.style.borderColor = 'rgba(20,184,166,0.5)';
        e.currentTarget.style.boxShadow = '0 0 12px rgba(20,184,166,0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))';
        e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Написать
    </button>
  );
}
