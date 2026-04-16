'use client';

import { useState, useEffect, useRef } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import { ownerApi, photoApi, referenceApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface HourRow { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }
interface FeatureItem { id: number; name: string; slug: string; category: string; icon?: string | null }

const FEATURE_CATEGORY_LABELS: Record<string, string> = {
  atmosphere: 'Особенности',
  occasion: 'Поводы',
  service: 'Сервис',
  cuisine_feature: 'Кухня',
  payment: 'Оплата',
  accessibility: 'Доступность',
  entertainment: 'Развлечения',
  other: 'Другое',
};

export default function OwnerEditPage() {
  const { myRestaurant, setMyRestaurant } = useOwner();
  const { toast } = useToast();

  // ─── Info fields ──────────────────
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [averageBill, setAverageBill] = useState('');
  const [priceLevel, setPriceLevel] = useState('');
  const [venueType, setVenueType] = useState('');
  const [instagram, setInstagram] = useState('');
  const [vk, setVk] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Working Hours ────────────────
  const [hours, setHours] = useState<HourRow[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // ─── Features ─────────────────────
  const [allFeatures, setAllFeatures] = useState<FeatureItem[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<number>>(new Set());
  const [savingFeatures, setSavingFeatures] = useState(false);

  // ─── Photos ───────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ─── Active section tab ───────────
  const [activeSection, setActiveSection] = useState<'info' | 'hours' | 'features' | 'photos'>('info');

  // Init from restaurant data
  useEffect(() => {
    if (myRestaurant) {
      setDescription(myRestaurant.description || '');
      setPhone(myRestaurant.phone || '');
      setWebsite(myRestaurant.website || '');
      setAddress(myRestaurant.address || '');
      setMetroStation(myRestaurant.metroStation || '');
      setAverageBill(myRestaurant.averageBill ? String(myRestaurant.averageBill) : '');
      setPriceLevel(myRestaurant.priceLevel ? String(myRestaurant.priceLevel) : '');
      setVenueType(myRestaurant.venueType || '');
      setInstagram(myRestaurant.instagram || '');
      setVk(myRestaurant.vk || '');
      setEmail(myRestaurant.email || '');

      // Init hours — fill all 7 days
      const existing = myRestaurant.workingHours || [];
      const mapped: HourRow[] = [];
      for (let d = 0; d < 7; d++) {
        const found = existing.find(h => h.dayOfWeek === d);
        mapped.push({
          dayOfWeek: d,
          openTime: found?.openTime?.slice(0, 5) || '09:00',
          closeTime: found?.closeTime?.slice(0, 5) || '22:00',
          isClosed: found?.isClosed ?? false,
        });
      }
      setHours(mapped);

      // Init features
      setSelectedFeatureIds(new Set((myRestaurant.features || []).map(f => f.id)));
    }
  }, [myRestaurant]);

  // Load all features from reference API
  useEffect(() => {
    referenceApi.getFeatures().then(res => setAllFeatures(res.data)).catch(() => {});
  }, []);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  const photos = myRestaurant.photos || [];

  // ─── Handlers ──────────────────────

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = { description, phone, website, address, metroStation, venueType, instagram, vk, email };
      if (averageBill) data.averageBill = Number(averageBill);
      const res = await ownerApi.updateMyRestaurant(data);
      setMyRestaurant(prev => prev ? { ...prev, ...res.data } : prev);
      toast('Информация сохранена', 'success');
    } catch { toast('Ошибка при сохранении', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      const payload = hours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? null : h.openTime,
        closeTime: h.isClosed ? null : h.closeTime,
        isClosed: h.isClosed,
      }));
      const res = await ownerApi.updateWorkingHours(payload);
      setMyRestaurant(prev => prev ? { ...prev, workingHours: res.data } : prev);
      toast('Время работы сохранено', 'success');
    } catch { toast('Ошибка при сохранении', 'error'); }
    finally { setSavingHours(false); }
  };

  const handleSaveFeatures = async () => {
    setSavingFeatures(true);
    try {
      const res = await ownerApi.updateFeatures(Array.from(selectedFeatureIds));
      setMyRestaurant(prev => prev ? { ...prev, features: res.data } : prev);
      toast('Особенности сохранены', 'success');
    } catch { toast('Ошибка при сохранении', 'error'); }
    finally { setSavingFeatures(false); }
  };

  const toggleFeature = (id: number) => {
    setSelectedFeatureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateHour = (dayOfWeek: number, field: keyof HourRow, value: string | boolean) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await photoApi.upload(myRestaurant.id, file);
      setMyRestaurant(prev => prev ? { ...prev, photos: [...(prev.photos || []), res.data] } : prev);
      toast('Фото загружено', 'success');
    } catch { toast('Ошибка загрузки', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleSetCover = async (photoId: number) => {
    try {
      await photoApi.setCover(myRestaurant.id, photoId);
      setMyRestaurant(prev => prev ? { ...prev, photos: prev.photos?.map(p => ({ ...p, isCover: p.id === photoId })) } : prev);
      toast('Обложка обновлена', 'success');
    } catch { toast('Ошибка', 'error'); }
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm('Удалить фото?')) return;
    try {
      await photoApi.delete(myRestaurant.id, photoId);
      setMyRestaurant(prev => prev ? { ...prev, photos: prev.photos?.filter(p => p.id !== photoId) } : prev);
      toast('Фото удалено', 'success');
    } catch { toast('Ошибка удаления', 'error'); }
  };

  // ─── Styles ──────────────────────
  const fs: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, var(--accent), #ff8c42)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
  };

  const sections = [
    { key: 'info' as const, label: 'Информация', icon: '📝' },
    { key: 'hours' as const, label: 'Время работы', icon: '🕐' },
    { key: 'features' as const, label: 'Особенности', icon: '✨' },
    { key: 'photos' as const, label: 'Фотографии', icon: '📸' },
  ];

  // Group features by category
  const featuresByCategory = allFeatures.reduce<Record<string, FeatureItem[]>>((acc, f) => {
    const cat = f.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-5">Редактирование карточки</h1>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className="border-0 cursor-pointer transition-all"
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: activeSection === s.key ? 700 : 400,
              color: activeSection === s.key ? 'var(--accent)' : 'var(--text3)',
              background: 'transparent',
              borderBottom: activeSection === s.key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            <span style={{ marginRight: 6 }}>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* ═══ INFO SECTION ═══ */}
      {activeSection === 'info' && (
        <div className="rounded-[16px] border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)', maxWidth: 700 }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Описание</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...fs, resize: 'vertical' }} placeholder="Расскажите о ресторане..." />
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Телефон</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={fs} placeholder="+7 (999) 123-45-67" />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={fs} placeholder="info@restaurant.ru" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Сайт</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} style={fs} placeholder="https://myrestaurant.ru" />
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Адрес</label>
                <input value={address} onChange={e => setAddress(e.target.value)} style={fs} placeholder="ул. Пушкина, 10" />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Метро</label>
                <input value={metroStation} onChange={e => setMetroStation(e.target.value)} style={fs} placeholder="Тверская" />
              </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Средний чек, ₽</label>
                <input type="number" value={averageBill} onChange={e => setAverageBill(e.target.value)} style={fs} placeholder="1500" />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Ценовой уровень</label>
                <select value={priceLevel} onChange={e => setPriceLevel(e.target.value)} style={fs}>
                  <option value="">—</option>
                  <option value="1">₽ — Бюджетный</option>
                  <option value="2">₽₽ — Средний</option>
                  <option value="3">₽₽₽ — Выше среднего</option>
                  <option value="4">₽₽₽₽ — Премиум</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Тип заведения</label>
                <input value={venueType} onChange={e => setVenueType(e.target.value)} style={fs} placeholder="restaurant" />
              </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">Instagram</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} style={fs} placeholder="@myrestaurant" />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text3)] mb-1.5 font-semibold">ВКонтакте</label>
                <input value={vk} onChange={e => setVk(e.target.value)} style={fs} placeholder="https://vk.com/myrestaurant" />
              </div>
            </div>

            <button onClick={handleSaveInfo} disabled={saving} style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить информацию'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ WORKING HOURS SECTION ═══ */}
      {activeSection === 'hours' && (
        <div className="rounded-[16px] border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)', maxWidth: 600 }}>
          <div className="flex flex-col gap-3">
            {hours.map(h => (
              <div key={h.dayOfWeek} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
                <span style={{ width: 30, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{DAY_NAMES[h.dayOfWeek]}</span>

                <label className="flex items-center gap-1.5 cursor-pointer" style={{ minWidth: 90 }}>
                  <input type="checkbox" checked={h.isClosed}
                    onChange={e => updateHour(h.dayOfWeek, 'isClosed', e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 12, color: h.isClosed ? '#ff4444' : 'var(--text3)' }}>Выходной</span>
                </label>

                {!h.isClosed && (
                  <>
                    <input type="time" value={h.openTime}
                      onChange={e => updateHour(h.dayOfWeek, 'openTime', e.target.value)}
                      style={{ ...fs, width: 130, padding: '6px 10px', fontSize: 13 }} />
                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>
                    <input type="time" value={h.closeTime}
                      onChange={e => updateHour(h.dayOfWeek, 'closeTime', e.target.value)}
                      style={{ ...fs, width: 130, padding: '6px 10px', fontSize: 13 }} />
                  </>
                )}
                {h.isClosed && <span style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>Не работает</span>}
              </div>
            ))}

            <button onClick={() => {
              // Copy Monday hours to all days
              if (hours.length > 0) {
                const mon = hours[0];
                setHours(prev => prev.map(h => h.dayOfWeek === 0 ? h : { ...h, openTime: mon.openTime, closeTime: mon.closeTime, isClosed: mon.isClosed }));
              }
            }}
              className="border-0 cursor-pointer text-[12px] font-semibold self-start"
              style={{ color: 'var(--teal)', background: 'rgba(20,184,166,0.08)', padding: '6px 14px', borderRadius: 8, marginTop: 4 }}>
              Скопировать Пн на все дни
            </button>

            <button onClick={handleSaveHours} disabled={savingHours} style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: savingHours ? 0.7 : 1, marginTop: 8 }}>
              {savingHours ? 'Сохранение...' : 'Сохранить время работы'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ FEATURES SECTION ═══ */}
      {activeSection === 'features' && (
        <div className="rounded-[16px] border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)', maxWidth: 800 }}>
          {Object.entries(featuresByCategory).length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Загрузка особенностей...</p>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(featuresByCategory).map(([cat, features]) => (
                <div key={cat}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                    {FEATURE_CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {features.map(f => {
                      const sel = selectedFeatureIds.has(f.id);
                      return (
                        <button key={f.id} onClick={() => toggleFeature(f.id)}
                          className="border cursor-pointer transition-all"
                          style={{
                            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: sel ? 600 : 400,
                            background: sel ? 'rgba(255,107,53,0.12)' : 'var(--bg)',
                            borderColor: sel ? 'var(--accent)' : 'var(--card-border)',
                            color: sel ? 'var(--accent)' : 'var(--text2)',
                          }}>
                          {f.icon && <span style={{ marginRight: 4 }}>{f.icon}</span>}
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                Выбрано: {selectedFeatureIds.size}
              </div>

              <button onClick={handleSaveFeatures} disabled={savingFeatures} style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: savingFeatures ? 0.7 : 1 }}>
                {savingFeatures ? 'Сохранение...' : 'Сохранить особенности'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ PHOTOS SECTION ═══ */}
      {activeSection === 'photos' && (
        <div className="rounded-[16px] border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[var(--text)]">Фотографии ({photos.length})</h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded-[8px] px-3.5 py-1.5 text-[11px] font-bold text-white border-0 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>
              {uploading ? '...' : '+ Загрузить'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </div>

          {photos.length === 0 ? (
            <div className="rounded-[12px] p-6 text-center" style={{ background: 'var(--bg3)' }}>
              <div className="text-[28px] mb-2">📸</div>
              <p className="text-[12px] text-[var(--text3)]">Нет фотографий. Загрузите первое фото!</p>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {photos.map(p => (
                <div key={p.id} className="rounded-[10px] overflow-hidden relative" style={{ border: p.isCover ? '2px solid var(--accent)' : '1px solid var(--card-border)' }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                  {p.isCover && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: 'var(--accent)' }}>
                      Обложка
                    </span>
                  )}
                  <div className="flex gap-1 p-1">
                    {!p.isCover && (
                      <button onClick={() => handleSetCover(p.id)} className="flex-1 rounded py-1 text-[10px] font-semibold cursor-pointer border-0" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
                        Обложка
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="flex-1 rounded py-1 text-[10px] font-semibold cursor-pointer border-0" style={{ background: 'rgba(255,60,60,0.1)', color: '#ff4444' }}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
