'use client';

import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { userApi, referenceApi, bookingApi, ownerApi, photoApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ReferralModal } from '@/components/ui/ReferralModal';

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

/* ─── Collapsible section ─── */
function CollapsibleSection({ icon, gradient, title, subtitle, badge, badgeColor, borderColor, bgGradient, children }: {
  icon: string; gradient: string; title: string; subtitle: string;
  badge?: string; badgeColor?: string; borderColor: string; bgGradient: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[20px] border mb-4 relative overflow-hidden transition-all"
      style={{ background: bgGradient, borderColor }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 cursor-pointer border-none text-left transition-all"
        style={{ background: 'transparent' }}>
        <span className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
          style={{ background: gradient, boxShadow: `0 4px 16px ${badgeColor || borderColor}44` }}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-bold text-[var(--text)]">{title}</h2>
          <p className="text-[12px] text-[var(--text3)]">{subtitle}</p>
        </div>
        {badge && (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold shrink-0"
            style={{ background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}40` }}>
            {badge}
          </span>
        )}
        <span className="text-[14px] text-[var(--text3)] shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transitionDuration: '200ms' }}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 animate-fade-up">
          {children}
        </div>
      )}
    </div>
  );
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

type GuestTab = 'info' | 'bookings' | 'history' | 'favorites' | 'wishlist' | 'settings';
type OwnerTab = 'dashboard' | 'edit' | 'photos' | 'posts' | 'analytics' | 'bookings' | 'reviews';

const NUTRITION_GOALS = [
  { value: 'lose_weight', label: 'Похудеть', icon: '🔥', color: '#ef4444', desc: 'Низкокалорийные блюда, салаты, рыба' },
  { value: 'gain_muscle', label: 'Набрать массу', icon: '💪', color: '#3b82f6', desc: 'Высокобелковые блюда, мясо, гарниры' },
  { value: 'maintain', label: 'Поддерживать форму', icon: '⚖️', color: '#34d399', desc: 'Сбалансированное питание, умеренные порции' },
  { value: 'healthy', label: 'Правильное питание', icon: '🥦', color: '#22c55e', desc: 'Без сахара и фастфуда, натуральное' },
  { value: 'no_limit', label: 'Без ограничений', icon: '🍕', color: 'var(--text3)', desc: 'Ем что хочу, рекомендации не нужны' },
] as const;

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { user, isLoggedIn, logout, updateUser, _hydrated } = useAuthStore();
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
  const [wishlist, setWishlist] = useState<FavoriteRestaurant[]>([]);
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
  const [showReferral, setShowReferral] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load role + restaurant on mount
  useEffect(() => {
    if (!_hydrated) return; // ждём загрузки store из localStorage
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
  }, [isLoggedIn, _hydrated, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load allergens & nutrition goal on mount (for prominent sections)
  useEffect(() => {
    if (!isLoggedIn || isOwner) return;
    referenceApi.getAllergens().then(r => setAllergens(r.data || [])).catch(() => {});
    const ids = user?.allergenProfile?.map(a => a.id) || [];
    setUserAllergenIds(new Set(ids));
  }, [isLoggedIn, isOwner, user?.allergenProfile]);

  // Guest tab data loading
  useEffect(() => {
    if (!isLoggedIn || isOwner) return;
    if (guestTab === 'bookings' || guestTab === 'history') {
      bookingApi.getMyBookings().then(r => setBookings(r.data.items || [])).catch(() => {});
    } else if (guestTab === 'favorites') {
      userApi.getFavorites().then(r => setFavorites(r.data || [])).catch(() => {});
    } else if (guestTab === 'wishlist') {
      userApi.getWishlist().then(r => setWishlist(r.data || [])).catch(() => {});
    }
  }, [guestTab, isLoggedIn, isOwner]);

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

  const handleNutritionGoal = async (goal: string) => {
    const newGoal = user?.nutritionGoal === goal ? undefined : goal;
    updateUser({ nutritionGoal: newGoal || undefined });
    try {
      await userApi.updateMe({ nutritionGoal: newGoal || null });
    } catch {
      // Column may not exist yet in DB — save locally only, no error shown
    }
  };

  // ─── Profile extended fields ──────────────────
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [ageInput, setAgeInput] = useState(user?.age ? String(user.age) : '');
  const [cityNameInput, setCityNameInput] = useState(user?.cityName || '');
  const [favCuisinesInput, setFavCuisinesInput] = useState(user?.favoriteCuisines || '');
  const [favDishesInput, setFavDishesInput] = useState(user?.favoriteDishes || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const data: Record<string, unknown> = {
      bio: bioInput.trim() || null,
      age: ageInput ? Number(ageInput) : null,
      cityName: cityNameInput.trim() || null,
      favoriteCuisines: favCuisinesInput.trim() || null,
      favoriteDishes: favDishesInput.trim() || null,
    };
    try {
      await userApi.updateMe(data);
      updateUser({
        bio: data.bio as string,
        age: data.age as number,
        cityName: data.cityName as string,
        favoriteCuisines: data.favoriteCuisines as string,
        favoriteDishes: data.favoriteDishes as string,
      });
      toast('Профиль обновлён', 'success');
    } catch { toast('Не удалось сохранить', 'error'); }
    setProfileSaving(false);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  if (!user || !roleLoaded) return null;

  const level = LEVEL_INFO[user.loyaltyLevel] || LEVEL_INFO.bronze;

  // Owner → redirect to /owner panel
  if (isOwner) {
    router.push('/owner');
    return null;
  }

  /* legacy owner block removed — now at /owner/ */
  if (false as boolean) {
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

                {/* Demo data notice */}
                <div className="rounded-[14px] border px-4 py-3 flex items-center gap-3"
                  style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <span className="text-[18px]">⚠️</span>
                  <p className="text-[13px] text-[var(--text2)] flex-1">
                    <span className="font-semibold">Демо-режим.</span> Цифры ниже показаны для примера. Реальная аналитика подключается автоматически по мере накопления данных.
                  </p>
                </div>

                <div>
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

                </div>{/* end data section */}

                {/* Recommendations based on analytics */}
                <div className="rounded-[20px] border p-6" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(59,130,246,0.04))', borderColor: 'rgba(52,211,153,0.2)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]"
                      style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}>
                      💡
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[var(--text)]">Рекомендации для роста</h3>
                      <p className="text-[11px] text-[var(--text3)]">На основе аналитики вашего ресторана</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        priority: 'high',
                        icon: '📸',
                        title: 'Добавьте больше фото',
                        desc: 'Рестораны с 5+ фотографиями получают на 40% больше просмотров. У вас пока мало фото — загрузите снимки интерьера, блюд и атмосферы.',
                        action: 'Загрузить фото',
                        tab: 'photos',
                      },
                      {
                        priority: 'high',
                        icon: '🍽️',
                        title: 'Обновите меню',
                        desc: 'Карточка с актуальным меню конвертирует в 2.5 раза лучше. Добавьте цены и описания блюд, чтобы гости могли принять решение прямо на сайте.',
                        action: 'Редактировать',
                        tab: 'edit',
                      },
                      {
                        priority: 'medium',
                        icon: '📝',
                        title: 'Публикуйте новости и акции',
                        desc: 'Рестораны с активными публикациями привлекают на 25% больше бронирований. Расскажите о сезонном меню, скидках или мероприятиях.',
                        action: 'Создать пост',
                        tab: 'posts',
                      },
                      {
                        priority: 'medium',
                        icon: '⭐',
                        title: 'Работайте с отзывами',
                        desc: 'Ответы на отзывы повышают лояльность на 30%. Благодарите за позитив и решайте проблемы из негативных — это видят все посетители.',
                        action: 'Отзывы',
                        tab: 'reviews',
                      },
                      {
                        priority: 'low',
                        icon: '📍',
                        title: 'Проверьте контактную информацию',
                        desc: 'Убедитесь, что телефон, адрес и часы работы актуальны. 15% клиентов уходят, если не могут быстро найти контакты.',
                        action: 'Проверить',
                        tab: 'edit',
                      },
                    ].map((rec, i) => (
                      <div key={i} className="flex gap-3 p-4 rounded-[14px] transition-all"
                        style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
                        <span className="text-[24px] shrink-0 mt-0.5">{rec.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-[var(--text)]">{rec.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                background: rec.priority === 'high' ? 'rgba(239,68,68,0.1)' : rec.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                                color: rec.priority === 'high' ? '#f87171' : rec.priority === 'medium' ? '#fbbf24' : '#9ca3af',
                                border: `1px solid ${rec.priority === 'high' ? 'rgba(239,68,68,0.2)' : rec.priority === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.15)'}`,
                              }}>
                              {rec.priority === 'high' ? 'Важно' : rec.priority === 'medium' ? 'Средне' : 'Совет'}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--text3)] leading-relaxed mb-2">{rec.desc}</p>
                          <button onClick={() => setOwnerTab(rec.tab as OwnerTab)}
                            className="text-[11px] font-semibold cursor-pointer border-none bg-transparent transition-all"
                            style={{ color: 'var(--teal)' }}
                            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}>
                            {rec.action} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
        <label className="relative w-[80px] h-[80px] rounded-full flex items-center justify-center text-[36px] cursor-pointer group shrink-0"
          style={{ background: 'var(--bg3)', border: '2px solid var(--card-border)' }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : '👤'}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <span className="text-[18px]">📷</span>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const res = await userApi.uploadAvatar(file);
                const url = res.data?.avatarUrl || res.data?.avatar_url;
                if (url) updateUser({ avatarUrl: url });
                toast('Фото обновлено', 'success');
              } catch {
                toast('Не удалось загрузить фото', 'error');
              }
              e.target.value = '';
            }}
          />
        </label>
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

      {/* Tabs — 5 items */}
      <div className="flex gap-1 mb-8 p-1 rounded-[14px] overflow-x-auto" style={{ background: 'var(--bg3)' }}>
        {([
          ['info', '👤 Профиль'],
          ['bookings', '📅 Брони'],
          ['history', '🕐 История'],
          ['favorites', '❤️ Избранное'],
          ['wishlist', '📌 Хочу сходить'],
          ['settings', '⚙️ Настройки'],
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
        <div className="space-y-5">
          {/* Profile card with banner */}
          <div className="rounded-[20px] border overflow-hidden" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            {/* Gradient banner */}
            <div className="relative h-[100px] overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${level.color}30 0%, rgba(255,92,40,0.15) 50%, rgba(57,255,209,0.1) 100%)` }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl" style={{ background: level.color }} />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--accent)' }} />
              <button onClick={() => setShowProfileModal(true)}
                className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}>
                ✏️ Редактировать
              </button>
            </div>

            {/* Avatar overlap */}
            <div className="px-7 -mt-10 relative z-10">
              <div className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-[32px] overflow-hidden"
                style={{ background: 'var(--bg2)', border: `3px solid ${level.color}`, boxShadow: `0 4px 20px ${level.color}40` }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : '👤'}
              </div>
            </div>

            {/* Content */}
            <div className="px-7 pt-3 pb-6">
              {/* Name + level */}
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-serif text-[22px] font-bold text-[var(--text)]">{user.name || 'Пользователь'}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: `${level.color}20`, color: level.color, border: `1px solid ${level.color}35` }}>
                  {level.icon} {level.label}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-[12px] text-[var(--text3)] mb-4">
                <span>{user.email}</span>
                {user.cityName && <><span style={{ opacity: 0.3 }}>·</span><span>📍 {user.cityName}</span></>}
                {user.age && <><span style={{ opacity: 0.3 }}>·</span><span>{user.age} лет</span></>}
              </div>

              {/* Stats row */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1 p-3 rounded-[12px] text-center" style={{ background: 'var(--bg3)' }}>
                  <div className="text-[18px] font-bold text-[var(--text)]">{user.loyaltyPoints}</div>
                  <div className="text-[10px] text-[var(--text3)] font-semibold mt-0.5">Баллов</div>
                </div>
                <div className="flex-1 p-3 rounded-[12px] text-center" style={{ background: 'var(--bg3)' }}>
                  <div className="text-[18px] font-bold text-[var(--text)]">{bookings.filter(b => b.status === 'completed').length}</div>
                  <div className="text-[10px] text-[var(--text3)] font-semibold mt-0.5">Визитов</div>
                </div>
                <div className="flex-1 p-3 rounded-[12px] text-center" style={{ background: 'var(--bg3)' }}>
                  <div className="text-[18px] font-bold text-[var(--text)]">{favorites.length}</div>
                  <div className="text-[10px] text-[var(--text3)] font-semibold mt-0.5">Избранное</div>
                </div>
                <div className="flex-1 p-3 rounded-[12px] text-center" style={{ background: 'var(--bg3)' }}>
                  <div className="text-[18px] font-bold text-[var(--text)]">{wishlist.length}</div>
                  <div className="text-[10px] text-[var(--text3)] font-semibold mt-0.5">Хочу сходить</div>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-[13px] text-[var(--text2)] leading-relaxed mb-4">{user.bio}</p>
              )}

              {/* Cuisines & Dishes tags */}
              {(user.favoriteCuisines || user.favoriteDishes) && (
                <div className="flex gap-6 flex-wrap">
                  {user.favoriteCuisines && (
                    <div>
                      <div className="text-[10px] text-[var(--text3)] font-semibold mb-1.5 uppercase tracking-wider">Любимые кухни</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {user.favoriteCuisines.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                          <span key={c} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: 'rgba(255,92,40,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.15)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {user.favoriteDishes && (
                    <div>
                      <div className="text-[10px] text-[var(--text3)] font-semibold mb-1.5 uppercase tracking-wider">Любимые блюда</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {user.favoriteDishes.split(',').map(d => d.trim()).filter(Boolean).map(d => (
                          <span key={d} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: 'rgba(20,184,166,0.08)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.15)' }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CTA if empty */}
              {!user.bio && !user.favoriteCuisines && (
                <div className="flex items-center gap-3 p-4 rounded-[14px]"
                  style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.05), rgba(57,255,209,0.03))', border: '1px dashed rgba(255,92,40,0.2)' }}>
                  <span className="text-[24px]">🍽️</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-[var(--text)] font-semibold">Расскажите о своих вкусах</p>
                    <p className="text-[11px] text-[var(--text3)] mt-0.5">Находите единомышленников и получайте персональные рекомендации</p>
                  </div>
                  <button onClick={() => setShowProfileModal(true)}
                    className="px-4 py-2 rounded-full text-[12px] font-semibold border-none cursor-pointer text-white shrink-0 transition-all"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px var(--accent-glow)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    Заполнить
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Invite friend — compact */}
          <div className="rounded-[16px] border p-4 flex items-center gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255,92,40,0.05), rgba(255,140,66,0.02))',
              borderColor: 'rgba(255,92,40,0.15)',
            }}>
            <span className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
              style={{ background: 'rgba(255,92,40,0.1)' }}>
              🎁
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[var(--text)]">Пригласите друга</span>
              <span className="text-[12px] text-[var(--text3)] ml-2">+50 баллов каждому</span>
            </div>
            <button
              onClick={() => setShowReferral(true)}
              className="px-4 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer transition-all shrink-0"
              style={{ background: 'var(--accent)' }}>
              Пригласить
            </button>
          </div>

          {/* Nutrition goal */}
          <CollapsibleSection
            icon="🎯"
            gradient="linear-gradient(135deg, #3b82f6, #06b6d4)"
            title="Мой фокус"
            subtitle="Подсветим подходящие блюда в меню"
            badge={user?.nutritionGoal ? NUTRITION_GOALS.find(g => g.value === user.nutritionGoal)?.label : undefined}
            badgeColor="#3b82f6"
            borderColor="rgba(59,130,246,0.15)"
            bgGradient="linear-gradient(135deg, rgba(59,130,246,0.06), rgba(52,211,153,0.04))">
            <div className="grid grid-cols-5 gap-2.5 max-sm:grid-cols-2">
              {NUTRITION_GOALS.map(g => {
                const active = user?.nutritionGoal === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => handleNutritionGoal(g.value)}
                    className="relative p-3.5 rounded-[14px] border transition-all cursor-pointer text-center group"
                    style={{
                      background: active ? `${g.color}15` : 'var(--bg2)',
                      borderColor: active ? `${g.color}55` : 'var(--card-border)',
                      boxShadow: active ? `0 0 20px ${g.color}20` : 'none',
                    }}>
                    <span className="text-[28px] block mb-1.5 transition-transform group-hover:scale-110" style={{ transitionDuration: '200ms' }}>
                      {g.icon}
                    </span>
                    <span className="text-[12px] font-bold block mb-0.5"
                      style={{ color: active ? g.color : 'var(--text2)' }}>
                      {g.label}
                    </span>
                    <span className="text-[10px] leading-tight block" style={{ color: 'var(--text3)' }}>
                      {g.desc}
                    </span>
                    {active && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                        style={{ background: g.color }}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Allergens */}
          <CollapsibleSection
            icon="🛡️"
            gradient="linear-gradient(135deg, #ef4444, #f97316)"
            title="Мои аллергены"
            subtitle="Предупредим об опасных блюдах"
            badge={userAllergenIds.size > 0 ? `${userAllergenIds.size} выбрано` : undefined}
            badgeColor="#ef4444"
            borderColor="rgba(239,68,68,0.12)"
            bgGradient="linear-gradient(135deg, rgba(239,68,68,0.05), rgba(249,115,22,0.03))">
            <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
              {allergens.map(a => {
                const active = userAllergenIds.has(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAllergen(a.id)}
                    className="flex items-center gap-2.5 p-3 rounded-[12px] border transition-all cursor-pointer text-left"
                    style={{
                      background: active ? 'rgba(239,68,68,0.1)' : 'var(--bg2)',
                      borderColor: active ? 'rgba(239,68,68,0.4)' : 'var(--card-border)',
                      boxShadow: active ? '0 0 12px rgba(239,68,68,0.1)' : 'none',
                    }}>
                    <span className="text-[20px]">{a.icon}</span>
                    <span className="text-[12px] font-semibold flex-1"
                      style={{ color: active ? '#ef4444' : 'var(--text2)' }}>
                      {a.name}
                    </span>
                    {active && <span className="text-[10px] text-red-400 font-bold">✕</span>}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      )}

      <ReferralModal open={showReferral} onClose={() => setShowReferral(false)} />

      {/* ═══ Profile Edit Modal ═══ */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowProfileModal(false); }}>
          <div className="w-full max-w-[400px] rounded-[20px] border overflow-hidden"
            style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Редактировать профиль</h2>
              <button onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text3)] cursor-pointer border-none transition-all"
                style={{ background: 'var(--bg3)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg3)')}>
                ✕
              </button>
            </div>
            {/* Form */}
            <div className="px-5 pb-5 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-[36px] overflow-hidden"
                  style={{ background: 'var(--bg3)', border: '2px solid var(--card-border)' }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : '👤'}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold cursor-pointer border transition-all"
                  style={{ color: 'var(--accent)', borderColor: 'rgba(255,92,40,0.25)', background: 'rgba(255,92,40,0.06)' }}>
                  📷 Изменить фото
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await userApi.uploadAvatar(file);
                        const url = res.data?.avatarUrl || res.data?.avatar_url;
                        if (url) updateUser({ avatarUrl: url });
                        toast('Фото обновлено', 'success');
                      } catch { toast('Не удалось загрузить фото', 'error'); }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {/* Name */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text3)] block mb-1.5">Имя</label>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[var(--text)] border outline-none font-sans"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
                />
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => { await handleSaveName(); setShowProfileModal(false); }}
                  disabled={loading || nameInput === user.name}
                  className="flex-1 py-3 rounded-[12px] text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: 'var(--accent)' }}>
                  {loading ? '...' : 'Сохранить'}
                </button>
                <button onClick={() => { setShowProfileModal(false); setNameInput(user.name || ''); }}
                  className="px-5 py-3 rounded-[12px] text-[13px] font-semibold border cursor-pointer transition-all"
                  style={{ background: 'var(--glass)', borderColor: 'var(--glass-border)', color: 'var(--text2)' }}>
                  Отмена
                </button>
              </div>
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

      {guestTab === 'wishlist' && (
        <div className="space-y-3">
          {wishlist.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📌</div>
              <p className="text-[15px] text-[var(--text2)]">Список «Хочу сходить» пуст</p>
              <a href="/restaurants" className="text-[13px] text-[var(--accent)] mt-2 inline-block">Найти ресторан →</a>
            </div>
          ) : wishlist.map(r => (
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
                    await useWishlistStore.getState().toggle(r.id);
                    setWishlist(prev => prev.filter(f => f.id !== r.id));
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] cursor-pointer transition-all border-none"
                  style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}
                  title="Убрать из списка">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {guestTab === 'settings' && (
        <div className="space-y-5">
          {/* Privacy settings */}
          <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
                🔒
              </span>
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Приватность</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Скрыть из списков «Хочу сходить»</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Другие не увидят вас среди желающих посетить ресторан</div>
                </div>
                <input
                  type="checkbox"
                  checked={user.hideFromWishlists || false}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    updateUser({ hideFromWishlists: val });
                    try { await userApi.updateMe({ hideFromWishlists: val }); }
                    catch { /* column may not exist yet */ }
                  }}
                  className="w-5 h-5 accent-[#8b5cf6] cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Запретить входящие сообщения</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Никто не сможет начать с вами диалог</div>
                </div>
                <input
                  type="checkbox"
                  checked={user.blockMessages || false}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    updateUser({ blockMessages: val });
                    try { await userApi.updateMe({ blockMessages: val }); }
                    catch { /* column may not exist yet */ }
                  }}
                  className="w-5 h-5 accent-[#8b5cf6] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                🔔
              </span>
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Уведомления</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Напоминания о бронированиях</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">За 2 часа до визита</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#f59e0b] cursor-pointer" />
              </label>
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Акции и спецпредложения</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Скидки и события от ресторанов из избранного</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#f59e0b] cursor-pointer" />
              </label>
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Достижения программы лояльности</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Новый уровень, начисление баллов</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#f59e0b] cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 4px 12px rgba(6,182,212,0.3)' }}>
                🌐
              </span>
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Предпочтения</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-[14px]" style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Город по умолчанию</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Для фильтрации ресторанов при входе</div>
                </div>
                <select
                  className="px-3 py-2 rounded-[10px] text-[13px] text-[var(--text)] border outline-none cursor-pointer font-sans"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
                  defaultValue="">
                  <option value="">Все города</option>
                  <option value="msk">Москва</option>
                  <option value="spb">Санкт-Петербург</option>
                  <option value="ekb">Екатеринбург</option>
                  <option value="kzn">Казань</option>
                  <option value="nsk">Новосибирск</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-[14px]" style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Валюта</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Для отображения цен в меню и калькуляторе</div>
                </div>
                <select
                  className="px-3 py-2 rounded-[10px] text-[13px] text-[var(--text)] border outline-none cursor-pointer font-sans"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
                  defaultValue="rub">
                  <option value="rub">₽ Рубли</option>
                  <option value="usd">$ Доллары</option>
                  <option value="eur">€ Евро</option>
                </select>
              </div>
              <label className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer transition-all"
                style={{ background: 'var(--bg3)' }}>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text)]">Показывать КБЖУ в меню</div>
                  <div className="text-[12px] text-[var(--text3)] mt-0.5">Калории, белки, жиры и углеводы блюд</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#06b6d4] cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-[20px] border p-6" style={{ background: 'var(--bg2)', borderColor: 'rgba(239,68,68,0.15)' }}>
            <h2 className="text-[15px] font-semibold text-red-400 mb-4">Опасная зона</h2>
            <button onClick={handleLogout}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-red-400 border cursor-pointer transition-all"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
