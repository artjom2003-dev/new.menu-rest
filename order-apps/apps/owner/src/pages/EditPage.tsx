import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../stores/restaurantStore';
import { ownerApi, photoApi, referenceApi } from '../lib/api';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
      type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>{message}</div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-3 pt-4 first:pt-0">
      <span className="text-sm">{icon}</span> {title}
    </h2>
  );
}

export function EditPage() {
  const { restaurant, loadRestaurant } = useRestaurantStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Info form
  const [form, setForm] = useState({
    description: '', phone: '', website: '', address: '', averageBill: '', venueType: '',
  });
  const [saving, setSaving] = useState(false);

  // Hours
  const [hours, setHours] = useState<Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>>([]);
  const [savingHours, setSavingHours] = useState(false);

  // Features
  const [allFeatures, setAllFeatures] = useState<Array<{ id: number; name: string; slug: string; category: string }>>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Photos
  const [uploading, setUploading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      description: restaurant.description || '',
      phone: restaurant.phone || '',
      website: restaurant.website || '',
      address: restaurant.address || '',
      averageBill: restaurant.averageBill ? String(restaurant.averageBill) : '',
      venueType: restaurant.venueType || '',
    });
    setHours(
      [1, 2, 3, 4, 5, 6, 0].map(d => {
        const existing = restaurant.workingHours?.find((h: any) => h.dayOfWeek === d);
        return existing || { dayOfWeek: d, openTime: '10:00', closeTime: '22:00', isClosed: false };
      })
    );
    setSelectedFeatures(restaurant.features?.map((f: any) => f.id) || []);
  }, [restaurant]);

  useEffect(() => {
    referenceApi.getFeatures().then(r => setAllFeatures(r.data || [])).catch(() => {});
  }, []);

  const saveInfo = async () => {
    setSaving(true);
    try {
      await ownerApi.updateMyRestaurant({
        description: form.description, phone: form.phone, website: form.website,
        address: form.address,
        averageBill: form.averageBill ? Number(form.averageBill) : undefined,
        venueType: form.venueType || undefined,
      });
      await loadRestaurant();
      showToast('Информация сохранена', 'success');
    } catch { showToast('Ошибка сохранения', 'error'); }
    setSaving(false);
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await ownerApi.updateWorkingHours(hours);
      await loadRestaurant();
      showToast('Часы работы сохранены', 'success');
    } catch { showToast('Ошибка сохранения', 'error'); }
    setSavingHours(false);
  };

  const saveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await ownerApi.updateFeatures(selectedFeatures);
      await loadRestaurant();
      showToast('Особенности сохранены', 'success');
    } catch { showToast('Ошибка сохранения', 'error'); }
    setSavingFeatures(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;
    setUploading(true);
    try {
      await photoApi.upload(restaurant.id, file);
      await loadRestaurant();
      showToast('Фото загружено', 'success');
    } catch { showToast('Ошибка загрузки', 'error'); }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!restaurant) return;
    try {
      await photoApi.delete(restaurant.id, photoId);
      await loadRestaurant();
      showToast('Фото удалено', 'success');
    } catch { showToast('Ошибка удаления', 'error'); }
  };

  const handleSetCover = async (photoId: number) => {
    if (!restaurant) return;
    try {
      await photoApi.setCover(restaurant.id, photoId);
      await loadRestaurant();
      showToast('Обложка установлена', 'success');
    } catch { showToast('Ошибка', 'error'); }
  };

  if (!restaurant) return <p className="text-text-muted py-12 text-center">Загрузка...</p>;

  const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const CATEGORY_LABELS: Record<string, string> = { atmosphere: 'Особенности', occasion: 'Повод', entertainment: 'Развлечения', service: 'Сервис' };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-primary">Карточка ресторана</h1>
        <a href={`https://new.menu-rest.com/restaurants/${restaurant.slug}`} target="_blank" rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-surface-3 border border-border text-xs font-medium text-text-secondary hover:text-primary hover:border-primary/30 transition no-underline">
          Открыть на сайте ↗
        </a>
      </div>

      <div className="grid grid-cols-[1fr_1fr_300px] gap-5">
        {/* COL 1 — Info + Hours */}
        <div>
          <SectionTitle icon="📝" title="Информация" />
          <div className="space-y-3 mb-2">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Описание</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-0.5">Телефон</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-0.5">Сайт</label>
                <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-0.5">Адрес</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-0.5">Средний чек (₽)</label>
                <input type="number" value={form.averageBill} onChange={e => setForm({ ...form, averageBill: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="max-w-xs">
              <label className="block text-[11px] font-medium text-text-secondary mb-0.5">Тип заведения</label>
              <select value={form.venueType} onChange={e => setForm({ ...form, venueType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none">
                <option value="">—</option>
                {['restaurant', 'cafe', 'bar', 'pub', 'coffeehouse', 'pizzeria', 'fast-food', 'bistro', 'confectionery', 'bakery'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={saveInfo} disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
            {saving ? 'Сохраняем...' : 'Сохранить информацию'}
          </button>

          {/* ═══ HOURS ═══ */}
          <SectionTitle icon="🕐" title="Часы работы" />
          <div className="space-y-2 mb-3">
            {hours.map((h, i) => (
              <div key={h.dayOfWeek} className="flex items-center gap-2 bg-card rounded-lg border border-border px-2.5 py-2">
                <span className="text-xs font-medium text-text-secondary w-6">{h.dayOfWeek === 0 ? 'Вс' : DAY_NAMES[h.dayOfWeek]}</span>
                <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer w-20">
                  <input type="checkbox" checked={h.isClosed}
                    onChange={() => { const n = [...hours]; n[i] = { ...n[i], isClosed: !n[i].isClosed }; setHours(n); }}
                    className="accent-primary w-3.5 h-3.5" />
                  Закрыто
                </label>
                {!h.isClosed && (
                  <>
                    <input type="time" value={h.openTime}
                      onChange={e => { const n = [...hours]; n[i] = { ...n[i], openTime: e.target.value }; setHours(n); }}
                      className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
                    <span className="text-text-muted text-xs">—</span>
                    <input type="time" value={h.closeTime}
                      onChange={e => { const n = [...hours]; n[i] = { ...n[i], closeTime: e.target.value }; setHours(n); }}
                      className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none" />
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={saveHours} disabled={savingHours}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
            {savingHours ? 'Сохраняем...' : 'Сохранить часы работы'}
          </button>

        </div>

        {/* COL 2 — Features + Photos */}
        <div>
          <SectionTitle icon="✨" title="Особенности" />
          <div className="mb-3">
            {['atmosphere', 'occasion', 'entertainment', 'service'].map(category => {
              const items = allFeatures.filter(f => f.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="mb-4">
                  <h3 className="text-xs text-text-muted mb-2">{CATEGORY_LABELS[category] || category}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(f => {
                      const active = selectedFeatures.includes(f.id);
                      return (
                        <button key={f.id}
                          onClick={() => setSelectedFeatures(active ? selectedFeatures.filter(id => id !== f.id) : [...selectedFeatures, f.id])}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                            active ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-3 text-text-muted border border-border hover:border-primary/30'
                          }`}>
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={saveFeatures} disabled={savingFeatures}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
            {savingFeatures ? 'Сохраняем...' : 'Сохранить особенности'}
          </button>

          {/* ═══ PHOTOS ═══ */}
          <SectionTitle icon="📸" title="Фотографии" />
          <div className="flex items-center gap-3 mb-4">
            <label className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              uploading ? 'bg-surface-3 text-text-muted' : 'bg-primary text-white hover:bg-primary-hover'
            }`}>
              {uploading ? 'Загрузка...' : '+ Загрузить фото'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
            </label>
            <span className="text-[11px] text-text-muted">{restaurant.photos?.length || 0} фото</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {restaurant.photos?.map((p: any) => (
              <div key={p.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-surface-2">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                {p.isCover && (
                  <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary text-white">Обложка</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                  {!p.isCover && (
                    <button onClick={() => handleSetCover(p.id)}
                      className="px-2 py-1 rounded-lg bg-white/20 text-white text-[9px] font-semibold hover:bg-white/30 transition">
                      Обложка
                    </button>
                  )}
                  <button onClick={() => handleDeletePhoto(p.id)}
                    className="px-2 py-1 rounded-lg bg-red-500/30 text-red-300 text-[9px] font-semibold hover:bg-red-500/50 transition">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 3 — Preview card */}
        <div className="sticky top-6 self-start">
          <p className="text-[11px] text-text-muted mb-3">Предпросмотр карточки</p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {(() => {
              const cover = restaurant.photos?.find((p: any) => p.isCover) || restaurant.photos?.[0];
              return (
                <>
                  <div className="h-40 bg-surface-2 relative">
                    {cover ? (
                      <img src={cover.url} alt={restaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🍽️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16162A] to-transparent" />
                    {restaurant.averageBill && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/50 backdrop-blur text-white">
                        ~{restaurant.averageBill} ₽
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-base font-bold text-text-primary mb-1">{restaurant.name}</h3>
                    {restaurant.cuisines && restaurant.cuisines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {restaurant.cuisines.map((c: any) => (
                          <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{c.name}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-text-muted mb-1.5">
                      {[restaurant.city?.name, restaurant.address].filter(Boolean).join(', ')}
                    </p>
                    {restaurant.description && (
                      <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3 mb-2">{restaurant.description}</p>
                    )}
                    {restaurant.features && restaurant.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {restaurant.features.slice(0, 4).map((f: any) => (
                          <span key={f.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-muted">{f.name}</span>
                        ))}
                        {restaurant.features.length > 4 && <span className="text-[9px] text-text-muted">+{restaurant.features.length - 4}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      {restaurant.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400 text-xs">⭐</span>
                          <span className="text-xs font-semibold text-text-primary">{Number(restaurant.rating).toFixed(1)}</span>
                        </div>
                      )}
                      {restaurant.phone && <span className="text-[10px] text-text-muted ml-auto">{restaurant.phone}</span>}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
