'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { userApi, referenceApi, bookingApi, ownerApi, photoApi } from '@/lib/api';
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

interface MyRestaurant {
  id: number; name: string; slug: string; description?: string;
  phone?: string; website?: string; hasWifi?: boolean; hasDelivery?: boolean;
  averageBill?: number; rating?: number; reviewCount?: number;
  photos?: Array<{ id: number; url: string; isCover: boolean }>;
  cuisines?: Array<{ name: string }>;
  city?: { name: string };
  address?: string;
}

interface Post {
  id: number; title: string; body: string; category: string;
  status: string; createdAt: string; publishedAt?: string;
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

type GuestTab = 'info' | 'bookings' | 'history' | 'favorites' | 'allergens';
type OwnerTab = 'dashboard' | 'edit' | 'photos' | 'posts' | 'analytics' | 'bookings' | 'reviews';

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { user, isLoggedIn, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Determine role
  const [isOwner, setIsOwner] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const tabParam = searchParams.get('tab');
  const [guestTab, setGuestTab] = useState<GuestTab>('info');
  const initialOwnerTab: OwnerTab =
    (tabParam === 'edit' || tabParam === 'photos' || tabParam === 'posts' || tabParam === 'analytics' || tabParam === 'bookings' || tabParam === 'reviews')
      ? tabParam as OwnerTab : 'dashboard';
  const [ownerTab, setOwnerTab] = useState<OwnerTab>(initialOwnerTab);

  // Sync ownerTab when URL changes (header nav clicks)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'edit' || t === 'photos' || t === 'posts' || t === 'analytics' || t === 'bookings' || t === 'reviews') {
      setOwnerTab(t as OwnerTab);
    } else if (!t) {
      setOwnerTab('dashboard');
    }
  }, [searchParams]);

  // Guest state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [userAllergenIds, setUserAllergenIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Owner state
  const [myRestaurant, setMyRestaurant] = useState<MyRestaurant | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [restLoading, setRestLoading] = useState(false);
  const [restEditMode, setRestEditMode] = useState(false);
  const [restForm, setRestForm] = useState({ description: '', phone: '', website: '' });
  const [postForm, setPostForm] = useState({ title: '', body: '', category: 'promos' });
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load role + restaurant on mount
  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return; }
    setNameInput(user?.name || '');

    // Fetch fresh user data to get role
    userApi.getMe().then(r => {
      const role = r.data?.role;
      if (role && role !== user?.role) updateUser({ role });
      const ownerRole = role === 'owner' || role === 'admin';
      setIsOwner(ownerRole);
      setRoleLoaded(true);

      // If owner, immediately load restaurant
      if (ownerRole) {
        setRestLoading(true);
        Promise.all([
          ownerApi.getMyRestaurant().catch(() => ({ data: null })),
          ownerApi.getPosts().catch(() => ({ data: [] })),
        ]).then(([rRes, pRes]) => {
          const r = rRes.data;
          setMyRestaurant(r);
          setPosts(pRes.data || []);
          if (r) setRestForm({ description: r.description || '', phone: r.phone || '', website: r.website || '' });
        }).finally(() => setRestLoading(false));
      }
    }).catch(() => {
      setIsOwner(user?.role === 'owner' || user?.role === 'admin');
      setRoleLoaded(true);
    });
  }, [isLoggedIn, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guest tab data loading
  useEffect(() => {
    if (!isLoggedIn || isOwner) return;
    if (guestTab === 'bookings' || guestTab === 'history') {
      bookingApi.getMyBookings().then(r => setBookings(r.data.items || [])).catch(() => {});
    } else if (guestTab === 'favorites') {
      userApi.getFavorites().then(r => setFavorites(r.data || [])).catch(() => {});
    } else if (guestTab === 'allergens') {
      referenceApi.getAllergens().then(r => setAllergens(r.data || [])).catch(() => {});
      const ids = user?.allergenProfile?.map(a => a.id) || [];
      setUserAllergenIds(new Set(ids));
    }
  }, [guestTab, isLoggedIn, isOwner, user?.allergenProfile]);

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

  if (!user || !roleLoaded) return null;

  const level = LEVEL_INFO[user.loyaltyLevel] || LEVEL_INFO.bronze;

  // ═══════════════════════════════════════════════
  //  OWNER PROFILE — Restaurant Dashboard
  // ═══════════════════════════════════════════════
  if (isOwner) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        {/* Owner Header */}
        {restLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !myRestaurant ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h1 className="font-serif text-[28px] font-bold text-[var(--text)] mb-2">Ресторан не привязан</h1>
            <p className="text-[14px] text-[var(--text3)]">Свяжитесь с поддержкой для привязки вашего ресторана</p>
            <button onClick={handleLogout}
              className="mt-6 px-5 py-2.5 rounded-full text-[12px] font-semibold text-red-400 border cursor-pointer"
              style={{ background: 'var(--glass)', borderColor: 'rgba(239,68,68,0.3)' }}>
              Выйти
            </button>
          </div>
        ) : (
          <>
            {/* Restaurant identity header */}
            <div className="flex items-center gap-6 mb-10">
              <div className="w-[80px] h-[80px] rounded-[20px] flex items-center justify-center text-[36px] flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
                <span style={{ filter: 'brightness(10)' }}>🍽️</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-[32px] font-black text-[var(--text)] truncate leading-tight">{myRestaurant.name}</h1>
                <div className="flex items-center gap-4 mt-1.5 text-[13px] text-[var(--text3)]">
                  {myRestaurant.city && <span>📍 {myRestaurant.city.name}{myRestaurant.address ? `, ${myRestaurant.address}` : ''}</span>}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {myRestaurant.cuisines?.length ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                      {myRestaurant.cuisines.map(c => c.name).join(' · ')}
                    </span>
                  ) : null}
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--gold)' }}>
                    ⭐ {Number(myRestaurant.rating || 0).toFixed(1)}
                  </span>
                  <span className="text-[12px] text-[var(--text3)]">{myRestaurant.reviewCount || 0} отзывов</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                <a href={`/restaurants/${myRestaurant.slug}`}
                  className="px-4 py-2 rounded-full text-[12px] font-semibold no-underline transition-all"
                  style={{ color: 'var(--accent)', background: 'rgba(255,92,40,0.08)', border: '1px solid rgba(255,92,40,0.2)' }}>
                  Открыть карточку →
                </a>
                <button onClick={handleLogout}
                  className="px-4 py-2 rounded-full text-[11px] font-semibold text-red-400 border cursor-pointer"
                  style={{ background: 'transparent', borderColor: 'rgba(239,68,68,0.2)' }}>
                  Выйти
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Рейтинг', value: Number(myRestaurant.rating || 0).toFixed(1), icon: '⭐' },
                { label: 'Отзывы', value: String(myRestaurant.reviewCount || 0), icon: '💬' },
                { label: 'Фото', value: String(myRestaurant.photos?.length || 0), icon: '📸' },
                { label: 'Средний чек', value: myRestaurant.averageBill ? `${myRestaurant.averageBill} ₽` : '—', icon: '💰' },
              ].map(s => (
                <div key={s.label} className="rounded-[16px] border p-4 text-center"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div className="text-[24px] mb-1">{s.icon}</div>
                  <div className="text-[18px] font-bold text-[var(--text)]">{s.value}</div>
                  <div className="text-[11px] text-[var(--text3)] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Owner tabs */}
            <div className="flex gap-1 mb-8 p-1 rounded-[14px] overflow-x-auto" style={{ background: 'var(--bg3)' }}>
              {([
                ['dashboard', '📊 Обзор'],
                ['edit', '✏️ Карточка'],
                ['photos', '📸 Фото'],
                ['posts', '📝 Публикации'],
                ['analytics', '📈 Аналитика'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setOwnerTab(key)}
                  className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
                  style={{
                    background: ownerTab === key ? 'var(--accent)' : 'transparent',
                    color: ownerTab === key ? '#fff' : 'var(--text3)',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ─── Dashboard tab ─── */}
            {ownerTab === 'dashboard' && (
              <div className="space-y-5">
                <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <h3 className="text-[16px] font-semibold text-[var(--text)] mb-4">Информация о ресторане</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                      <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Описание</div>
                      <p className="text-[13px] text-[var(--text2)] leading-relaxed">{myRestaurant.description || '—'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Телефон</div>
                        <div className="text-[13px] text-[var(--text)]">{myRestaurant.phone || '—'}</div>
                      </div>
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Сайт</div>
                        <div className="text-[13px] text-[var(--text)] truncate">{myRestaurant.website || '—'}</div>
                      </div>
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Wi-Fi / Доставка</div>
                        <div className="text-[13px] text-[var(--text)]">
                          {myRestaurant.hasWifi ? '✅ Wi-Fi' : '—'}{myRestaurant.hasDelivery ? ' · 🚚 Доставка' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent posts preview */}
                <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold text-[var(--text)]">Последние публикации</h3>
                    <button onClick={() => setOwnerTab('posts')}
                      className="text-[12px] text-[var(--accent)] cursor-pointer bg-transparent border-none">
                      Все публикации →
                    </button>
                  </div>
                  {posts.length === 0 ? (
                    <p className="text-[13px] text-[var(--text3)] py-4">Нет публикаций. Создайте первую акцию или новость!</p>
                  ) : (
                    <div className="space-y-2">
                      {posts.slice(0, 3).map(p => {
                        const catInfo: Record<string, { icon: string; color: string }> = {
                          promos: { icon: '🏷️', color: 'var(--accent)' },
                          events: { icon: '🎭', color: 'var(--teal)' },
                          news: { icon: '📰', color: '#a78bfa' },
                        };
                        const cat = catInfo[p.category] || catInfo.news;
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                            <span className="text-[16px]">{cat.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-[var(--text)] truncate">{p.title}</div>
                              <div className="text-[11px] text-[var(--text4)]">
                                {new Date(p.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Edit tab ─── */}
            {ownerTab === 'edit' && (
              <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">Редактирование карточки</h3>
                  {!restEditMode ? (
                    <button onClick={() => setRestEditMode(true)}
                      className="px-4 py-2 rounded-full text-[12px] font-semibold border cursor-pointer transition-all"
                      style={{ color: 'var(--accent)', borderColor: 'rgba(255,92,40,0.25)', background: 'rgba(255,92,40,0.06)' }}>
                      ✏️ Редактировать
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await ownerApi.updateMyRestaurant(restForm);
                            setMyRestaurant(prev => prev ? { ...prev, ...restForm } : prev);
                            setRestEditMode(false);
                            toast('Карточка обновлена', 'success');
                          } catch { toast('Ошибка сохранения', 'error'); }
                          setLoading(false);
                        }}
                        disabled={loading}
                        className="px-4 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
                        style={{ background: 'var(--accent)' }}>
                        {loading ? '...' : 'Сохранить'}
                      </button>
                      <button onClick={() => { setRestEditMode(false); setRestForm({ description: myRestaurant.description || '', phone: myRestaurant.phone || '', website: myRestaurant.website || '' }); }}
                        className="px-3 py-2 rounded-full text-[12px] text-[var(--text3)] cursor-pointer border"
                        style={{ background: 'var(--glass)', borderColor: 'var(--glass-border)' }}>
                        Отмена
                      </button>
                    </div>
                  )}
                </div>

                {restEditMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--text3)] block mb-1.5">Описание</label>
                      <textarea
                        value={restForm.description}
                        onChange={e => setRestForm({ ...restForm, description: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none resize-none font-sans"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--text3)] block mb-1.5">Телефон</label>
                        <input
                          value={restForm.phone}
                          onChange={e => setRestForm({ ...restForm, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none font-sans"
                          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--text3)] block mb-1.5">Сайт</label>
                        <input
                          value={restForm.website}
                          onChange={e => setRestForm({ ...restForm, website: e.target.value })}
                          className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none font-sans"
                          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                      <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Описание</div>
                      <p className="text-[13px] text-[var(--text2)] leading-relaxed">{myRestaurant.description || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Телефон</div>
                        <div className="text-[13px] text-[var(--text)]">{myRestaurant.phone || '—'}</div>
                      </div>
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Сайт</div>
                        <div className="text-[13px] text-[var(--text)]">{myRestaurant.website || '—'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Средний чек</div>
                        <div className="text-[13px] text-[var(--text)]">{myRestaurant.averageBill ? `${myRestaurant.averageBill} ₽` : '—'}</div>
                      </div>
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Адрес</div>
                        <div className="text-[13px] text-[var(--text)] truncate">{myRestaurant.address || '—'}</div>
                      </div>
                      <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg3)' }}>
                        <div className="text-[11px] text-[var(--text3)] font-semibold mb-1">Фото</div>
                        <div className="text-[13px] text-[var(--text)]">{myRestaurant.photos?.length || 0} шт.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Photos tab ─── */}
            {ownerTab === 'photos' && (
              <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">Фотографии ресторана</h3>
                  <label className="px-4 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
                    style={{ background: 'var(--accent)' }}>
                    {uploadingPhoto ? 'Загрузка...' : '+ Загрузить фото'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !myRestaurant) return;
                        setUploadingPhoto(true);
                        try {
                          const res = await photoApi.upload(myRestaurant.id, file);
                          setMyRestaurant(prev => prev ? {
                            ...prev,
                            photos: [...(prev.photos || []), res.data],
                          } : prev);
                          toast('Фото загружено', 'success');
                        } catch { toast('Ошибка загрузки', 'error'); }
                        setUploadingPhoto(false);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {!myRestaurant?.photos?.length ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">📸</div>
                    <p className="text-[14px] text-[var(--text3)]">Нет фотографий</p>
                    <p className="text-[12px] text-[var(--text4)] mt-1">Загрузите фото вашего ресторана</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
                    {myRestaurant.photos.map(photo => (
                      <div key={photo.id} className="relative group rounded-[14px] overflow-hidden border aspect-[4/3]"
                        style={{ borderColor: photo.isCover ? 'var(--accent)' : 'var(--card-border)' }}>
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        {photo.isCover && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                            style={{ background: 'var(--accent)' }}>
                            Обложка
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!photo.isCover && (
                            <button
                              onClick={async () => {
                                try {
                                  await photoApi.setCover(myRestaurant!.id, photo.id);
                                  setMyRestaurant(prev => prev ? {
                                    ...prev,
                                    photos: prev.photos?.map(p => ({ ...p, isCover: p.id === photo.id })),
                                  } : prev);
                                  toast('Обложка обновлена', 'success');
                                } catch { toast('Ошибка', 'error'); }
                              }}
                              className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white border border-white/30 cursor-pointer"
                              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                              Сделать обложкой
                            </button>
                          )}
                          <button
                            onClick={() => setDeletePhotoId(photo.id)}
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-red-300 border border-red-400/30 cursor-pointer"
                            style={{ background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(4px)' }}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Delete photo confirmation modal ─── */}
            {deletePhotoId !== null && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center"
                onClick={() => !deleting && setDeletePhotoId(null)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative rounded-[20px] border p-6 w-[380px] max-w-[90vw] text-center"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                  onClick={e => e.stopPropagation()}>
                  <div className="text-[40px] mb-3">🗑️</div>
                  <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">Удалить фотографию?</h3>
                  <p className="text-[13px] text-[var(--text3)] mb-6">Это действие нельзя отменить. Фото будет удалено навсегда.</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDeletePhotoId(null)}
                      disabled={deleting}
                      className="px-5 py-2.5 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
                      style={{ color: 'var(--text2)', borderColor: 'var(--card-border)', background: 'var(--bg3)' }}>
                      Отмена
                    </button>
                    <button
                      onClick={async () => {
                        if (!myRestaurant) return;
                        setDeleting(true);
                        try {
                          await photoApi.delete(myRestaurant.id, deletePhotoId);
                          setMyRestaurant(prev => prev ? {
                            ...prev,
                            photos: prev.photos?.filter(p => p.id !== deletePhotoId),
                          } : prev);
                          toast('Фото удалено', 'success');
                        } catch { toast('Ошибка удаления', 'error'); }
                        setDeleting(false);
                        setDeletePhotoId(null);
                      }}
                      disabled={deleting}
                      className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: '#ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                      {deleting ? 'Удаление...' : 'Да, удалить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Posts tab ─── */}
            {ownerTab === 'posts' && (
              <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">Акции, афиши и новости</h3>
                  <button onClick={() => setShowPostForm(!showPostForm)}
                    className="px-4 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
                    style={{ background: 'var(--accent)' }}>
                    {showPostForm ? 'Отмена' : '+ Новая публикация'}
                  </button>
                </div>

                {showPostForm && (
                  <div className="rounded-[16px] border p-5 mb-5" style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
                    <div className="flex gap-2 mb-4">
                      {[
                        { value: 'promos', label: '🏷️ Акция', color: 'var(--accent)' },
                        { value: 'events', label: '🎭 Афиша', color: 'var(--teal)' },
                        { value: 'news', label: '📰 Новость', color: '#a78bfa' },
                      ].map(c => (
                        <button key={c.value}
                          onClick={() => setPostForm({ ...postForm, category: c.value })}
                          className="px-3.5 py-2 rounded-full text-[12px] font-semibold border cursor-pointer transition-all"
                          style={{
                            background: postForm.category === c.value ? c.color : 'transparent',
                            color: postForm.category === c.value ? '#fff' : 'var(--text3)',
                            borderColor: postForm.category === c.value ? c.color : 'var(--card-border)',
                          }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={postForm.title}
                      onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                      placeholder="Заголовок"
                      className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none mb-3 font-sans"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
                    />
                    <textarea
                      value={postForm.body}
                      onChange={e => setPostForm({ ...postForm, body: e.target.value })}
                      placeholder="Текст публикации..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none resize-none mb-3 font-sans"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
                    />
                    {/* Post image */}
                    <div className="flex items-center gap-3 mb-3">
                      <label className="px-3.5 py-2 rounded-full text-[12px] font-semibold border cursor-pointer transition-all flex items-center gap-1.5"
                        style={{ color: 'var(--text3)', borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                        📷 Добавить фото
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPostImage(file);
                              setPostImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      {postImagePreview && (
                        <div className="relative">
                          <img src={postImagePreview} alt="" className="h-[48px] w-[48px] rounded-[8px] object-cover" />
                          <button onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white border-none cursor-pointer"
                            style={{ background: 'rgba(239,68,68,0.8)' }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (!postForm.title.trim() || !postForm.body.trim()) return;
                        setLoading(true);
                        try {
                          // Upload image first if present
                          let imageUrl: string | undefined;
                          if (postImage && myRestaurant) {
                            const photoRes = await photoApi.upload(myRestaurant.id, postImage);
                            imageUrl = photoRes.data?.url;
                          }
                          const res = await ownerApi.createPost({
                            ...postForm,
                            ...(imageUrl ? { coverUrl: imageUrl } : {}),
                          } as typeof postForm);
                          setPosts(prev => [res.data, ...prev]);
                          setPostForm({ title: '', body: '', category: 'promos' });
                          setPostImage(null);
                          setPostImagePreview(null);
                          setShowPostForm(false);
                          toast('Публикация создана', 'success');
                        } catch { toast('Ошибка создания', 'error'); }
                        setLoading(false);
                      }}
                      disabled={loading || !postForm.title.trim()}
                      className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}>
                      {loading ? 'Публикуем...' : 'Опубликовать'}
                    </button>
                  </div>
                )}

                {posts.length === 0 && !showPostForm ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">📝</div>
                    <p className="text-[14px] text-[var(--text3)]">Нет публикаций</p>
                    <p className="text-[12px] text-[var(--text4)] mt-1">
                      Создайте первую акцию, афишу или новость для привлечения гостей
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map(p => {
                      const catInfo: Record<string, { icon: string; label: string; color: string }> = {
                        promos: { icon: '🏷️', label: 'Акция', color: 'var(--accent)' },
                        events: { icon: '🎭', label: 'Афиша', color: 'var(--teal)' },
                        news: { icon: '📰', label: 'Новость', color: '#a78bfa' },
                      };
                      const cat = catInfo[p.category] || catInfo.news;
                      return (
                        <div key={p.id} className="rounded-[14px] border p-4" style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{ background: `${cat.color}18`, color: cat.color }}>
                              {cat.icon} {cat.label}
                            </span>
                            <span className="text-[11px] text-[var(--text4)]">
                              {new Date(p.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="text-[14px] font-semibold text-[var(--text)] mb-1">{p.title}</h4>
                          <p className="text-[13px] text-[var(--text3)] leading-relaxed line-clamp-3">{p.body}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── Analytics tab ─── */}
            {ownerTab === 'analytics' && (
              <div className="space-y-6 relative">
                {/* Partner badge info */}
                <div className="rounded-[20px] border p-5 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05))', borderColor: 'rgba(139,92,246,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                      👑
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--text)]">Аналитика и отчёты</div>
                      <div className="text-[12px] text-[var(--text3)]">Подробная статистика вашего ресторана</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                    Демо-режим
                  </span>
                </div>

                {/* Blurred data section */}
                <div className="relative">
                {/* Blur overlay */}
                <div className="absolute inset-0 z-20 rounded-[20px] pointer-events-none" style={{ backdropFilter: 'blur(2.5px)', WebkitBackdropFilter: 'blur(2.5px)' }} />
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div className="px-5 py-3 rounded-[16px] flex items-center gap-2.5"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    <span className="text-[18px]">🔒</span>
                    <span className="text-[13px] font-semibold text-white/90">Доступно с подпиской «Партнёр»</span>
                  </div>
                </div>

                {/* Row 1: Key metrics */}
                <div className="grid grid-cols-4 gap-4 max-sm:grid-cols-2">
                  {[
                    { label: 'Просмотры карточки', value: '2,847', change: '+12.3%', up: true, icon: '👁️' },
                    { label: 'CTR карточки', value: '4.2%', change: '+0.8%', up: true, icon: '🖱️' },
                    { label: 'Конверсия в бронь', value: '1.8%', change: '-0.2%', up: false, icon: '📅' },
                    { label: 'Средняя оценка', value: Number(myRestaurant?.rating || 4.6).toFixed(1), change: '+0.1', up: true, icon: '⭐' },
                  ].map(m => (
                    <div key={m.label} className="rounded-[16px] border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[20px]">{m.icon}</span>
                        <span className="text-[11px] font-semibold" style={{ color: m.up ? '#34d399' : '#f87171' }}>
                          {m.up ? '↑' : '↓'} {m.change}
                        </span>
                      </div>
                      <div className="text-[22px] font-bold text-[var(--text)]">{m.value}</div>
                      <div className="text-[11px] text-[var(--text3)] mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Row 2: Traffic chart + Sources */}
                <div className="grid grid-cols-5 gap-4">
                  {/* Traffic chart — 3 cols */}
                  <div className="col-span-3 rounded-[20px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-semibold text-[var(--text)]">Просмотры за 30 дней</h3>
                      <div className="flex gap-1">
                        {['7д', '30д', '90д'].map(p => (
                          <button key={p} className="px-2.5 py-1 rounded-full text-[10px] font-semibold border-none cursor-pointer"
                            style={{ background: p === '30д' ? 'var(--accent)' : 'var(--bg3)', color: p === '30д' ? '#fff' : 'var(--text3)' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* CSS bar chart */}
                    <div className="flex items-end gap-[3px] h-[140px]">
                      {[35,42,38,55,68,62,75,82,70,65,90,85,78,92,88,72,68,95,88,82,76,98,92,85,90,105,95,88,82,78].map((v, i) => (
                        <div key={i} className="flex-1 rounded-t-[3px] transition-all duration-300 group/bar relative"
                          style={{
                            height: `${(v / 105) * 100}%`,
                            background: i >= 27 ? 'linear-gradient(180deg, var(--accent), rgba(255,92,40,0.4))' : 'linear-gradient(180deg, rgba(139,92,246,0.7), rgba(139,92,246,0.2))',
                          }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
                            style={{ background: 'rgba(0,0,0,0.8)' }}>
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-[var(--text4)]">
                      <span>1 мар</span><span>10 мар</span><span>20 мар</span><span>30 мар</span>
                    </div>
                  </div>

                  {/* Sources — 2 cols */}
                  <div className="col-span-2 rounded-[20px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                    <h3 className="text-[15px] font-semibold text-[var(--text)] mb-4">Источники трафика</h3>
                    <div className="space-y-3">
                      {[
                        { source: 'Поиск на сайте', pct: 42, color: '#8b5cf6' },
                        { source: 'Прямые переходы', pct: 28, color: 'var(--accent)' },
                        { source: 'Яндекс / Google', pct: 18, color: '#3b82f6' },
                        { source: 'Соцсети', pct: 8, color: '#34d399' },
                        { source: 'Другое', pct: 4, color: '#6b7280' },
                      ].map(s => (
                        <div key={s.source}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] text-[var(--text2)]">{s.source}</span>
                            <span className="text-[12px] font-semibold text-[var(--text)]">{s.pct}%</span>
                          </div>
                          <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3: Heatmap + Conversion funnel */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Heatmap */}
                  <div className="rounded-[20px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                    <h3 className="text-[15px] font-semibold text-[var(--text)] mb-3">Тепловая карта просмотров</h3>
                    <p className="text-[11px] text-[var(--text3)] mb-3">Активность по дням и часам</p>
                    <div className="space-y-[3px]">
                      {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day, di) => (
                        <div key={day} className="flex items-center gap-[3px]">
                          <span className="text-[10px] text-[var(--text4)] w-5">{day}</span>
                          {Array.from({ length: 12 }).map((_, hi) => {
                            const intensity = [
                              [1,1,2,3,4,5,6,5,7,8,6,3],
                              [1,1,2,3,5,6,5,4,6,7,5,2],
                              [1,2,3,4,6,7,6,5,8,9,7,4],
                              [1,1,2,4,5,8,7,6,9,10,8,5],
                              [2,2,3,5,7,9,8,7,10,10,9,6],
                              [3,3,4,6,8,10,9,8,10,9,7,5],
                              [2,2,3,5,6,8,7,6,8,7,5,3],
                            ][di][hi];
                            return (
                              <div key={hi} className="flex-1 h-[18px] rounded-[3px] transition-all"
                                style={{
                                  background: `rgba(139,92,246,${intensity / 12})`,
                                  border: '1px solid rgba(139,92,246,0.05)',
                                }}
                                title={`${day} ${8 + hi}:00–${9 + hi}:00: ${intensity * 12} просмотров`}
                              />
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-[3px] mt-1">
                        <span className="w-5" />
                        {['8','10','12','14','16','18','20'].map((h, i) => (
                          <span key={h} className="text-[9px] text-[var(--text4)]" style={{ flex: i === 0 ? '1' : '2', textAlign: 'center' }}>{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Conversion funnel */}
                  <div className="rounded-[20px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                    <h3 className="text-[15px] font-semibold text-[var(--text)] mb-4">Воронка конверсии</h3>
                    <div className="space-y-3">
                      {[
                        { step: 'Увидели в каталоге', value: 12420, pct: 100, color: '#8b5cf6' },
                        { step: 'Открыли карточку', value: 2847, pct: 23, color: '#6366f1' },
                        { step: 'Смотрели меню', value: 1284, pct: 10, color: '#3b82f6' },
                        { step: 'Нажали «Забронировать»', value: 342, pct: 2.8, color: 'var(--accent)' },
                        { step: 'Завершили бронь', value: 156, pct: 1.3, color: '#34d399' },
                      ].map((f, i) => (
                        <div key={f.step}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] text-[var(--text2)]">{f.step}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-bold text-[var(--text)]">{f.value.toLocaleString()}</span>
                              <span className="text-[10px] text-[var(--text4)]">{f.pct}%</span>
                            </div>
                          </div>
                          <div className="h-[24px] rounded-[6px] overflow-hidden relative" style={{ background: 'var(--bg3)' }}>
                            <div className="h-full rounded-[6px] transition-all duration-700 flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(f.pct, 5)}%`, background: `linear-gradient(90deg, ${f.color}88, ${f.color})` }}>
                              {f.pct > 15 && <span className="text-[10px] font-bold text-white/80">{f.pct}%</span>}
                            </div>
                          </div>
                          {i < 4 && (
                            <div className="flex justify-center my-0.5">
                              <svg width="12" height="8" viewBox="0 0 12 8" className="opacity-20">
                                <path d="M6 8L0 0h12z" fill="currentColor" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                </div>{/* end blurred data section */}

                {/* PDF Export — locked */}
                <div className="rounded-[20px] border p-6 text-center relative overflow-hidden"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-[28px]">📄</span>
                    <h3 className="text-[16px] font-semibold text-[var(--text)]">Экспорт отчёта в PDF</h3>
                  </div>
                  <p className="text-[13px] text-[var(--text3)] mb-5 max-w-[500px] mx-auto">
                    Скачайте полный отчёт с графиками, статистикой и рекомендациями по улучшению видимости вашего ресторана
                  </p>
                  <button disabled
                    className="px-6 py-3 rounded-full text-[13px] font-semibold text-white/50 border-none cursor-not-allowed"
                    style={{ background: 'rgba(139,92,246,0.2)' }}>
                    🔒 Скачать PDF-отчёт
                  </button>
                </div>

                {/* Subscription lock overlay */}
                <div className="rounded-[24px] border-2 p-8 text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04), rgba(45,212,191,0.03))',
                    borderColor: 'rgba(139,92,246,0.25)',
                    borderStyle: 'dashed',
                  }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6, #14b8a6, #8b5cf6)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                    👑 Подписка «Партнёр»
                  </span>
                  <h3 className="text-[20px] font-bold text-[var(--text)] mb-2">Разблокируйте полную аналитику</h3>
                  <p className="text-[13px] text-[var(--text3)] mb-5 max-w-[480px] mx-auto leading-relaxed">
                    Данные выше — демонстрационные. С подпиской «Партнёр» вы получите реальную статистику,
                    расширенные отчёты, экспорт в PDF и персональные рекомендации по росту.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mb-6 text-[12px] text-[var(--text2)]">
                    {['Реальные данные', 'Экспорт в PDF', 'AI-рекомендации', 'Еженедельные отчёты'].map(f => (
                      <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--bg3)', border: '1px solid var(--card-border)' }}>
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                  <button
                    className="px-8 py-3.5 rounded-full text-[14px] font-bold text-white border-none cursor-pointer transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
                      boxShadow: '0 4px 24px rgba(139,92,246,0.4), 0 0 0 1px rgba(139,92,246,0.2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(139,92,246,0.5), 0 0 0 1px rgba(139,92,246,0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(139,92,246,0.4), 0 0 0 1px rgba(139,92,246,0.2)';
                    }}>
                    Подключить «Партнёр» — <s className="opacity-50">6 900 ₽</s> 3 450 ₽/мес
                  </button>
                  <p className="text-[11px] text-[var(--text4)] mt-3">Первый месяц — 3 450 ₽ (скидка 50%). Далее 6 900 ₽/мес. Отмена в любой момент.</p>
                </div>

                <style jsx>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  GUEST PROFILE — Standard user
  // ═══════════════════════════════════════════════
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
          <button key={key} onClick={() => setGuestTab(key)}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
            style={{
              background: guestTab === key ? 'var(--accent)' : 'transparent',
              color: guestTab === key ? '#fff' : 'var(--text3)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {guestTab === 'info' && (
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

      {guestTab === 'bookings' && (
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

      {guestTab === 'history' && (
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

      {guestTab === 'favorites' && (
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

      {guestTab === 'allergens' && (
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
