'use client';

import { useState, useEffect, useRef } from 'react';
import { companionApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useCompanionNotifications } from '@/components/companion/CompanionNotifications';

interface CompanionUser { id: number; name: string | null; avatarUrl?: string | null; loyaltyLevel?: string }
interface CompanionRecord { id: number; user: CompanionUser; since?: string; createdAt?: string }

const LEVEL_COLORS: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700' };

export function ContactsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isLoggedIn } = useAuthStore();
  const { refreshCount } = useCompanionNotifications();
  const [companions, setCompanions] = useState<CompanionRecord[]>([]);
  const [pending, setPending] = useState<CompanionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<CompanionUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const prevOpen = useRef(false);

  // Load contacts every time panel opens
  useEffect(() => {
    if (open && !prevOpen.current && isLoggedIn) {
      loadAll();
    }
    prevOpen.current = open;
    if (!open) {
      setSearchQ('');
      setSearchResults([]);
      setInvitedIds(new Set());
      setError(null);
    }
  }, [open, isLoggedIn]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        companionApi.getMyCompanions(),
        companionApi.getPending(),
      ]);
      setCompanions(c.data || []);
      setPending(p.data || []);
    } catch (e: any) {
      setError('Не удалось загрузить контакты');
      console.error('ContactsPanel loadAll error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Search with debounce
  useEffect(() => {
    if (!open) return;
    if (searchQ.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      companionApi.search(searchQ)
        .then(r => {
          // Filter out users already in companions or pending
          const existingIds = new Set([
            ...companions.map(c => c.user.id),
            ...pending.map(p => p.user.id),
          ]);
          setSearchResults((r.data || []).filter((u: CompanionUser) => !existingIds.has(u.id)));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, open, companions, pending]);

  const handleInvite = async (userId: number) => {
    try {
      await companionApi.invite(userId);
      setInvitedIds(p => new Set(p).add(userId));
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (msg) alert(msg);
    }
  };

  const handleAccept = async (id: number) => {
    const record = pending.find(r => r.id === id);
    try {
      await companionApi.accept(id);
      setPending(p => p.filter(r => r.id !== id));
      if (record) {
        setCompanions(p => [
          { id: record.id, user: record.user, since: new Date().toISOString() },
          ...p,
        ]);
      }
      refreshCount();
    } catch (e: any) {
      console.error('Accept error:', e);
      // Reload all data as fallback
      loadAll();
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await companionApi.decline(id);
      setPending(p => p.filter(r => r.id !== id));
      refreshCount();
    } catch {}
  };

  const handleRemove = async (id: number) => {
    try {
      await companionApi.remove(id);
      setCompanions(p => p.filter(r => r.id !== id));
    } catch {}
  };

  const startChat = (userId: number) => {
    onClose();
    useChatStore.getState().open({ userId });
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 400, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 80px)', borderRadius: 20, overflow: 'hidden', background: 'var(--bg)', border: '1px solid var(--card-border)', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', animation: 'contactsIn 0.2s ease-out' }}>
        <style>{`@keyframes contactsIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Контакты</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={loadAll} title="Обновить"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--card-border)' }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Найти пользователя по имени..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {error && (
            <div style={{ padding: '10px 14px', margin: '4px 0 8px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button onClick={loadAll} style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Повторить</button>
            </div>
          )}

          {/* Search results */}
          {searchQ.length >= 2 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 6px', marginBottom: 4 }}>Результаты поиска</div>
              {searching ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Поиск...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Никого не найдено</div>
              ) : searchResults.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, marginBottom: 2 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--card-border)' }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>👤</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name || 'Пользователь'}</div>
                    {u.loyaltyLevel && <div style={{ fontSize: 10, color: LEVEL_COLORS[u.loyaltyLevel] || 'var(--text3)', fontWeight: 600 }}>{u.loyaltyLevel}</div>}
                  </div>
                  {invitedIds.has(u.id) ? (
                    <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>Отправлено</span>
                  ) : (
                    <button onClick={() => handleInvite(u.id)}
                      style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Добавить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending invites */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 6px', marginBottom: 4 }}>Входящие заявки ({pending.length})</div>
              {pending.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {r.user.avatarUrl ? <img src={r.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>👤</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.user.name || 'Пользователь'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>хочет добавить вас</div>
                  </div>
                  <button onClick={() => handleAccept(r.id)}
                    style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Принять
                  </button>
                  <button onClick={() => handleDecline(r.id)}
                    style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* My contacts */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 6px', marginBottom: 4 }}>
              Мои контакты {companions.length > 0 && `(${companions.length})`}
            </div>
            {loading ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Загрузка...</div>
            ) : companions.length === 0 && !error ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Пока нет контактов</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Найдите друзей через поиск выше</div>
              </div>
            ) : companions.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, marginBottom: 2, transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--card-border)' }}>
                  {r.user.avatarUrl ? <img src={r.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>👤</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.user.name || 'Пользователь'}</div>
                  {r.user.loyaltyLevel && <div style={{ fontSize: 10, color: LEVEL_COLORS[r.user.loyaltyLevel] || 'var(--text3)', fontWeight: 600, textTransform: 'capitalize' }}>{r.user.loyaltyLevel}</div>}
                </div>
                <button onClick={() => startChat(r.user.id)} title="Написать"
                  style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,92,40,0.1)'; e.currentTarget.style.color = 'var(--accent)'; }}>
                  💬
                </button>
                <button onClick={() => { if (confirm('Удалить из контактов?')) handleRemove(r.id); }} title="Удалить"
                  style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.06)', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
