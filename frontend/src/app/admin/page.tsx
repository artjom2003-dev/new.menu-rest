'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { photoApi, restaurantApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface DashboardStats {
  restaurants: number;
  users: number;
  reviews: number;
  bookings: number;
  pendingReviews: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  loyaltyLevel: string;
  loyaltyPoints: number;
  createdAt: string;
}

interface Photo {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
  source: string;
}

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  status: string;
  rating: number;
  reviewCount: number;
  city?: { name: string };
  cuisines?: Array<{ name: string }>;
  photos?: Photo[];
}

interface Review {
  id: number;
  ratingOverall: number;
  text: string | null;
  status: string;
  createdAt: string;
  restaurant?: { name: string };
}

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('access_token');
  return null;
}

async function apiFetch(url: string) {
  const res = await fetch(`${API}${url}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiPatch(url: string, body: unknown) {
  const res = await fetch(`${API}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

const STAT_CARDS = [
  { key: 'restaurants', label: 'Рестораны', icon: '🍽️', color: '#ff5c28' },
  { key: 'users', label: 'Пользователи', icon: '👤', color: '#3b82f6' },
  { key: 'reviews', label: 'Отзывы', icon: '💬', color: '#10b981' },
  { key: 'bookings', label: 'Брони', icon: '📅', color: '#8b5cf6' },
  { key: 'pendingReviews', label: 'На модерации', icon: '⏳', color: '#f59e0b' },
];

// ─── Photo Manager Component ──────────────────────────
function PhotoManager({ restaurant, onUpdate }: { restaurant: Restaurant; onUpdate: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const photos = restaurant.photos || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await photoApi.upload(restaurant.id, file, photos.length === 0);
      onUpdate();
      toast('Фото загружено', 'success');
    } catch { toast('Ошибка загрузки фото', 'error'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (photoId: number) => {
    try {
      await photoApi.delete(restaurant.id, photoId);
      onUpdate();
      toast('Фото удалено', 'success');
    } catch { toast('Ошибка удаления', 'error'); }
  };

  const handleSetCover = async (photoId: number) => {
    try {
      await photoApi.setCover(restaurant.id, photoId);
      onUpdate();
      toast('Обложка обновлена', 'success');
    } catch { toast('Ошибка обновления обложки', 'error'); }
  };

  return (
    <div className="mt-3 p-4 rounded-[12px] border" style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-[var(--text3)]">Фотографии ({photos.length})</span>
        <label className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white cursor-pointer"
          style={{ background: 'var(--accent)', opacity: uploading ? 0.5 : 1 }}>
          {uploading ? 'Загрузка...' : '+ Добавить'}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-[8px] overflow-hidden aspect-[4/3]"
              style={{ border: photo.isCover ? '2px solid var(--accent)' : '1px solid var(--card-border)' }}>
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              {photo.isCover && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                  style={{ background: 'var(--accent)' }}>
                  Обложка
                </span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!photo.isCover && (
                  <button onClick={() => handleSetCover(photo.id)}
                    className="px-2 py-1 rounded text-[10px] font-semibold text-white cursor-pointer border border-white/30 bg-transparent hover:bg-white/20">
                    Обложка
                  </button>
                )}
                <button onClick={() => handleDelete(photo.id)}
                  className="px-2 py-1 rounded text-[10px] font-semibold text-red-400 cursor-pointer border border-red-400/30 bg-transparent hover:bg-red-500/20">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status Edit Component ────────────────────────────
function StatusSelect({ restaurant, onUpdate }: { restaurant: Restaurant; onUpdate: () => void }) {
  const { toast } = useToast();
  const handleChange = async (newStatus: string) => {
    try {
      await restaurantApi.update(restaurant.id, { status: newStatus });
      onUpdate();
      toast(`Статус: ${newStatus}`, 'success');
    } catch { toast('Ошибка обновления статуса', 'error'); }
  };

  return (
    <select
      value={restaurant.status}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer border outline-none"
      style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)', color: 'var(--text2)' }}>
      <option value="draft">draft</option>
      <option value="published">published</option>
      <option value="archived">archived</option>
      <option value="closed">closed</option>
    </select>
  );
}

export default function AdminPage() {
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'restaurants' | 'reviews' | 'users'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return; }
    loadData();
  }, [isLoggedIn, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        setStats(await apiFetch('/admin/dashboard'));
      } else if (tab === 'restaurants') {
        const data = await apiFetch('/admin/restaurants?limit=50');
        setRestaurants(data.items || []);
      } else if (tab === 'reviews') {
        const data = await apiFetch('/reviews/pending?limit=50');
        setPendingReviews(data.items || []);
      } else if (tab === 'users') {
        const data = await apiFetch('/admin/users?limit=50');
        setUsers(data.items || []);
      }
    } catch { /* auth error, etc */ }
    setLoading(false);
  };

  const loadRestaurantDetails = async (id: number) => {
    try {
      const r = await apiFetch(`/restaurants/${restaurants.find(r => r.id === id)?.slug}`);
      setRestaurants(prev => prev.map(rest => rest.id === id ? { ...rest, photos: r.photos || [] } : rest));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadRestaurantDetails(id);
    }
  };

  const moderateReview = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await apiPatch(`/reviews/${id}/moderate`, { status });
      setPendingReviews(prev => prev.filter(r => r.id !== id));
      toast(status === 'approved' ? 'Отзыв одобрен' : 'Отзыв отклонён', 'success');
    } catch { toast('Ошибка модерации', 'error'); }
  };

  const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
    published: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    draft: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    archived: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' },
    closed: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="font-serif text-[32px] font-bold text-[var(--text)] mb-8">Админ-панель</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-[14px]" style={{ background: 'var(--bg3)' }}>
        {([
          ['dashboard', '📊 Дашборд'],
          ['restaurants', '🍽️ Рестораны'],
          ['reviews', '💬 Модерация'],
          ['users', '👤 Пользователи'],
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

      {loading ? (
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-[16px] animate-pulse" style={{ background: 'var(--bg3)' }} />)}
        </div>
      ) : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && stats && (
            <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
              {STAT_CARDS.map(card => (
                <div key={card.key} className="rounded-[16px] border p-5"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div className="text-[28px] mb-2">{card.icon}</div>
                  <div className="text-[28px] font-bold" style={{ color: card.color }}>
                    {(stats as unknown as Record<string, number>)[card.key]?.toLocaleString('ru-RU')}
                  </div>
                  <div className="text-[12px] text-[var(--text3)] mt-1">{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Restaurants */}
          {tab === 'restaurants' && (
            <div className="space-y-2">
              {restaurants.map(r => (
                <div key={r.id}>
                  <div className="rounded-[14px] border p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(r.id)}
                    style={{ background: 'var(--bg2)', borderColor: expandedId === r.id ? 'var(--accent)' : 'var(--card-border)' }}>
                    <div className="flex-1">
                      <a href={`/restaurants/${r.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[15px] font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]">
                        {r.name}
                      </a>
                      <div className="text-[12px] text-[var(--text3)] mt-0.5">
                        {r.city?.name} · {r.cuisines?.map(c => c.name).join(', ')} · ⭐ {Number(r.rating).toFixed(1)} ({r.reviewCount})
                      </div>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect restaurant={r} onUpdate={loadData} />
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          background: STATUS_BADGE[r.status]?.bg || 'var(--bg3)',
                          color: STATUS_BADGE[r.status]?.text || 'var(--text3)',
                        }}>
                        {r.status}
                      </span>
                    </div>
                  </div>

                  {expandedId === r.id && (
                    <PhotoManager
                      restaurant={r}
                      onUpdate={() => loadRestaurantDetails(r.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reviews moderation */}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-[15px] text-[var(--text2)]">Все отзывы промодерированы</p>
                </div>
              ) : pendingReviews.map(review => (
                <div key={review.id} className="rounded-[16px] border p-5"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-semibold text-[var(--text)]">
                      {review.restaurant?.name || `Ресторан`}
                    </span>
                    <span className="text-[14px] font-bold text-[var(--gold)]">
                      ⭐ {Number(review.ratingOverall).toFixed(1)}
                    </span>
                  </div>
                  {review.text && (
                    <p className="text-[13px] text-[var(--text2)] mb-3 leading-relaxed">{review.text}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => moderateReview(review.id, 'approved')}
                      className="px-4 py-2 rounded-full text-[12px] font-semibold text-white cursor-pointer border-none"
                      style={{ background: '#10b981' }}>
                      ✅ Одобрить
                    </button>
                    <button onClick={() => moderateReview(review.id, 'rejected')}
                      className="px-4 py-2 rounded-full text-[12px] font-semibold text-red-400 cursor-pointer border"
                      style={{ background: 'transparent', borderColor: 'rgba(239,68,68,0.3)' }}>
                      ❌ Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="rounded-[14px] border p-4 flex items-center justify-between"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text)]">{u.name || 'Без имени'}</div>
                    <div className="text-[12px] text-[var(--text3)]">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] text-[var(--text2)]">{u.loyaltyPoints} баллов</span>
                    <div className="text-[11px] text-[var(--text3)]">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
