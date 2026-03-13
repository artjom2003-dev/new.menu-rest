'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { userApi, referenceApi, bookingApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Booking {
  id: number;
  restaurant: { name: string; slug: string };
  bookingDate: string;
  bookingTime: string;
  guestsCount: number;
  status: string;
}

interface FavoriteRestaurant {
  id: number;
  slug: string;
  name: string;
  rating: number;
  cuisines?: Array<{ name: string }>;
}

interface Allergen {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Ожидает',
  confirmed: '✅ Подтверждена',
  completed: '🎉 Завершена',
  cancelled: '❌ Отменена',
  no_show: '🚫 Не пришёл',
};

const LEVEL_INFO: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Бронза', color: '#cd7f32', icon: '🥉' },
  silver: { label: 'Серебро', color: '#c0c0c0', icon: '🥈' },
  gold: { label: 'Золото', color: '#ffd700', icon: '🥇' },
};

export default function ProfilePage() {
  const { user, isLoggedIn, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<'info' | 'bookings' | 'history' | 'favorites' | 'allergens'>('info');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [userAllergenIds, setUserAllergenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return; }
    setNameInput(user?.name || '');
  }, [isLoggedIn, router, user?.name]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (tab === 'bookings' || tab === 'history') {
      bookingApi.getMyBookings().then(r => setBookings(r.data.items || [])).catch(() => {});
    } else if (tab === 'favorites') {
      userApi.getFavorites().then(r => setFavorites(r.data || [])).catch(() => {});
    } else if (tab === 'allergens') {
      referenceApi.getAllergens().then(r => setAllergens(r.data || [])).catch(() => {});
      const ids = user?.allergenProfile?.map(a => a.id) || [];
      setUserAllergenIds(new Set(ids));
    }
  }, [tab, isLoggedIn, user?.allergenProfile]);

  const handleSaveName = async () => {
    setLoading(true);
    try {
      await userApi.updateMe({ name: nameInput });
      updateUser({ name: nameInput });
      setEditMode(false);
      toast('Имя обновлено', 'success');
    } catch { toast('Не удалось сохранить имя', 'error'); }
    setLoading(false);
  };

  const toggleAllergen = async (id: number) => {
    const next = new Set(userAllergenIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setUserAllergenIds(next);
    try {
      await userApi.updateAllergens(Array.from(next));
    } catch { toast('Не удалось обновить аллергены', 'error'); }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  if (!user) return null;

  const level = LEVEL_INFO[user.loyaltyLevel] || LEVEL_INFO.bronze;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-[36px]"
          style={{ background: 'var(--bg3)', border: '2px solid var(--card-border)' }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : '👤'}
        </div>
        <div className="flex-1">
          {editMode ? (
            <div className="flex gap-2 items-center mb-1">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                className="px-3 py-2 rounded-[10px] text-[16px] text-[var(--text)] border outline-none"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
              <button onClick={handleSaveName} disabled={loading}
                className="px-4 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
                style={{ background: 'var(--accent)' }}>
                {loading ? '...' : 'Сохранить'}
              </button>
              <button onClick={() => { setEditMode(false); setNameInput(user.name || ''); }}
                className="px-3 py-2 rounded-full text-[12px] text-[var(--text3)] cursor-pointer border"
                style={{ background: 'var(--glass)', borderColor: 'var(--glass-border)' }}>
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[28px] font-bold text-[var(--text)]">{user.name || 'Пользователь'}</h1>
              <button onClick={() => setEditMode(true)} className="text-[12px] text-[var(--accent)] cursor-pointer bg-transparent border-none">
                ✏️
              </button>
            </div>
          )}
          <p className="text-[13px] text-[var(--text3)]">{user.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: `${level.color}22`, color: level.color, border: `1px solid ${level.color}44` }}>
              {level.icon} {level.label}
            </span>
            <span className="text-[13px] text-[var(--text2)]">{user.loyaltyPoints} баллов</span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="px-5 py-2.5 rounded-full text-[12px] font-semibold text-red-400 border cursor-pointer"
          style={{ background: 'var(--glass)', borderColor: 'rgba(239,68,68,0.3)' }}>
          Выйти
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-[14px] overflow-x-auto" style={{ background: 'var(--bg3)' }}>
        {([
          ['info', '👤 Профиль'],
          ['bookings', '📅 Брони'],
          ['history', '🕐 История'],
          ['favorites', '❤️ Избранное'],
          ['allergens', '🛡️ Аллергены'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer border-none"
            style={{
              background: tab === key ? 'var(--accent)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text3)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="rounded-[20px] border p-8" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <h2 className="text-[18px] font-semibold text-[var(--text)] mb-6">Информация</h2>
          <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
            <div>
              <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Имя</div>
              <div className="text-[15px] text-[var(--text)]">{user.name || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Email</div>
              <div className="text-[15px] text-[var(--text)]">{user.email}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Уровень</div>
              <div className="text-[15px] text-[var(--text)]">{level.icon} {level.label}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Баллы</div>
              <div className="text-[15px] text-[var(--text)]">{user.loyaltyPoints}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-[15px] text-[var(--text2)]">Пока нет бронирований</p>
              <a href="/restaurants" className="text-[13px] text-[var(--accent)] mt-2 inline-block">Найти ресторан →</a>
            </div>
          ) : bookings.map(b => (
            <div key={b.id} className="rounded-[16px] border p-5 flex items-center justify-between"
              style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
              <div>
                <a href={`/restaurants/${b.restaurant.slug}`} className="text-[15px] font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]">
                  {b.restaurant.name}
                </a>
                <p className="text-[13px] text-[var(--text3)] mt-1">
                  {b.bookingDate} в {b.bookingTime} · {b.guestsCount} гостей
                </p>
              </div>
              <span className="text-[12px]">{STATUS_LABELS[b.status] || b.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {bookings.filter(b => b.status === 'completed').length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🕐</div>
              <p className="text-[15px] text-[var(--text2)]">Нет завершённых посещений</p>
              <p className="text-[13px] text-[var(--text3)] mt-1">Здесь появятся рестораны, которые вы посетили</p>
              <a href="/restaurants" className="text-[13px] text-[var(--accent)] mt-3 inline-block">Забронировать столик →</a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--text3)] mb-4">
                {bookings.filter(b => b.status === 'completed').length} посещений
              </p>
              {bookings.filter(b => b.status === 'completed').map(b => (
                <a key={b.id} href={`/restaurants/${b.restaurant.slug}`}
                  className="rounded-[16px] border p-5 flex items-center justify-between no-underline transition-all hover:border-[var(--accent)]"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--text)]">{b.restaurant.name}</div>
                    <p className="text-[13px] text-[var(--text3)] mt-1">
                      {new Date(b.bookingDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} · {b.guestsCount} гостей
                    </p>
                  </div>
                  <span className="text-[12px] text-[var(--teal)]">🎉 Завершено</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'favorites' && (
        <div className="space-y-3">
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">❤️</div>
              <p className="text-[15px] text-[var(--text2)]">Избранное пусто</p>
              <a href="/restaurants" className="text-[13px] text-[var(--accent)] mt-2 inline-block">Найти ресторан →</a>
            </div>
          ) : favorites.map(r => (
            <div key={r.id}
              className="rounded-[16px] border p-5 flex items-center justify-between transition-all"
              style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
              <a href={`/restaurants/${r.slug}`} className="flex-1 no-underline">
                <div className="text-[15px] font-semibold text-[var(--text)]">{r.name}</div>
                <div className="text-[13px] text-[var(--text3)]">{r.cuisines?.map(c => c.name).join(', ')}</div>
              </a>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[var(--gold)]">⭐ {Number(r.rating).toFixed(1)}</span>
                <button
                  onClick={async () => {
                    await useFavoritesStore.getState().toggle(r.id);
                    setFavorites(prev => prev.filter(f => f.id !== r.id));
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] cursor-pointer transition-all border-none"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  title="Убрать из избранного">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'allergens' && (
        <div className="rounded-[20px] border p-8" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <h2 className="text-[18px] font-semibold text-[var(--text)] mb-2">Мои аллергены</h2>
          <p className="text-[13px] text-[var(--text3)] mb-6">
            Отметьте аллергены — мы подсветим опасные блюда в меню
          </p>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {allergens.map(a => (
              <button key={a.id} onClick={() => toggleAllergen(a.id)}
                className="flex items-center gap-3 p-4 rounded-[14px] border transition-all cursor-pointer text-left"
                style={{
                  background: userAllergenIds.has(a.id) ? 'rgba(239,68,68,0.1)' : 'var(--bg3)',
                  borderColor: userAllergenIds.has(a.id) ? 'rgba(239,68,68,0.4)' : 'var(--card-border)',
                }}>
                <span className="text-[22px]">{a.icon}</span>
                <span className="text-[14px] font-medium" style={{ color: userAllergenIds.has(a.id) ? '#ef4444' : 'var(--text2)' }}>
                  {a.name}
                </span>
                {userAllergenIds.has(a.id) && <span className="ml-auto text-[11px] text-red-400 font-semibold">Опасно</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
