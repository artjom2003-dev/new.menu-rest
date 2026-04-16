'use client';

import { useState, useEffect, useCallback } from 'react';
import { pickSessionApi, restaurantApi, referenceApi, chatApi } from '@/lib/api';
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
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', borderRadius: 20 }}>
      <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      <div style={{ fontSize: 56, animation: 'popIn 0.4s ease-out' }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 8, animation: 'popIn 0.4s ease-out 0.1s both' }}>Совпадение!</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, animation: 'popIn 0.4s ease-out 0.2s both' }}>Вам обоим понравился этот ресторан</div>
      {cover && <img src={cover} alt="" style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 14, marginTop: 16, animation: 'popIn 0.4s ease-out 0.3s both', border: '2px solid rgba(255,255,255,0.2)' }} />}
      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginTop: 10, animation: 'popIn 0.4s ease-out 0.4s both' }}>{restaurant.name}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, animation: 'popIn 0.4s ease-out 0.5s both' }}>
        <Link href={`/restaurants/${restaurant.slug}`} style={{ padding: '10px 24px', borderRadius: 24, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Открыть
        </Link>
        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
          Продолжить
        </button>
      </div>
    </div>
  );
}

// ─── Swipe Card ───
function SwipeCard({ restaurant, onReact, progress }: { restaurant: Restaurant; onReact: (r: 'like' | 'dislike') => void; progress: string }) {
  const cover = (restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0])?.url;
  const cuisine = restaurant.cuisines?.map(c => c.name).join(', ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{progress}</div>
      <div style={{ width: '100%', maxWidth: 260, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg2)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ height: 200, background: 'var(--bg3)', position: 'relative' }}>
          {cover ? <img src={cover} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), #ff8c42)', fontSize: 48 }}>🍽️</div>}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 14px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{restaurant.name}</div>
            {cuisine && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{cuisine}</div>}
          </div>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {restaurant.averageBill ? <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>~{restaurant.averageBill.toLocaleString('ru-RU')} ₽</span> : <span />}
          <Link href={`/restaurants/${restaurant.slug}`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>Подробнее →</Link>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <button onClick={() => onReact('dislike')} style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.transform = 'scale(1)'; }}>
          👎
        </button>
        <button onClick={() => onReact('like')} style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.06)'; e.currentTarget.style.transform = 'scale(1)'; }}>
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
    { key: 'dislike' as const, emoji: '👎', bg: 'rgba(239,68,68,0.08)', active: 'rgba(239,68,68,0.3)' },
    { key: 'like' as const, emoji: '👍', bg: 'rgba(34,197,94,0.08)', active: 'rgba(34,197,94,0.3)' },
    { key: 'superlike' as const, emoji: '🔥', bg: 'rgba(255,165,0,0.08)', active: 'rgba(255,165,0,0.3)' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 14, border: myReaction ? '1px solid var(--accent)' : '1px solid var(--card-border)', background: 'var(--bg2)', transition: 'all 0.2s' }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
        {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.name}</div>
        {restaurant.averageBill && <div style={{ fontSize: 11, color: 'var(--text3)' }}>~{restaurant.averageBill.toLocaleString('ru-RU')} ₽</div>}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {reactions.map(r => (
          <button key={r.key} onClick={() => onReact(r.key)}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: myReaction === r.key ? r.active : r.bg, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', transform: myReaction === r.key ? 'scale(1.15)' : 'scale(1)' }}>
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
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>
        {results.mode === 'swipe' ? '🎯 Совпадения' : '📊 Результаты'}
      </div>
      {results.mode === 'swipe' && results.matches && (
        results.matches.length ? results.matches.map(r => {
          const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
          return (
            <Link key={r.id} href={`/restaurants/${r.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>{cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>🍽️</span>}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div></div>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Открыть →</span>
            </Link>
          );
        }) : <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 24 }}>Совпадений нет 😔<br/>Попробуйте ещё раз!</div>
      )}
      {results.mode === 'vote' && results.ranked?.map((item, i) => {
        const r = item.restaurant;
        if (!r) return null;
        const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
        return (
          <Link key={r.id} href={`/restaurants/${r.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, border: i === 0 ? '2px solid rgba(255,165,0,0.4)' : '1px solid var(--card-border)', background: i === 0 ? 'rgba(255,165,0,0.04)' : 'var(--bg2)', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 20, width: 30, textAlign: 'center' }}>{medal}</span>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>{cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>🍽️</span>}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text3)' }}>{item.score} pts</span>
          </Link>
        );
      })}
      <button onClick={onClose} style={{ marginTop: 8, padding: '12px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Закрыть</button>
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
      const r = await restaurantApi.list({ search: search.trim(), limit: 10 });
      setSearchResults(r.data?.items || r.data || []);
    } catch {}
    setSearching(false);
  }, [search]);

  if (!mode) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 32 }}>🍽️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>Куда пойдём?</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Подберите ресторан вместе</div>
        </div>
        <button onClick={() => setMode('swipe')} style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🔥</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Свайпы</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Листайте карточки — при совпадении матч!</div>
            </div>
          </div>
        </button>
        <button onClick={() => setMode('vote')} style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--card-border)', background: 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Голосование</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Выберите рестораны — каждый голосует</div>
            </div>
          </div>
        </button>
        <button onClick={onCancel} style={{ padding: 10, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>Отмена</button>
      </div>
    );
  }

  if (mode === 'swipe') {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>🔥 Настройка свайпов</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Город (необязательно)</div>
          <select value={citySlug} onChange={e => setCitySlug(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
            <option value="">Любой город</option>
            {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => setMode(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>← Назад</button>
          <button onClick={() => onStart('swipe', citySlug ? { citySlug } : undefined)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent), #ff8c42)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Начать 🔥</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📊 Выберите рестораны</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Поиск ресторанов..."
          style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        <button onClick={doSearch} disabled={searching} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {searching ? '...' : '🔍'}
        </button>
      </div>
      {selectedIds.length > 0 && <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Выбрано: {selectedIds.length}</div>}
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {searchResults.map(r => {
          const sel = selectedIds.includes(r.id);
          const cover = (r.photos?.find(p => p.isCover) || r.photos?.[0])?.url;
          return (
            <button key={r.id} onClick={() => setSelectedIds(p => sel ? p.filter(x => x !== r.id) : p.length < 10 ? [...p, r.id] : p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, border: sel ? '1px solid var(--accent)' : '1px solid var(--card-border)', background: sel ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>🍽️</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div></div>
              <span style={{ fontSize: 16 }}>{sel ? '✅' : '➕'}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>← Назад</button>
        <button onClick={() => onStart('vote', undefined, selectedIds)} disabled={selectedIds.length < 2}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: selectedIds.length >= 2 ? 'linear-gradient(135deg, var(--accent), #ff8c42)' : 'var(--bg3)', color: selectedIds.length >= 2 ? '#fff' : 'var(--text3)', fontSize: 13, fontWeight: 700, cursor: selectedIds.length >= 2 ? 'pointer' : 'default' }}>
          Начать ({selectedIds.length})
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───
interface PickSessionProps {
  conversationId: number;
  sessionId?: number; // When joining existing session
  socket: { emit: (event: string, data: unknown) => void } | null;
  onClose: () => void;
}

export function PickSessionPanel({ conversationId, sessionId: joinSessionId, socket, onClose }: PickSessionProps) {
  const [session, setSession] = useState<PickSessionData | null>(null);
  const [phase, setPhase] = useState<'setup' | 'swipe' | 'vote' | 'results'>('setup');
  const [currentCard, setCurrentCard] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [myVotes, setMyVotes] = useState<Record<number, string>>({});
  const [matchRestaurant, setMatchRestaurant] = useState<Restaurant | null>(null);
  const [results, setResults] = useState<{ mode: string; matches?: Restaurant[]; ranked?: Array<{ restaurant: Restaurant; score: number }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [error, setError] = useState('');

  // Join existing session or check for active one
  useEffect(() => {
    const sid = joinSessionId;
    if (sid) {
      loadSession(sid);
    } else {
      pickSessionApi.getActive(conversationId).then(r => {
        if (r.data) loadSession(r.data.id);
      }).catch(() => {});
    }
  }, [conversationId, joinSessionId]);

  const loadSession = async (sid: number) => {
    try {
      const r = await pickSessionApi.getSession(sid);
      const s = r.data;
      setSession(s);
      setTotalCards(s.restaurantPool?.length || 0);
      if (s.status === 'completed') {
        const res = await pickSessionApi.getResults(sid);
        setResults(res.data);
        setPhase('results');
      } else if (s.mode === 'swipe') {
        setPhase('swipe');
        await loadNextCard(sid);
      } else {
        setPhase('vote');
        await loadVoteRestaurants(sid);
      }
    } catch { setError('Не удалось загрузить сессию'); }
  };

  const loadNextCard = async (sid: number) => {
    try {
      const r = await pickSessionApi.getNextCard(sid);
      setCurrentCard(r.data || null);
      if (!r.data) {
        // All cards swiped — get results
        const res = await pickSessionApi.getResults(sid);
        await pickSessionApi.complete(sid).catch(() => {});
        setResults(res.data);
        setPhase('results');
      }
    } catch { setCurrentCard(null); }
  };

  const loadVoteRestaurants = async (sid: number) => {
    try {
      const r = await pickSessionApi.getRestaurants(sid);
      setRestaurants(r.data || []);
    } catch {}
  };

  const handleStart = async (mode: 'swipe' | 'vote', filters?: Record<string, unknown>, restaurantIds?: number[]) => {
    setLoading(true);
    setError('');
    try {
      const r = await pickSessionApi.create({ conversationId, mode, filters, restaurantIds });
      const s = r.data;
      setSession(s);
      setTotalCards(s.restaurantPool?.length || 0);

      // Send invitation message in chat
      const modeLabel = mode === 'swipe' ? 'свайпы' : 'голосование';
      await chatApi.sendMessage(conversationId, `[pickSession:${s.id}:${mode}:${modeLabel}]`);

      if (mode === 'swipe') {
        setPhase('swipe');
        await loadNextCard(s.id);
      } else {
        setPhase('vote');
        await loadVoteRestaurants(s.id);
      }
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка создания сессии');
    }
    setLoading(false);
  };

  const handleSwipe = async (reaction: 'like' | 'dislike') => {
    if (!session || !currentCard) return;
    try {
      const r = await pickSessionApi.submitVote(session.id, currentCard.id, reaction);
      setSwipeCount(c => c + 1);
      if (r.data?.match) setMatchRestaurant(r.data.match);
      // Auto-advance to next card
      await loadNextCard(session.id);
    } catch {}
  };

  const handleVote = async (restaurantId: number, reaction: 'like' | 'dislike' | 'superlike') => {
    if (!session) return;
    try {
      await pickSessionApi.submitVote(session.id, restaurantId, reaction);
      setMyVotes(prev => ({ ...prev, [restaurantId]: reaction }));
    } catch {}
  };

  const handleFinishVote = async () => {
    if (!session) return;
    try {
      await pickSessionApi.complete(session.id);
      const r = await pickSessionApi.getResults(session.id);
      setResults(r.data);
      setPhase('results');
    } catch {}
  };

  const handleClose = () => {
    if (session?.status === 'active') pickSessionApi.cancel(session.id).catch(() => {});
    onClose();
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Загрузка...</div>;

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {matchRestaurant && <MatchOverlay restaurant={matchRestaurant} onClose={() => setMatchRestaurant(null)} />}

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
          {phase === 'setup' ? '🍽️ Куда пойдём?' : phase === 'swipe' ? `🔥 ${swipeCount}/${totalCards}` : phase === 'vote' ? `📊 ${Object.keys(myVotes).length}/${restaurants.length}` : '🎯 Результаты'}
        </span>
        <button onClick={handleClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {error && <div style={{ padding: '8px 14px', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.06)' }}>{error}</div>}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {phase === 'setup' && <SetupModal onStart={handleStart} onCancel={handleClose} />}

        {phase === 'swipe' && (
          currentCard ? (
            <SwipeCard restaurant={currentCard} onReact={handleSwipe} progress={`${swipeCount + 1} из ${totalCards}`} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Готово!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Загружаем результаты...</div>
            </div>
          )
        )}

        {phase === 'vote' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 4 }}>Оцените каждый ресторан</div>
            {restaurants.map(r => (
              <VoteCard key={r.id} restaurant={r} myReaction={myVotes[r.id]} onReact={reaction => handleVote(r.id, reaction)} />
            ))}
            {Object.keys(myVotes).length === restaurants.length && restaurants.length > 0 && (
              <button onClick={handleFinishVote} style={{ marginTop: 8, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--accent), #ff8c42)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Показать результаты 🎉
              </button>
            )}
          </div>
        )}

        {phase === 'results' && results && <ResultsView results={results} onClose={handleClose} />}
      </div>
    </div>
  );
}

// ─── Invitation bubble for chat messages ───
const PICK_SESSION_RE = /^\[pickSession:(\d+):(\w+):(.+)\]$/;

export function parsePickSessionMsg(text: string): { sessionId: number; mode: string; label: string } | null {
  const m = text.match(PICK_SESSION_RE);
  return m ? { sessionId: Number(m[1]), mode: m[2], label: m[3] } : null;
}

export function PickSessionInvite({ sessionId, mode, label, onJoin }: { sessionId: number; mode: string; label: string; onJoin: (sessionId: number) => void }) {
  return (
    <div style={{ width: 220, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg2)' }}>
      <div style={{ padding: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: 28 }}>{mode === 'swipe' ? '🔥' : '📊'}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 6 }}>Куда пойдём?</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Режим: {label}</div>
        <button onClick={() => onJoin(sessionId)} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent), #ff8c42)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Присоединиться
        </button>
      </div>
    </div>
  );
}
