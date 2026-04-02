import React, { useState, useEffect, useRef } from 'react';
import { emenuApi } from '../lib/api';
import { useRestaurantStore } from '../stores/restaurantStore';
import { FloorEditor } from './FloorEditor';

interface Banner {
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface FloorItem {
  id: string;
  type: 'table' | 'chair' | 'sofa' | 'bar' | 'wall' | 'plant' | 'entrance';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  tableNumber?: number;
}

interface FloorZone {
  id: string;
  name: string;
  width: number;
  height: number;
  bgColor: string;
  items: FloorItem[];
}

interface EMenuSettings {
  theme: 'light' | 'dark' | 'warm';
  primaryColor: string;
  welcomeMessage: string;
  showPrices: boolean;
  showPhotos: boolean;
  showDescriptions: boolean;
  currencySymbol: string;
  qrCtaText: string;
  qrBgColor: string;
  qrTextColor: string;
  qrAccentColor: string;
  banners: Banner[];
  showFloorPlan: boolean;
  floorZones: FloorZone[];
}

const DEFAULTS: EMenuSettings = {
  theme: 'dark', primaryColor: '#E8491D',
  welcomeMessage: 'Добро пожаловать!',
  showPrices: true, showPhotos: true, showDescriptions: true,
  currencySymbol: '₽',
  qrCtaText: 'Сканируйте QR-код для меню',
  qrBgColor: '#1C1B1F', qrTextColor: '#FFFFFF', qrAccentColor: '#E8491D',
  banners: [
    { title: 'Бизнес-ланч', subtitle: 'с 12:00 до 15:00', imageUrl: '' },
    { title: 'Освежающие напитки', subtitle: 'Коктейли, чай, кофе, лимонады', imageUrl: '' },
    { title: 'Свежая выпечка', subtitle: 'Десерты, торты, круассаны', imageUrl: '' },
  ],
  showFloorPlan: false,
  floorZones: [],
};

const THEMES = [
  { id: 'light' as const, label: 'Светлая', bg: '#FFF5EE', text: '#333' },
  { id: 'dark' as const, label: 'Тёмная', bg: '#1C1B1F', text: '#EEE' },
  { id: 'warm' as const, label: 'Тёплая', bg: '#F5E6D3', text: '#4A3728' },
];

export function EMenuPage() {
  const { restaurant } = useRestaurantStore();
  const [s, setS] = useState<EMenuSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const qrRef = useRef<HTMLCanvasElement>(null);
  const kioskKey = useRef(0);
  const [showFloorEditor, setShowFloorEditor] = useState(false);
  const [floorHover, setFloorHover] = useState(false);

  useEffect(() => {
    emenuApi.getSettings()
      .then(res => setS({ ...DEFAULTS, ...(res.data || {}) }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const u = (p: Partial<EMenuSettings>) => setS(prev => ({ ...prev, ...p }));

  const save = async () => {
    setSaving(true);
    try {
      await emenuApi.saveSettings(s as any);
      setToast('Сохранено');
      setTimeout(() => setToast(''), 2000);
      // Refresh kiosk preview
      kioskKey.current++;
      setS(prev => ({ ...prev }));
    } catch { setToast('Ошибка'); }
    setSaving(false);
  };

  useEffect(() => {
    if (!qrRef.current) return;
    const ctx = qrRef.current.getContext('2d');
    if (!ctx) return;
    const size = 160;
    qrRef.current.width = size; qrRef.current.height = size;
    ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    const cs = 5, off = 10;
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++)
      if (Math.random() > 0.5 || (x < 7 && y < 7) || (x > 20 && y < 7) || (x < 7 && y > 20))
        ctx.fillRect(off + x * cs, off + y * cs, cs - 1, cs - 1);
    const corner = (cx: number, cy: number) => {
      ctx.fillRect(off + cx * cs, off + cy * cs, 7 * cs - 1, cs - 1);
      ctx.fillRect(off + cx * cs, off + (cy + 6) * cs, 7 * cs - 1, cs - 1);
      for (let i = 1; i < 6; i++) { ctx.fillRect(off + cx * cs, off + (cy + i) * cs, cs - 1, cs - 1); ctx.fillRect(off + (cx + 6) * cs, off + (cy + i) * cs, cs - 1, cs - 1); }
      ctx.fillRect(off + (cx + 2) * cs, off + (cy + 2) * cs, 3 * cs - 1, 3 * cs - 1);
    };
    corner(0, 0); corner(21, 0); corner(0, 21);
  }, [s.qrAccentColor]);

  const downloadStand = () => {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 900;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = s.qrBgColor; ctx.fillRect(0, 0, 600, 900);
    ctx.strokeStyle = s.qrAccentColor; ctx.lineWidth = 4;
    ctx.roundRect(20, 20, 560, 860, 20); ctx.stroke();
    ctx.fillStyle = s.qrAccentColor; ctx.beginPath(); ctx.roundRect(270, 130, 60, 60, 12); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MR', 300, 168);
    ctx.fillStyle = s.qrTextColor; ctx.font = 'bold 36px sans-serif'; ctx.fillText(restaurant?.name || 'Ресторан', 300, 100);
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.roundRect(150, 230, 300, 300, 16); ctx.fill();
    ctx.fillStyle = '#000';
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++)
      if (Math.random() > 0.45 || (x < 7 && y < 7) || (x > 22 && y < 7) || (x < 7 && y > 22))
        ctx.fillRect(180 + x * 8, 260 + y * 8, 7, 7);
    ctx.fillStyle = s.qrTextColor; ctx.font = '20px sans-serif'; ctx.fillText(s.qrCtaText, 300, 590);
    ctx.fillStyle = s.qrAccentColor; ctx.fillRect(240, 610, 120, 3);
    ctx.fillStyle = s.qrTextColor + '88'; ctx.font = '16px sans-serif'; ctx.fillText(s.welcomeMessage, 300, 820);
    ctx.fillStyle = s.qrTextColor + '44'; ctx.font = '12px sans-serif'; ctx.fillText('menu-rest.com', 300, 860);
    const a = document.createElement('a'); a.download = `qr-stand.png`; a.href = c.toDataURL('image/png'); a.click();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between py-1 cursor-pointer" onClick={onChange}>
      <span className="text-xs text-text-secondary">{label}</span>
      <div className={`w-9 h-[18px] rounded-full transition relative ${value ? 'bg-primary' : 'bg-surface-3'}`}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
      </div>
    </div>
  );

  const inputCls = "w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none";

  return (
    <div>
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">{toast}</div>}

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-text-primary">Настройки электронного меню</h2>
        <button onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {/* Main layout: settings left, previews right */}
      <div className="flex gap-4 max-lg:flex-col">
        {/* Left: all settings */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Theme */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-text-primary mb-2">Тема оформления</p>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => u({ theme: t.id })}
                  className={`flex-1 py-2 rounded-lg border-2 text-[11px] font-medium transition ${s.theme === t.id ? 'border-primary' : 'border-border'}`}
                  style={{ background: t.bg, color: t.text }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input type="color" value={s.primaryColor} onChange={e => u({ primaryColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
              <span className="text-[10px] text-text-muted">Основной цвет</span>
            </div>
          </div>

          {/* Display + Branding in one row */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-text-primary mb-2">Отображение</p>
              <Toggle label="Цены" value={s.showPrices} onChange={() => u({ showPrices: !s.showPrices })} />
              <Toggle label="Фото блюд" value={s.showPhotos} onChange={() => u({ showPhotos: !s.showPhotos })} />
              <Toggle label="Описания" value={s.showDescriptions} onChange={() => u({ showDescriptions: !s.showDescriptions })} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-secondary">Валюта</span>
                <select value={s.currencySymbol} onChange={e => u({ currencySymbol: e.target.value })}
                  className="px-2 py-0.5 rounded bg-surface-2 border border-border text-xs text-text-primary focus:outline-none">
                  <option value="₽">₽</option><option value="$">$</option><option value="€">€</option><option value="₸">₸</option>
                </select>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-text-primary mb-2">Брендинг</p>
              <label className="text-[10px] text-text-muted mb-1 block">Приветствие</label>
              <input value={s.welcomeMessage} onChange={e => u({ welcomeMessage: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Banners */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-primary">Рекламные баннеры</p>
              <button onClick={() => u({ banners: [...(s.banners || []), { title: '', subtitle: '', imageUrl: '' }] })}
                className="text-[10px] text-primary font-medium hover:underline">+ Добавить</button>
            </div>
            <div className="space-y-2">
              {(s.banners || []).map((b, i) => (
                <div key={i} className="flex gap-2 items-start p-2.5 rounded-lg bg-surface-2 border border-border">
                  {/* Image preview / upload */}
                  <label className="w-16 h-16 rounded-lg overflow-hidden bg-surface-3 border border-border flex-shrink-0 cursor-pointer flex items-center justify-center hover:border-primary/30 transition relative">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text-muted text-lg">🖼</span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500000) { setToast('Макс. 500KB'); return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const updated = [...(s.banners || [])];
                        updated[i] = { ...updated[i], imageUrl: reader.result as string };
                        u({ banners: updated });
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }} />
                  </label>
                  {/* Text fields */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      value={b.title}
                      onChange={e => {
                        const updated = [...(s.banners || [])];
                        updated[i] = { ...updated[i], title: e.target.value };
                        u({ banners: updated });
                      }}
                      className="w-full px-2 py-1 rounded bg-transparent border border-transparent focus:border-primary text-xs text-text-primary font-medium focus:outline-none"
                      placeholder="Название баннера"
                    />
                    <input
                      value={b.subtitle}
                      onChange={e => {
                        const updated = [...(s.banners || [])];
                        updated[i] = { ...updated[i], subtitle: e.target.value };
                        u({ banners: updated });
                      }}
                      className="w-full px-2 py-1 rounded bg-transparent border border-transparent focus:border-primary text-[11px] text-text-muted focus:outline-none"
                      placeholder="Подпись"
                    />
                  </div>
                  {/* Delete */}
                  <button onClick={() => u({ banners: (s.banners || []).filter((_, j) => j !== i) })}
                    className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-red-400 text-[10px] flex-shrink-0 hover:bg-red-400/10 transition">
                    ✕
                  </button>
                </div>
              ))}
              {(!s.banners || s.banners.length === 0) && (
                <p className="text-[11px] text-text-muted text-center py-3">Нет баннеров</p>
              )}
            </div>
          </div>

          {/* Floor Plan */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 relative"
                onMouseEnter={() => setFloorHover(true)} onMouseLeave={() => setFloorHover(false)}>
                <p className="text-xs font-semibold text-text-primary">Схема зала</p>
                <span className="w-4 h-4 rounded-full bg-surface-3 text-text-muted flex items-center justify-center text-[9px] cursor-help">?</span>
                {floorHover && (
                  <div className="absolute left-0 top-6 z-30 w-64 p-3 rounded-xl bg-surface border border-border shadow-xl text-[11px] text-text-secondary leading-relaxed">
                    Схема расположения столов в зале. Помогает официантам быстро ориентироваться —
                    видеть какой стол свободен, где сидят гости, куда нести заказ.
                    Схема отображается в приложении официанта.
                  </div>
                )}
              </div>
              <Toggle label="" value={s.showFloorPlan} onChange={() => u({ showFloorPlan: !s.showFloorPlan })} />
            </div>
            {s.showFloorPlan && (
              <div>
                <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
                  По запросу мы можем вставить вашу готовую схему зала или поможем создать новую в конструкторе.
                </p>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-medium text-text-secondary hover:border-primary/30 hover:text-primary transition cursor-pointer">
                    📎 Загрузить схему
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => {
                      if (e.target.files?.[0]) setToast(`Схема "${e.target.files[0].name}" загружена`);
                      e.target.value = '';
                    }} />
                  </label>
                  <button onClick={() => setShowFloorEditor(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition">
                    🏗 Создать в конструкторе
                  </button>
                </div>
                {(s.floorZones?.length > 0) && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                      {s.floorZones.length} {s.floorZones.length === 1 ? 'зона' : 'зоны'}, {s.floorZones.reduce((n, z) => n + z.items.length, 0)} элементов
                    </span>
                    <button onClick={() => setShowFloorEditor(true)} className="text-[10px] text-primary hover:underline">Редактировать</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QR Stand settings */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-text-primary mb-3">QR-табличка</p>
            <label className="text-[10px] text-text-muted mb-1 block">Призыв к действию</label>
            <input value={s.qrCtaText} onChange={e => u({ qrCtaText: e.target.value })} className={`${inputCls} mb-3`} />
            <div className="flex gap-5">
              {([
                { label: 'Фон', key: 'qrBgColor' as const },
                { label: 'Текст', key: 'qrTextColor' as const },
                { label: 'Акцент', key: 'qrAccentColor' as const },
              ]).map(c => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="color" value={s[c.key]} onChange={e => u({ [c.key]: e.target.value } as any)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  <span className="text-[10px] text-text-muted">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: previews */}
        <div className="w-[340px] max-lg:w-full space-y-3 flex-shrink-0">
          {/* Kiosk preview */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">Предпросмотр меню</p>
              <a href="http://localhost:5182" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline">
                Открыть ↗
              </a>
            </div>
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: 420 }}>
              <iframe
                key={kioskKey.current}
                src="http://localhost:5182"
                title="Предпросмотр электронного меню"
                className="w-full h-full border-0"
                style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%' }}
              />
            </div>
          </div>

          {/* QR Stand preview */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">QR-табличка</p>
              <button onClick={downloadStand}
                className="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-semibold hover:bg-primary-hover transition">
                📥 Скачать
              </button>
            </div>
            <div className="flex justify-center">
              <div className="w-[170px] rounded-2xl overflow-hidden shadow-lg" style={{ background: s.qrBgColor, border: `2px solid ${s.qrAccentColor}` }}>
                <div className="p-3 text-center">
                  <div className="w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center text-white text-[8px] font-black" style={{ background: s.qrAccentColor }}>MR</div>
                  <p className="text-[10px] font-bold mb-1.5" style={{ color: s.qrTextColor }}>{restaurant?.name || 'Ресторан'}</p>
                  <div className="bg-white rounded-lg p-1.5 mx-auto w-[100px] h-[100px] mb-1.5">
                    <canvas ref={qrRef} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <p className="text-[7px] mb-0.5" style={{ color: s.qrTextColor }}>{s.qrCtaText}</p>
                  <div className="w-6 h-px mx-auto" style={{ background: s.qrAccentColor }} />
                  <p className="text-[6px] mt-1 opacity-40" style={{ color: s.qrTextColor }}>{s.welcomeMessage}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floor Editor Modal */}
      {showFloorEditor && (
        <FloorEditor
          initialZones={s.floorZones || []}
          onSave={(zones) => {
            u({ floorZones: zones });
            setShowFloorEditor(false);
            setToast('Схема сохранена');
          }}
          onClose={() => setShowFloorEditor(false)}
        />
      )}
    </div>
  );
}
