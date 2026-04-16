'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { chatApi, companionApi, restaurantApi, pickSessionApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PickSessionPanel, parsePickSessionMsg, PickSessionInvite } from './PickSession';

interface CompanionUser { id: number; name: string | null; avatarUrl?: string | null; loyaltyLevel?: string }
interface CompanionRecord { id: number; user: CompanionUser; since?: string; createdAt?: string }

interface Conversation {
  id: number;
  otherUser: { id: number; name: string; avatarUrl?: string };
  lastMessage?: { text: string; createdAt: string; senderId: number };
  unreadCount: number;
  name?: string | null;
  createdById?: number | null;
}
interface Message {
  id: number; text: string; senderId: number; conversationId: number; createdAt: string; read: boolean;
}

function fmtTime(d: string) { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }

function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n) + '...' : s; }

const RESTAURANT_RE = /^\[restaurant:([^:]+):(.+)\]$/;

function parseRestaurantMsg(text: string): { slug: string; name: string } | null {
  const m = text.match(RESTAURANT_RE);
  return m ? { slug: m[1], name: m[2] } : null;
}

function RestaurantBubble({ slug, name, mine }: { slug: string; name: string; mine: boolean }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState('');
  const [bill, setBill] = useState('');

  useEffect(() => {
    restaurantApi.getBySlug(slug).then(res => {
      const r = res.data;
      const cover = r?.photos?.find((p: { isCover: boolean }) => p.isCover) || r?.photos?.[0];
      if (cover?.url) setPhoto(cover.url);
      if (r?.cuisines?.length) setCuisine(r.cuisines.map((c: { name: string }) => c.name).join(', '));
      if (r?.averageBill) setBill(`~${Number(r.averageBill).toLocaleString('ru-RU')} ₽`);
    }).catch(() => {});
  }, [slug]);

  return (
    <Link href={`/restaurants/${slug}`} onClick={e => e.stopPropagation()} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ width: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{ height: 120, background: 'var(--bg3)', position: 'relative', overflow: 'hidden' }}>
          {photo ? (
            <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), #ff8c42)', fontSize: 36 }}>🍽️</div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: mine ? 'var(--text)' : 'var(--text)', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          {cuisine && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cuisine}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            {bill && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{bill}</span>}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>Открыть →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ChatWidget() {
  const t = useTranslations('chat');
  const { isOpen, conversationId: initConvId, targetUserId, close } = useChatStore();
  const { user, isLoggedIn, accessToken } = useAuthStore();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pickSessionOpen, setPickSessionOpen] = useState(false);
  const [pickJoinId, setPickJoinId] = useState<number | undefined>(undefined);
  const [activePickId, setActivePickId] = useState<number | null>(null);
  const [typing, setTyping] = useState<string | null>(null);

  // Companion tab
  const [leftTab, setLeftTab] = useState<'chats' | 'companions'>('chats');
  const [companions, setCompanions] = useState<CompanionRecord[]>([]);
  const [pending, setPending] = useState<CompanionRecord[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<CompanionUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Rename conversation
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConv = convs.find(c => c.id === activeId);

  const scrollBottom = () => { const c = containerRef.current; if (c) c.scrollTop = c.scrollHeight; };

  function fmtDate(d: string) {
    const dt = new Date(d), now = new Date(), y = new Date(now);
    y.setDate(y.getDate() - 1);
    if (dt.toDateString() === now.toDateString()) return t('today');
    if (dt.toDateString() === y.toDateString()) return t('yesterday');
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }

  const QUICK = [
    { emoji: '🍽️', label: t('quickLetsGo') },
    { emoji: '👋', label: t('quickHello') },
    { emoji: '📍', label: t('quickKnowPlaces') },
    { emoji: '⭐', label: t('quickRecommend') },
  ];

  // Load companions when tab switches
  useEffect(() => {
    if (!isOpen || !isLoggedIn || leftTab !== 'companions') return;
    setCompLoading(true);
    Promise.all([companionApi.getMyCompanions(), companionApi.getPending()])
      .then(([c, p]) => { setCompanions(c.data || []); setPending(p.data || []); })
      .catch(() => {})
      .finally(() => setCompLoading(false));
  }, [isOpen, isLoggedIn, leftTab]);

  // Search users debounce
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      companionApi.search(searchQ)
        .then(r => setSearchResults(r.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleInvite = async (targetId: number) => {
    try {
      await companionApi.invite(targetId);
      setSearchQ('');
      setSearchResults([]);
      // Reload pending sent
    } catch {}
  };

  const handleAccept = async (id: number) => {
    try {
      await companionApi.accept(id);
      setPending(p => p.filter(r => r.id !== id));
      companionApi.getMyCompanions().then(r => setCompanions(r.data || [])).catch(() => {});
    } catch {}
  };

  const handleDecline = async (id: number) => {
    try {
      await companionApi.decline(id);
      setPending(p => p.filter(r => r.id !== id));
    } catch {}
  };

  const handleRemoveCompanion = async (id: number) => {
    try {
      await companionApi.remove(id);
      setCompanions(c => c.filter(r => r.id !== id));
    } catch {}
  };

  const startChatWith = async (userId: number) => {
    try {
      const r = await chatApi.createConversation(userId);
      const id = r.data?.id || r.data?.conversationId || r.data;
      setActiveId(id);
      setLeftTab('chats');
      chatApi.getConversations().then(r2 => setConvs(r2.data || [])).catch(() => {});
    } catch {}
  };

  const handleRename = async (convId: number) => {
    try {
      await chatApi.renameConversation(convId, renameValue);
      setConvs(p => p.map(c => c.id === convId ? { ...c, name: renameValue.trim() || null } : c));
    } catch {}
    setRenamingId(null);
    setRenameValue('');
  };

  // Load conversations when opened
  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;
    setLoading(true);
    chatApi.getConversations()
      .then(r => { setConvs(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen, isLoggedIn]);

  // Set initial conversation from store
  useEffect(() => {
    if (!isOpen) return;
    if (initConvId) {
      setActiveId(initConvId);
    } else if (targetUserId && isLoggedIn) {
      chatApi.createConversation(targetUserId)
        .then(r => {
          const id = r.data?.id || r.data?.conversationId || r.data;
          setActiveId(id);
          // Reload conversations to include new one
          chatApi.getConversations().then(r2 => setConvs(r2.data || [])).catch(() => {});
        })
        .catch(() => {});
    }
  }, [isOpen, initConvId, targetUserId, isLoggedIn]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setActiveId(null);
      setMsgs([]);
      setInput('');
    }
  }, [isOpen]);

  // Load messages
  useEffect(() => {
    if (!activeId) return;
    setMsgsLoading(true);
    setPage(1);
    chatApi.getMessages(activeId, 1)
      .then(r => {
        const d = r.data;
        const m = Array.isArray(d) ? d : d.items || d.messages || d.data || [];
        setMsgs(m);
        const meta = d.meta;
        setHasMore(meta ? meta.page < meta.pages : m.length >= 20);
        setMsgsLoading(false);
        setTimeout(scrollBottom, 100);
      })
      .catch(() => setMsgsLoading(false));
    chatApi.markRead(activeId).catch(() => {});
    setConvs(p => p.map(c => c.id === activeId ? { ...c, unreadCount: 0 } : c));
    // Check for active pick session
    pickSessionApi.getActive(activeId).then(r => {
      setActivePickId(r.data?.id || null);
    }).catch(() => setActivePickId(null));
  }, [activeId]);

  const loadMore = useCallback(() => {
    if (!activeId || msgsLoading) return;
    const np = page + 1;
    setMsgsLoading(true);
    chatApi.getMessages(activeId, np).then(r => {
      const d = r.data;
      const m = Array.isArray(d) ? d : d.items || d.messages || d.data || [];
      setMsgs(p => [...m, ...p]);
      const meta = d.meta;
      setHasMore(meta ? meta.page < meta.pages : m.length >= 20);
      setPage(np);
      setMsgsLoading(false);
    }).catch(() => setMsgsLoading(false));
  }, [activeId, page, msgsLoading]);

  // Socket
  useEffect(() => {
    if (!isOpen || !isLoggedIn || !accessToken) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    let socketUrl: string;
    try { socketUrl = new URL(apiBase, window.location.origin).origin; } catch { socketUrl = window.location.origin; }
    const socket = io(`${socketUrl}/chat`, { path: '/socket.io', auth: { token: accessToken }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 2000 });
    socketRef.current = socket;
    socket.on('newMessage', (msg: Message) => {
      setMsgs(p => { if (p.length > 0 && p[0]?.conversationId === msg.conversationId) { if (p.find(m => m.id === msg.id)) return p; return [...p, msg]; } return p; });
      setConvs(p => p.map(c => c.id === msg.conversationId ? { ...c, lastMessage: { text: msg.text, createdAt: msg.createdAt, senderId: msg.senderId }, unreadCount: c.id === activeId ? 0 : c.unreadCount + 1 } : c).sort((a, b) => (b.lastMessage?.createdAt || '').localeCompare(a.lastMessage?.createdAt || '')));
      if (msg.conversationId === activeId) { setTimeout(scrollBottom, 50); chatApi.markRead(msg.conversationId).catch(() => {}); }
    });
    socket.on('messagesRead', ({ conversationId }: { conversationId: number }) => { setMsgs(p => p.map(m => m.conversationId === conversationId ? { ...m, read: true } : m)); });
    socket.on('userTyping', ({ conversationId, userName }: { conversationId: number; userName: string }) => {
      if (conversationId === activeId) { setTyping(userName); if (typingRef.current) clearTimeout(typingRef.current); typingRef.current = setTimeout(() => setTyping(null), 3000); }
    });
    return () => { socket.disconnect(); socketRef.current = null; if (typingRef.current) clearTimeout(typingRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoggedIn, accessToken]);

  const send = useCallback((text: string) => {
    if (!text.trim() || !activeId || !user) return;
    const txt = text.trim();
    setInput('');
    const m: Message = { id: Date.now(), text: txt, senderId: user.id, conversationId: activeId, createdAt: new Date().toISOString(), read: false };
    setMsgs(p => [...p, m]);
    setTimeout(scrollBottom, 50);
    if (socketRef.current?.connected) socketRef.current.emit('sendMessage', { conversationId: activeId, text: txt });
    chatApi.sendMessage(activeId, txt).catch(() => {});
    setConvs(p => p.map(c => c.id === activeId ? { ...c, lastMessage: { text: txt, createdAt: m.createdAt, senderId: user.id } } : c));
  }, [activeId, user]);

  const emitTyping = useCallback(() => { if (socketRef.current?.connected && activeId) socketRef.current.emit('typing', { conversationId: activeId }); }, [activeId]);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } };

  const grouped: { date: string; msgs: Message[] }[] = [];
  msgs.forEach(m => { const k = new Date(m.createdAt).toDateString(); const l = grouped[grouped.length - 1]; if (l && l.date === k) l.msgs.push(m); else grouped.push({ date: k, msgs: [m] }); });

  if (!isOpen || !isLoggedIn) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ position: 'relative', width: 720, maxWidth: 'calc(100vw - 16px)', animation: 'chatIn 0.2s ease-out' }}>
        {/* Close button — above chat window */}
        <button onClick={(e) => { e.stopPropagation(); close(); }}
          className="max-sm:!top-2 max-sm:!right-2"
          style={{ position: 'absolute', top: -18, right: -18, width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 15, transition: 'all 0.15s', fontFamily: 'inherit', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'none'; }}>
          ✕
        </button>

        <div style={{ width: '100%', height: 'min(560px, calc(100vh - 60px))', display: 'flex', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--card-border)', boxShadow: '0 16px 64px rgba(0,0,0,0.4)' }}>
        <style>{`@keyframes chatIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: none; } }`}</style>

        {/* Left: Tabs (Dialogs / Companions) — hidden on mobile when viewing messages */}
        <div style={{ width: 260, minWidth: 260, background: 'var(--bg2)', borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          className={activeId ? 'max-sm:hidden' : ''}>
          {/* Tab header */}
          <div style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.06), rgba(57,255,209,0.03))' }}>
            <div style={{ display: 'flex', padding: '0 6px', borderBottom: '1px solid var(--card-border)' }}>
              {(['chats', 'companions'] as const).map(tab => (
                <button key={tab} data-tab={tab} onClick={() => setLeftTab(tab)}
                  style={{ flex: 1, padding: '11px 0', fontSize: 12, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: leftTab === tab ? 'var(--accent)' : 'var(--text3)', borderBottom: leftTab === tab ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.15s', position: 'relative' }}>
                  {tab === 'chats' ? t('dialogs') : t('company')}
                  {tab === 'companions' && pending.length > 0 && (
                    <span style={{ position: 'absolute', top: 6, marginLeft: 4, width: 16, height: 16, borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pending.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {leftTab === 'chats' ? (
              /* ── Conversations list ── */
              <>
                {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>{t('loading')}</div>
                : convs.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    <p style={{ color: 'var(--text3)', fontSize: 12, margin: 0 }}>{t('noDialogs')}</p>
                  </div>
                ) : convs.map(c => {
                  const act = c.id === activeId, unr = c.unreadCount > 0;
                  const displayName = c.name || c.otherUser.name || t('user');
                  return (
                    <div key={c.id} style={{ position: 'relative', marginBottom: 2 }}>
                      <button onClick={() => setActiveId(c.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, border: 'none', background: act ? 'linear-gradient(135deg, rgba(255,92,40,0.1), rgba(255,92,40,0.04))' : 'transparent', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit', boxShadow: act ? 'inset 0 0 0 1px rgba(255,92,40,0.2)' : 'none' }}
                        onMouseEnter={e => { if (!act) e.currentTarget.style.background = 'var(--nav-hover)'; }}
                        onMouseLeave={e => { if (!act) e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: act ? '2px solid var(--accent)' : '2px solid var(--card-border)' }}>
                            {c.otherUser.avatarUrl ? <img src={c.otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 15 }}>👤</span>}
                          </div>
                          {unr && <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 5, background: 'var(--accent)', border: '2px solid var(--bg2)' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: unr ? 700 : 500, color: 'var(--text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                          {c.lastMessage && <span style={{ fontSize: 11, color: unr ? 'var(--text2)' : 'var(--text3)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{c.lastMessage.senderId === user?.id ? `${t('you')}: ` : ''}{(() => { const rp = parseRestaurantMsg(c.lastMessage!.text); if (rp) return `🍽️ ${rp.name}`; const pp = parsePickSessionMsg(c.lastMessage!.text); if (pp) return `🍽️ Куда пойдём?`; return trunc(c.lastMessage!.text, 20); })()}</span>}
                        </div>
                      </button>
                      {/* Rename button — only for creator */}
                      {c.createdById === user?.id && act && (
                        <button
                          onClick={() => { setRenamingId(c.id); setRenameValue(c.name || ''); }}
                          title={t('rename')}
                          style={{ position: 'absolute', top: 8, right: 6, width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,92,40,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 11, fontFamily: 'inherit' }}>
                          ✎
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Rename modal */}
                {renamingId && (
                  <div style={{ padding: '8px 6px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        placeholder={t('renamePlaceholder')}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(renamingId); if (e.key === 'Escape') setRenamingId(null); }}
                        autoFocus
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                      <button onClick={() => handleRename(renamingId)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── Companions tab ── */
              <>
                {/* Search users */}
                <div style={{ padding: '6px 6px 4px' }}>
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder={t('searchUsers')}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                </div>

                {/* Search results */}
                {searchQ.length >= 2 && (
                  <div style={{ padding: '0 6px 6px' }}>
                    {searching ? <div style={{ padding: 8, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>...</div>
                    : searchResults.length === 0 ? <div style={{ padding: 8, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>{t('noResults')}</div>
                    : searchResults.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, marginBottom: 2 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--card-border)', flexShrink: 0 }}>
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>👤</span>}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                        <button onClick={() => handleInvite(u.id)}
                          style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,92,40,0.12)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          + {t('invite')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQ.length < 2 && (
                  <>
                    {/* Pending invitations */}
                    {pending.length > 0 && (
                      <div style={{ padding: '4px 6px' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 4px 6px' }}>{t('pendingInvites')}</div>
                        {pending.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, marginBottom: 2, background: 'rgba(255,92,40,0.04)', border: '1px solid rgba(255,92,40,0.1)' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {p.user.avatarUrl ? <img src={p.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>👤</span>}
                            </div>
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user.name}</span>
                            <button onClick={() => handleAccept(p.id)} style={{ padding: '3px 7px', borderRadius: 6, border: 'none', background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                            <button onClick={() => handleDecline(p.id)} style={{ padding: '3px 7px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Companion list */}
                    {compLoading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>{t('loading')}</div>
                    : companions.length === 0 && pending.length === 0 ? (
                      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🍽️</div>
                        <p style={{ color: 'var(--text3)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{t('noCompanions')}</p>
                      </div>
                    ) : (
                      <div style={{ padding: '4px 6px' }}>
                        {companions.length > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 4px 6px' }}>{t('company')}</div>}
                        {companions.map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 10, marginBottom: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-border)', flexShrink: 0 }}>
                              {c.user.avatarUrl ? <img src={c.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>👤</span>}
                            </div>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.user.name}</span>
                            <button onClick={() => startChatWith(c.user.id)} title={t('writeMessage')}
                              style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,92,40,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                            </button>
                            <button onClick={() => handleRemoveCompanion(c.id)} title={t('removeCompanion')}
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 11, flexShrink: 0 }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Messages */}
        <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(255,92,40,0.1), rgba(57,255,209,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💬</div>
              <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, margin: 0 }}>{t('selectDialog')}</p>
              <p style={{ color: 'var(--text3)', fontSize: 12, margin: 0, opacity: 0.6, textAlign: 'center', whiteSpace: 'pre-line' }}>{t('orStartChat')}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '10px 14px', background: 'var(--bg2)', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent)', flexShrink: 0, boxShadow: '0 0 10px rgba(255,92,40,0.12)' }}>
                  {activeConv?.otherUser.avatarUrl ? <img src={activeConv.otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>👤</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{activeConv?.otherUser.name || t('user')}</div>
                  {typing ? <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>{t('typing')}</div> : <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t('gourmet')}</div>}
                </div>
                {activeConv && <a href={`/profile/${activeConv.otherUser.id}`} onClick={close} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>{t('profile')}</a>}
                <button onClick={close} title={t('close')}
                  style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', transition: 'all 0.15s', fontFamily: 'inherit', flexShrink: 0, fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text3)'; }}>
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hasMore && <button onClick={loadMore} disabled={msgsLoading} style={{ alignSelf: 'center', padding: '5px 14px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', marginBottom: 8, opacity: msgsLoading ? 0.5 : 1, fontFamily: 'inherit' }}>{msgsLoading ? '...' : t('loadEarlier')}</button>}
                {msgsLoading && msgs.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 12 }}>{t('loading')}</div>}

                {!msgsLoading && msgs.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 10px' }}>
                    <div style={{ fontSize: 32 }}>🤝</div>
                    <p style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 500, margin: 0 }}>{t('startConversation')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', maxWidth: 240 }}>
                      {QUICK.map(q => (
                        <button key={q.label} onClick={() => send(q.emoji + ' ' + q.label)}
                          style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg2)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255,92,40,0.06)'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.transform = 'none'; }}>
                          <span style={{ fontSize: 16 }}>{q.emoji}</span><span>{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {grouped.map(g => (
                  <div key={g.date}>
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 8, fontWeight: 500 }}>{fmtDate(g.msgs[0].createdAt)}</span>
                    </div>
                    {g.msgs.map((m, i) => {
                      const mine = m.senderId === user?.id;
                      const showAv = !mine && (i === 0 || g.msgs[i - 1]?.senderId !== m.senderId);
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6, marginBottom: 3 }}>
                          {!mine && <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, visibility: showAv ? 'visible' : 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeConv?.otherUser.avatarUrl ? <img src={activeConv.otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 9 }}>👤</span>}</div>}
                          <div style={(() => { const isSpecial = parseRestaurantMsg(m.text) || parsePickSessionMsg(m.text); return { maxWidth: '75%', padding: isSpecial ? '4px' : '7px 11px', borderRadius: mine ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: isSpecial ? 'transparent' : mine ? 'linear-gradient(135deg, var(--accent), #ff8c42)' : 'var(--bg2)', color: mine ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' as const, boxShadow: isSpecial ? 'none' : mine ? '0 2px 8px rgba(255,92,40,0.2)' : '0 1px 2px rgba(0,0,0,0.08)', border: isSpecial ? 'none' : mine ? 'none' : '1px solid var(--card-border)' }; })()}>
                            {(() => {
                              const rp = parseRestaurantMsg(m.text);
                              if (rp) return <RestaurantBubble slug={rp.slug} name={rp.name} mine={mine} />;
                              const pp = parsePickSessionMsg(m.text);
                              if (pp) return <PickSessionInvite sessionId={pp.sessionId} mode={pp.mode} label={pp.label} onJoin={(sid) => { setPickJoinId(sid); setPickSessionOpen(true); }} />;
                              return <div>{m.text}</div>;
                            })()}
                            <div style={{ fontSize: 9, marginTop: 2, textAlign: 'right', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                              {fmtTime(m.createdAt)}
                              {mine && <span>{m.read ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5" /><path d="M22 6L11 17" /></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div style={{ height: 1 }} />
              </div>

              {/* Pick session overlay */}
              {pickSessionOpen && activeId && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--bg)', borderRadius: 20, overflow: 'hidden' }}>
                  <PickSessionPanel conversationId={activeId} sessionId={pickJoinId} socket={socketRef.current} onClose={() => { setPickSessionOpen(false); setPickJoinId(undefined); }} />
                </div>
              )}

              {/* Active pick session banner */}
              {activePickId && !pickSessionOpen && (
                <button onClick={() => { setPickJoinId(activePickId); setPickSessionOpen(true); }}
                  style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(255,92,40,0.1), rgba(255,140,66,0.1))', borderTop: '1px solid rgba(255,92,40,0.2)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none', borderBottom: 'none', width: '100%', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 16 }}>🍽️</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', flex: 1, textAlign: 'left' }}>Активная сессия подбора</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', padding: '4px 10px', borderRadius: 8, background: 'rgba(255,92,40,0.15)' }}>Продолжить →</span>
                </button>
              )}

              {/* Input */}
              <div style={{ padding: '10px 14px', background: 'var(--bg2)', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button onClick={() => setPickSessionOpen(true)} title="Подобрать ресторан вместе"
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
                  🍽️
                </button>
                <textarea value={input} onChange={e => { setInput(e.target.value); emitTyping(); }} onKeyDown={onKey}
                  placeholder={t('placeholder')} rows={1}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 38, maxHeight: 80, lineHeight: 1.4, transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,92,40,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }} />
                <button onClick={() => send(input)} disabled={!input.trim()}
                  style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: input.trim() ? 'linear-gradient(135deg, var(--accent), #ff8c42)' : 'var(--bg3)', color: input.trim() ? '#fff' : 'var(--text3)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxShadow: input.trim() ? '0 4px 16px var(--accent-glow)' : 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
