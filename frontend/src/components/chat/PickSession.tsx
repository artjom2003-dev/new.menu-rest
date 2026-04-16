'use client';

import { useState, useEffect, useCallback } from 'react';
import { pickSessionApi, restaurantApi, referenceApi } from '@/lib/api';
import Link from 'next/link';

interface Restaurant {
  id: number;
  slug: string;
  name: string;
  averageBill?: number;
  cuisines?: Array<{ name: string }>;
  photos?: Array<{ url: string; isCover: boolean }>;
  ratingAggregate?: number;
}

interface PickSessionData {
  id: number;
  mode: 'swipe' | 'vote';
  status: string;
  restaurantPool: number[];
  conversationId: number;
  creatorId: number;
}

// ─── Match Animation ───
function MatchOverlay({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const cover = (restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0])?.url;
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', animation: 'fadeIn 0.3s', borderRadius: 20 }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(-100px) rotate(720deg); opacity: 0; } }`}</style>
      <div style={{ fontSize: 48, animation: 'popIn 0.5s ease-out' }}>🎉</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 8, animation: 'popIn 0.5s ease-out 0.1s both' }}>Совпадение!</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, animation: 'popIn 0.5s ease-out 0.2s both' }}>Вам обоим понравился</div>
      {cover && <img src={cover} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 12, marginTop: 12, animation: 'popIn 0.5s ease-out 0.3s both' }} />}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 8, animation: 'popIn 0.5s ease-out 0.4s both' }}>{restaurant.name}</div>
      <Link href={`/restaurants/${restaurant.slug}`} onClick={onClose} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', animation: 'popIn 0.5s ease-out 0.5s both' }}>
        Открыть ресторан
      </Link>
    </div>
  );
}

// ─── Swipe Card ───
function SwipeCard({ restaurant, onReact }: { restaurant: Restaurant; onReact: (r: 'like' | 'dislike') => void }) {
  const cover = (restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0])?.url;
  const cuisine = restaurant.cuisines?.map(c => c.name).join(', ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 280, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg2)' }}>
        <div style={{ height: 180, background: 'var(--bg3)', position: 'relative' }}>
          {cover ? <img src={cover} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{restaurant.name}</div>
          {cuisine && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{cuisine}</div>}
          {restaurant.averageBill && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>~{restaurant.averageBill.toLocaleString('ru-RU')} ₽</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={() => onReact('dislike')} style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}>
          👎
        </button>
        <button onClick={() => onReact('like')} style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}>
          ❤️
        </button>
      </div>
    </div>
  );
}

// ─── Vote Card ───
function VoteCard({ restaurant, myReaction, onReact }: { restaurant: Restaurant; myReaction?: string; onReact: (r: 'like' | 'dislike' | 'superlike') => void }) {
  const cover = (restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0])?.url;
  const reactions = [
    { key: 'dislike' as const, emoji: '👎', color: 'rgba(239,68,68,0.15)', active: 'rgba(239,68,68,0.4)' },
    { key: 'like' as const, emoji: '👍', color: 'rgba(34,197,94,0.15)', active: 'rgba(34,197,94,0.4)' },
    { key: 'superlike' as const, emoji: '🔥', color: 'rgba(255,165,0,0.15)', active: 'rgba(255,165,0,0.4)' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 14, border: '1px solid var(--card-border)', background: myReaction ? 'var(--bg3)' : 'var(--bg2)', transition: 'all 0.2s' }}>
      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
        {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{restaurant.name}</div>
        {restaurant.averageBill && <div style={{ fontSize: 11, color: 'var(--text3)' }}>~{restaurant.averageBill.toLocaleString('ru-RU')} ₽</div>}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {reactions.map(r => (
          <button key={r.key} onClick={() => onReact(r.key)}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: myReaction === r.key ? r.active : r.color, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', transform: myReaction === r.key ? 'scale(1.15)' : 'scale(1)' }}>
            {r.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Results ───
function ResultsView({ results, onClose }: { results: { mode: string; matches?: Restaurant[]; ranked?: Array<{ restaurant: Restaurant; score: number }> }; onClose: () => void }) {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
        {results.mode === 'swipe' ? '🎯 Результаты свайпов' : '📊 Результаты голосования'}
      </div>
      {results.mode === 'swipe' && results.matches && (
        results.matches.length ? (
          results.matches.map(r => {
            const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
            return (
              <Link key={r.id} href={`/restaurants/${r.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🍽️</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.cuisines?.map(c => c.name).join(', ')}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Открыть →</span>
              </Link>
            );
          })
        ) : <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 20 }}>Нет совпадений 😔 Попробуйте ещё раз!</div>
      )}
      {results.mode === 'vote' && results.ranked && results.ranked.map((item, i) => {
        const r = item.restaurant;
        if (!r) return null;
        const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        return (
          <Link key={r.id} href={`/restaurants/${r.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: i === 0 ? '1px solid rgba(255,165,0,0.3)' : '1px solid var(--card-border)', background: i === 0 ? 'rgba(255,165,0,0.05)' : 'var(--bg2)', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{medal || `${i + 1}`}</span>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>🍽️</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text3)' }}>{item.score} pts</span>
          </Link>
        );
      })}
      <button onClick={onClose} style={{ marginTop: 8, padding: '10px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Закрыть
      </button>
    </div>
  );
}

// ─── Setup Modal ───
function SetupModal({ onStart, onCancel }: { onStart: (mode: 'swipe' | 'vote', filters?: Record<string, unknown>, restaurantIds?: number[]) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'swipe' | 'vote' | null>(null);
  const [citySlug, setCitySlug] = useState('');
  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { referenceApi.getCities().then(r => setCities(r.data || [])).catch(() => {}); }, []);

  const doSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await restaurantApi.list({ q: search, limit: 10 });
      setSearchResults(r.data?.items || r.data || []);
    } catch {}
    setSearching(false);
  }, [search]);

  if (!mode) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Подобрать ресторан вместе</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 8 }}>Выберите способ</div>
        <button onClick={() => setMode('swipe')} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔥 Свайпы</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Листайте карточки</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Свайпайте рестораны — при совпадении матч!</div>
        </button>
        <button onClick={() => setMode('vote')} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📊 Голосование</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Выберите несколько ресторанов</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Каждый голосует, побеждает лидер</div>
        </button>
        <button onClick={onCancel} style={{ padding: 8, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>Отмена</button>
      </div>
    );
  }

  if (mode === 'swipe') {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🔥 Настройка свайпов</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Выберите город (необязательно)</div>
        <select value={citySlug} onChange={e => setCitySlug(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13 }}>
          <option value="">Любой город</option>
          {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>Назад</button>
          <button onClick={() => onStart('swipe', citySlug ? { citySlug } : undefined)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Начать!</button>
        </div>
      </div>
    );
  }

  // Vote mode — search and select restaurants
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>📊 Выберите рестораны</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Поиск ресторанов..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        <button onClick={doSearch} disabled={searching} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {searching ? '...' : '🔍'}
        </button>
      </div>
      {selectedIds.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Выбрано: {selectedIds.length}/10</div>
      )}
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {searchResults.map(r => {
          const selected = selectedIds.includes(r.id);
          const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
          return (
            <button key={r.id} onClick={() => setSelectedIds(prev => selected ? prev.filter(x => x !== r.id) : prev.length < 10 ? [...prev, r.id] : prev)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, border: selected ? '1px solid var(--accent)' : '1px solid var(--card-border)', background: selected ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>🍽️</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              </div>
              <span style={{ fontSize: 14 }}>{selected ? '✅' : '➕'}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>Назад</button>
        <button onClick={() => onStart('vote', undefined, selectedIds)} disabled={selectedIds.length < 2}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: selectedIds.length >= 2 ? 'var(--accent)' : 'var(--bg3)', color: selectedIds.length >= 2 ? '#fff' : 'var(--text3)', fontSize: 13, fontWeight: 600, cursor: selectedIds.length >= 2 ? 'pointer' : 'default' }}>
          Начать ({selectedIds.length})
        </button>
      </div>
    </div>
  );
}

// ─── Main PickSession Component ───
interface PickSessionProps {
  conversationId: number;
  socket: { emit: (event: string, data: unknown) => void } | null;
  onClose: () => void;
}

export function PickSessionPanel({ conversationId, socket, onClose }: PickSessionProps) {
  const [session, setSession] = useState<PickSessionData | null>(null);
  const [phase, setPhase] = useState<'setup' | 'swipe' | 'vote' | 'results'>('setup');
  const [currentCard, setCurrentCard] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [myVotes, setMyVotes] = useState<Record<number, string>>({});
  const [matchRestaurant, setMatchRestaurant] = useState<Restaurant | null>(null);
  const [results, setResults] = useState<{ mode: string; matches?: Restaurant[]; ranked?: Array<{ restaurant: Restaurant; score: number }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);

  // Check for active session on mount
  useEffect(() => {
    pickSessionApi.getActive(conversationId).then(r => {
      if (r.data) {
        setSession(r.data);
        if (r.data.status === 'active') {
          if (r.data.mode === 'swipe') {
            setPhase('swipe');
            loadNextCard(r.data.id);
          } else {
            setPhase('vote');
            loadVoteRestaurants(r.data.id);
          }
        }
      }
    }).catch(() => {});
  }, [conversationId]);

  const loadNextCard = async (sessionId: number) => {
    try {
      const r = await pickSessionApi.getNextCard(sessionId);
      setCurrentCard(r.data || null);
    } catch { setCurrentCard(null); }
  };

  const loadVoteRestaurants = async (sessionId: number) => {
    try {
      const r = await pickSessionApi.getRestaurants(sessionId);
      setRestaurants(r.data || []);
    } catch {}
  };

  const handleStart = async (mode: 'swipe' | 'vote', filters?: Record<string, unknown>, restaurantIds?: number[]) => {
    setLoading(true);
    try {
      const r = await pickSessionApi.create({ conversationId, mode, filters, restaurantIds });
      const s = r.data;
      setSession(s);
      if (mode === 'swipe') {
        setPhase('swipe');
        await loadNextCard(s.id);
      } else {
        setPhase('vote');
        await loadVoteRestaurants(s.id);
      }
      socket?.emit('pickSession:create', { conversationId, mode, filters, restaurantIds });
    } catch (e) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка');
    }
    setLoading(false);
  };

  const handleSwipe = async (reaction: 'like' | 'dislike') => {
    if (!session || !currentCard) return;
    try {
      const r = await pickSessionApi.submitVote(session.id, currentCard.id, reaction);
      socket?.emit('pickSession:swipe', { sessionId: session.id, restaurantId: currentCard.id, reaction });
      setSwipeCount(c => c + 1);
      if (r.data?.match) {
        setMatchRestaurant(r.data.match);
      }
      await loadNextCard(session.id);
      if (!currentCard) {
        // No more cards — show results
        const res = await pickSessionApi.getResults(session.id);
        setResults(res.data);
        setPhase('results');
        await pickSessionApi.complete(session.id);
      }
    } catch {}
  };

  const handleVote = async (restaurantId: number, reaction: 'like' | 'dislike' | 'superlike') => {
    if (!session) return;
    try {
      await pickSessionApi.submitVote(session.id, restaurantId, reaction);
      setMyVotes(prev => ({ ...prev, [restaurantId]: reaction }));
      socket?.emit('pickSession:vote', { sessionId: session.id, restaurantId, reaction });
    } catch {}
  };

  const handleFinishVote = async () => {
    if (!session) return;
    try {
      await pickSessionApi.complete(session.id);
      const r = await pickSessionApi.getResults(session.id);
      setResults(r.data);
      setPhase('results');
      socket?.emit('pickSession:complete', { sessionId: session.id });
    } catch {}
  };

  const handleClose = () => {
    if (session?.status === 'active') {
      pickSessionApi.cancel(session.id).catch(() => {});
      socket?.emit('pickSession:cancel', { sessionId: session.id });
    }
    onClose();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Загрузка...</div>;
  }

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {matchRestaurant && <MatchOverlay restaurant={matchRestaurant} onClose={() => setMatchRestaurant(null)} />}

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {phase === 'setup' ? '🍽️ Подобрать вместе' : phase === 'swipe' ? `🔥 Свайпы (${swipeCount})` : phase === 'vote' ? '📊 Голосование' : '🎯 Результаты'}
        </span>
        <button onClick={handleClose} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {phase === 'setup' && <SetupModal onStart={handleStart} onCancel={handleClose} />}

        {phase === 'swipe' && (
          currentCard ? (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SwipeCard restaurant={currentCard} onReact={handleSwipe} />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏁</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Карточки закончились!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Ждём результаты...</div>
            </div>
          )
        )}

        {phase === 'vote' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {restaurants.map(r => (
              <VoteCard key={r.id} restaurant={r} myReaction={myVotes[r.id]} onReact={(reaction) => handleVote(r.id, reaction)} />
            ))}
            {Object.keys(myVotes).length === restaurants.length && restaurants.length > 0 && (
              <button onClick={handleFinishVote} style={{ marginTop: 8, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Показать результаты 🎉
              </button>
            )}
          </div>
        )}

        {phase === 'results' && results && (
          <ResultsView results={results} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}
