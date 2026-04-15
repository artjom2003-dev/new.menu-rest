'use client';

import { useState, useEffect } from 'react';
import { chatApi, companionApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface ShareTarget {
  type: 'conversation' | 'companion';
  id: number;
  userId: number;
  name: string;
  avatarUrl?: string | null;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantSlug: string;
}

export function ShareModal({ open, onClose, restaurantName, restaurantSlug }: ShareModalProps) {
  const { isLoggedIn } = useAuthStore();
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    setLoading(true);
    setSentTo(null);
    setCopied(false);

    Promise.all([
      chatApi.getConversations().catch(() => ({ data: [] })),
      companionApi.getMyCompanions().catch(() => ({ data: [] })),
    ]).then(([convRes, compRes]) => {
      const result: ShareTarget[] = [];
      const seenUserIds = new Set<number>();

      // Recent conversations first
      const convs = convRes.data || [];
      for (const c of convs.slice(0, 10)) {
        if (!seenUserIds.has(c.otherUser.id)) {
          seenUserIds.add(c.otherUser.id);
          result.push({
            type: 'conversation',
            id: c.id,
            userId: c.otherUser.id,
            name: c.name || c.otherUser.name || 'Пользователь',
            avatarUrl: c.otherUser.avatarUrl,
          });
        }
      }

      // Then companions not yet in conversations
      const companions = compRes.data || [];
      for (const c of companions) {
        if (!seenUserIds.has(c.user.id)) {
          seenUserIds.add(c.user.id);
          result.push({
            type: 'companion',
            id: 0,
            userId: c.user.id,
            name: c.user.name || 'Пользователь',
            avatarUrl: c.user.avatarUrl,
          });
        }
      }

      setTargets(result);
      setLoading(false);
    });
  }, [open, isLoggedIn]);

  if (!open) return null;

  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/restaurants/${restaurantSlug}`;
  const messageText = `🍽️ Посмотри ресторан: ${restaurantName}\n${url}`;

  const handleSend = async (target: ShareTarget) => {
    try {
      let convId = target.type === 'conversation' ? target.id : 0;

      // If no existing conversation, create one
      if (!convId) {
        const r = await chatApi.createConversation(target.userId);
        convId = r.data?.id || r.data;
      }

      await chatApi.sendMessage(convId, messageText);
      setSentTo(target.userId);
      setTimeout(() => onClose(), 1200);
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: restaurantName, text: `Посмотри ресторан: ${restaurantName}`, url });
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg2)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)', animation: 'shareIn 0.15s ease-out' }}>
        <style>{`@keyframes shareIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Поделиться</h3>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12, fontFamily: 'inherit' }}>✕</button>
        </div>

        {/* Restaurant preview */}
        <div style={{ padding: '10px 16px', background: 'rgba(255,92,40,0.04)', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{restaurantName}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</div>
          </div>
        </div>

        {/* Contacts list */}
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: '6px 8px' }}>
          {!isLoggedIn ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              Войдите, чтобы поделиться в чате
            </div>
          ) : loading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Загрузка...</div>
          ) : targets.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              Пока нет контактов. Добавьте людей в компанию!
            </div>
          ) : targets.map(t => {
            const isSent = sentTo === t.userId;
            return (
              <button key={`${t.type}-${t.userId}`} onClick={() => !isSent && handleSend(t)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: 'none', background: isSent ? 'rgba(20,184,166,0.08)' : 'transparent', cursor: isSent ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', marginBottom: 2 }}
                onMouseEnter={e => { if (!isSent) e.currentTarget.style.background = 'var(--nav-hover)'; }}
                onMouseLeave={e => { if (!isSent) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-border)', flexShrink: 0 }}>
                  {t.avatarUrl ? <img src={t.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 15 }}>👤</span>}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                {isSent ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)' }}>Отправлено!</span>
                ) : (
                  <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    Отправить
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer: copy link + native share */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 6 }}>
          <button onClick={handleCopy}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--card-border)', background: copied ? 'rgba(20,184,166,0.08)' : 'var(--bg3)', color: copied ? 'var(--teal)' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {copied ? 'Скопировано!' : '🔗 Копировать ссылку'}
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button onClick={handleNativeShare}
              style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ещё
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
