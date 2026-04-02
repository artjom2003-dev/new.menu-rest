import React, { useState, useRef, useCallback, useEffect } from 'react';

interface FloorItem {
  id: string;
  type: 'table' | 'chair' | 'sofa' | 'bar' | 'wall' | 'plant' | 'entrance';
  x: number; y: number; width: number; height: number; rotation: number;
  label?: string; tableNumber?: number;
  material?: string; color?: string; pattern?: string;
  seats?: number; shape?: string;
}

interface FloorZone {
  id: string; name: string; width: number; height: number; bgColor: string; items: FloorItem[];
}

// Materials with SVG patterns
const MATERIALS: Record<string, { id: string; label: string; fill: string; stroke: string; patternSvg?: string }[]> = {
  table: [
    { id: 'oak', label: 'Дуб', fill: '#8B6B2E', stroke: '#6B4A1E' },
    { id: 'walnut', label: 'Орех', fill: '#6B4A3A', stroke: '#4A3020' },
    { id: 'birch', label: 'Берёза', fill: '#D4C4A8', stroke: '#B8A888' },
    { id: 'ebony', label: 'Венге', fill: '#2E2018', stroke: '#1A1008' },
    { id: 'marble', label: 'Мрамор', fill: '#E8E4E0', stroke: '#C8C4C0' },
    { id: 'glass', label: 'Стекло', fill: '#A8C8D8', stroke: '#88A8B8' },
    { id: 'metal', label: 'Металл', fill: '#888', stroke: '#666' },
  ],
  chair: [
    { id: 'wood', label: 'Дерево', fill: '#7A6550', stroke: '#5C4A3A' },
    { id: 'leather', label: 'Кожа', fill: '#4A3028', stroke: '#3A2018' },
    { id: 'fabric', label: 'Ткань', fill: '#5A6A7A', stroke: '#4A5A6A' },
    { id: 'plastic', label: 'Пластик', fill: '#E0E0E0', stroke: '#BABABA' },
    { id: 'metal', label: 'Металл', fill: '#888', stroke: '#666' },
  ],
  sofa: [
    { id: 'leather', label: 'Кожа', fill: '#5A3A2A', stroke: '#4A2A1A' },
    { id: 'velvet', label: 'Бархат', fill: '#3A2A5A', stroke: '#2A1A4A' },
    { id: 'fabric', label: 'Ткань', fill: '#4A6A4A', stroke: '#3A5A3A' },
    { id: 'linen', label: 'Лён', fill: '#C8B8A0', stroke: '#A89880' },
    { id: 'suede', label: 'Замша', fill: '#6A5A4A', stroke: '#5A4A3A' },
  ],
  bar: [
    { id: 'wood', label: 'Дерево', fill: '#6B4A2E', stroke: '#5A3A1E' },
    { id: 'marble', label: 'Мрамор', fill: '#E0DCD8', stroke: '#C0BCB8' },
    { id: 'metal', label: 'Металл', fill: '#707070', stroke: '#555' },
    { id: 'stone', label: 'Камень', fill: '#8A8A7A', stroke: '#6A6A5A' },
  ],
};

const COLORS = [
  '#8B6B2E', '#6B4A3A', '#D4C4A8', '#2E2018', '#4A3028', '#5A3A2A',
  '#3A5A3A', '#3A3A5A', '#5A3A3A', '#888', '#333', '#C8B8A0',
  '#7A2A2A', '#2A4A7A', '#6A6A2A', '#5A2A5A', '#2A6A6A', '#FFFFFF',
];

const PATTERNS = [
  { id: 'none', label: 'Без узора', icon: '◻' },
  { id: 'stripes', label: 'Полоски', icon: '▤' },
  { id: 'cross', label: 'Клетка', icon: '▦' },
  { id: 'dots', label: 'Горох', icon: '⠿' },
  { id: 'wood-grain', label: 'Дерево', icon: '≈' },
  { id: 'diamond', label: 'Ромбы', icon: '◇' },
  { id: 'zigzag', label: 'Зигзаг', icon: '⩘' },
  { id: 'herringbone', label: 'Ёлочка', icon: '⋘' },
];

const FURNITURE = [
  { type: 'table' as const, label: 'Стол круглый', w: 70, h: 70, shape: 'round' },
  { type: 'table' as const, label: 'Стол прямоуг.', w: 110, h: 60, shape: 'rect' },
  { type: 'table' as const, label: 'Стол квадрат.', w: 70, h: 70, shape: 'rect' },
  { type: 'chair' as const, label: 'Стул', w: 28, h: 28, shape: '' },
  { type: 'chair' as const, label: 'Кресло', w: 36, h: 36, shape: 'arm' },
  { type: 'sofa' as const, label: 'Диван 2-мест.', w: 100, h: 42, shape: '' },
  { type: 'sofa' as const, label: 'Диван 3-мест.', w: 140, h: 45, shape: '' },
  { type: 'sofa' as const, label: 'Угловой диван', w: 100, h: 100, shape: 'corner' },
  { type: 'bar' as const, label: 'Барная стойка', w: 180, h: 35, shape: '' },
  { type: 'bar' as const, label: 'Бар угловой', w: 100, h: 100, shape: 'corner' },
  { type: 'wall' as const, label: 'Стена', w: 140, h: 12, shape: '' },
  { type: 'wall' as const, label: 'Перегородка', w: 80, h: 8, shape: '' },
  { type: 'plant' as const, label: 'Растение', w: 30, h: 30, shape: '' },
  { type: 'plant' as const, label: 'Дерево', w: 45, h: 45, shape: 'tree' },
  { type: 'entrance' as const, label: 'Вход', w: 50, h: 18, shape: '' },
];

const ZONE_PRESETS = [
  { name: 'Основной зал', bgColor: '#1E1E2E' },
  { name: 'Веранда', bgColor: '#1A2E1A' },
  { name: 'Бар', bgColor: '#2E1A1A' },
  { name: 'VIP', bgColor: '#1A1A2E' },
  { name: 'Терраса', bgColor: '#2E2A1A' },
];

const BG_COLORS = ['#1E1E2E', '#1A2E1A', '#2E1A1A', '#1A1A2E', '#2E2A1A', '#2E2E2E', '#1A2A2A', '#151520', '#252520'];

let nextId = 1;
const genId = () => `i-${nextId++}-${Date.now()}`;

interface Props {
  initialZones: FloorZone[];
  onSave: (zones: FloorZone[]) => void;
  onClose: () => void;
}

function PatternDefs({ pattern, color }: { pattern: string; color: string }) {
  if (pattern === 'none' || !pattern) return null;
  const lighter = color + '40';
  return (
    <defs>
      {pattern === 'stripes' && (
        <pattern id={`pat-${pattern}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={lighter} strokeWidth="2"/>
        </pattern>
      )}
      {pattern === 'cross' && (
        <pattern id={`pat-${pattern}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <line x1="0" y1="5" x2="10" y2="5" stroke={lighter} strokeWidth="0.5"/>
          <line x1="5" y1="0" x2="5" y2="10" stroke={lighter} strokeWidth="0.5"/>
        </pattern>
      )}
      {pattern === 'dots' && (
        <pattern id={`pat-${pattern}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.2" fill={lighter}/>
        </pattern>
      )}
      {pattern === 'wood-grain' && (
        <pattern id={`pat-${pattern}`} width="20" height="4" patternUnits="userSpaceOnUse">
          <path d="M0,2 Q5,0 10,2 Q15,4 20,2" stroke={lighter} strokeWidth="0.8" fill="none"/>
        </pattern>
      )}
      {pattern === 'diamond' && (
        <pattern id={`pat-${pattern}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <polygon points="5,0 10,5 5,10 0,5" fill="none" stroke={lighter} strokeWidth="0.5"/>
        </pattern>
      )}
    </defs>
  );
}

export function FloorEditor({ initialZones, onSave, onClose }: Props) {
  const [zones, setZones] = useState<FloorZone[]>(
    initialZones.length > 0 ? initialZones : [{ id: 'z1', name: 'Основной зал', width: 800, height: 500, bgColor: '#1E1E2E', items: [] }],
  );
  const [activeZone, setActiveZone] = useState(0);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const justSelected = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tc = useRef(Math.max(0, ...initialZones.flatMap(z => z.items.filter(i => i.type === 'table').map(i => i.tableNumber || 0))) + 1);

  const zone = zones[activeZone];
  const sel = selectedItem ? zone.items.find(i => i.id === selectedItem) : null;
  const selMaterials = sel ? MATERIALS[sel.type] : null;

  const updateZone = useCallback((p: Partial<FloorZone>) => {
    setZones(prev => prev.map((z, i) => i === activeZone ? { ...z, ...p } : z));
  }, [activeZone]);

  const updateItem = useCallback((id: string, p: Partial<FloorItem>) => {
    setZones(prev => prev.map((z, i) => i === activeZone ? { ...z, items: z.items.map(it => it.id === id ? { ...it, ...p } : it) } : z));
  }, [activeZone]);

  const addItem = (f: typeof FURNITURE[number]) => {
    const item: FloorItem = {
      id: genId(), type: f.type,
      x: 80 + Math.random() * 300, y: 60 + Math.random() * 200,
      width: f.w, height: f.h, rotation: 0, shape: f.shape,
      ...(f.type === 'table' ? { tableNumber: tc.current++, label: `${tc.current - 1}` } : {}),
    };
    updateZone({ items: [...zone.items, item] });
    setSelectedItem(item.id);
  };

  const duplicateItem = () => {
    if (!sel) return;
    const dup = { ...sel, id: genId(), x: sel.x + 20, y: sel.y + 20, tableNumber: sel.type === 'table' ? tc.current++ : undefined };
    updateZone({ items: [...zone.items, dup] });
    setSelectedItem(dup.id);
  };

  const deleteSelected = () => { if (!selectedItem) return; updateZone({ items: zone.items.filter(i => i.id !== selectedItem) }); setSelectedItem(null); };

  const addZone = (p: typeof ZONE_PRESETS[number]) => {
    setZones(prev => [...prev, { id: `z${prev.length + 1}`, name: p.name, width: 800, height: 500, bgColor: p.bgColor, items: [] }]);
    setActiveZone(zones.length);
  };

  const deleteZone = (idx: number) => { if (zones.length <= 1) return; setZones(prev => prev.filter((_, i) => i !== idx)); setActiveZone(Math.max(0, activeZone - 1)); };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = zone.items.find(i => i.id === id);
    if (!item || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    setDragging({ id, ox: e.clientX - r.left - item.x, oy: e.clientY - r.top - item.y });
    setSelectedItem(id);
    justSelected.current = true;
    setTimeout(() => { justSelected.current = false; }, 200);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    updateItem(dragging.id, {
      x: Math.max(0, Math.min(zone.width - 10, e.clientX - r.left - dragging.ox)),
      y: Math.max(0, Math.min(zone.height - 10, e.clientY - r.top - dragging.oy)),
    });
  };
  const onMouseUp = () => setDragging(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
      if (e.key === 'Delete' && selectedItem) deleteSelected();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedItem]);

  const getMat = (item: FloorItem) => {
    const mats = MATERIALS[item.type];
    if (!mats) return { fill: '#555', stroke: '#777' };
    if (item.material) { const m = mats.find(m => m.id === item.material); if (m) return m; }
    return mats[0];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col">
      {/* Top bar */}
      <div className="h-11 bg-surface border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">Конструктор зала</span>
          <div className="h-4 w-px bg-border mx-1" />
          {zones.map((z, i) => (
            <button key={z.id} onClick={() => { setActiveZone(i); setSelectedItem(null); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${activeZone === i ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary'}`}>
              {z.name}
              {zones.length > 1 && <span onClick={e => { e.stopPropagation(); deleteZone(i); }} className="ml-1 text-[9px] hover:text-red-400">✕</span>}
            </button>
          ))}
          <div className="relative group">
            <button className="px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-primary">+ Зона</button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-surface border border-border rounded-xl shadow-xl p-1 z-50 w-36">
              {ZONE_PRESETS.map(p => (
                <button key={p.name} onClick={() => addZone(p)} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-text-secondary hover:bg-surface-3 transition flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: p.bgColor }} /> {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onSave(zones)} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition">Сохранить</button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-xs hover:text-text-primary transition">Закрыть</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: furniture */}
        <div className="w-40 bg-surface border-r border-border flex flex-col flex-shrink-0">
          <div className="p-2 border-b border-border"><p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Мебель</p></div>
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {FURNITURE.map((f, i) => (
              <button key={i} onClick={() => addItem(f)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-text-secondary hover:bg-surface-3 hover:text-text-primary transition truncate">
                {f.label}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-border space-y-1.5">
            <label className="text-[9px] text-text-muted">Зона</label>
            <input value={zone.name} onChange={e => updateZone({ name: e.target.value })}
              className="w-full px-2 py-1 rounded bg-surface-2 border border-border text-[11px] text-text-primary focus:outline-none focus:border-primary" />
            <label className="text-[9px] text-text-muted">Фон</label>
            <div className="flex gap-1 flex-wrap">
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => updateZone({ bgColor: c })}
                  className={`w-4 h-4 rounded ${zone.bgColor === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* Center: canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#08080E] p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !justSelected.current) setSelectedItem(null); }}>
          <div ref={canvasRef} className="relative rounded-lg"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
            style={{
              width: zone.width, height: zone.height, background: zone.bgColor,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              boxShadow: '0 0 60px rgba(0,0,0,0.6)',
            }}
            onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => setDragging(null)}
          >
            {zone.items.map(item => {
              const m = getMat(item);
              const fill = item.color || m.fill;
              const stroke = item.color ? (item.color + 'CC') : m.stroke;
              const isSel = selectedItem === item.id;
              const patId = `pat-${item.id}-${item.pattern}`;
              const pat = item.pattern && item.pattern !== 'none' ? `url(#${patId})` : undefined;
              const patColor = fill + '40';
              const isRound = item.type === 'table' && (item.shape === 'round' || (item.width === item.height && item.shape !== 'rect'));

              return (
                <div key={item.id} className="absolute select-none"
                  style={{ left: item.x, top: item.y, width: item.width, height: item.height, transform: `rotate(${item.rotation}deg)`, cursor: dragging?.id === item.id ? 'grabbing' : 'grab' }}
                  onMouseDown={e => onMouseDown(e, item.id)}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${item.width} ${item.height}`} overflow="visible" className="pointer-events-none">
                    {pat && (
                      <defs>
                        {item.pattern === 'stripes' && (
                          <pattern id={patId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width="4" height="8" fill="rgba(255,255,255,0.15)"/>
                          </pattern>
                        )}
                        {item.pattern === 'cross' && (
                          <pattern id={patId} width="14" height="14" patternUnits="userSpaceOnUse">
                            <rect width="14" height="14" fill="none"/>
                            <rect x="0" y="0" width="7" height="7" fill="rgba(255,255,255,0.1)"/>
                            <rect x="7" y="7" width="7" height="7" fill="rgba(255,255,255,0.1)"/>
                          </pattern>
                        )}
                        {item.pattern === 'dots' && (
                          <pattern id={patId} width="12" height="12" patternUnits="userSpaceOnUse">
                            <circle cx="6" cy="6" r="2.5" fill="rgba(255,255,255,0.18)"/>
                          </pattern>
                        )}
                        {item.pattern === 'wood-grain' && (
                          <pattern id={patId} width="30" height="8" patternUnits="userSpaceOnUse">
                            <path d="M0,4 Q7,1 15,4 Q22,7 30,4" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
                            <path d="M0,7 Q7,4 15,7 Q22,10 30,7" stroke="rgba(0,0,0,0.1)" strokeWidth="1" fill="none"/>
                          </pattern>
                        )}
                        {item.pattern === 'diamond' && (
                          <pattern id={patId} width="16" height="16" patternUnits="userSpaceOnUse">
                            <polygon points="8,1 15,8 8,15 1,8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                          </pattern>
                        )}
                        {item.pattern === 'zigzag' && (
                          <pattern id={patId} width="16" height="10" patternUnits="userSpaceOnUse">
                            <path d="M0,8 L4,2 L8,8 L12,2 L16,8" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none"/>
                          </pattern>
                        )}
                        {item.pattern === 'herringbone' && (
                          <pattern id={patId} width="12" height="12" patternUnits="userSpaceOnUse">
                            <path d="M0,6 L6,0 L12,6" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" fill="none"/>
                            <path d="M0,12 L6,6 L12,12" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
                          </pattern>
                        )}
                      </defs>
                    )}

                    {/* TABLE */}
                    {item.type === 'table' && isRound && (<>
                      <circle cx={item.width/2} cy={item.height/2} r={item.width/2-2} fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <circle cx={item.width/2} cy={item.height/2} r={item.width/2-3} fill={pat}/>}
                      <circle cx={item.width/2} cy={item.height/2} r={item.width/2-8} fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.3"/>
                      <text x={item.width/2} y={item.height/2+4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" opacity="0.85">{item.tableNumber}</text>
                    </>)}
                    {item.type === 'table' && !isRound && (<>
                      <rect x="2" y="2" width={item.width-4} height={item.height-4} rx="5" fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <rect x="3" y="3" width={item.width-6} height={item.height-6} rx="4" fill={pat}/>}
                      <rect x="6" y="6" width={item.width-12} height={item.height-12} rx="3" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.2"/>
                      <text x={item.width/2} y={item.height/2+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" opacity="0.85">{item.tableNumber}</text>
                    </>)}

                    {/* CHAIR */}
                    {item.type === 'chair' && (<>
                      <rect x="2" y={item.height*0.3} width={item.width-4} height={item.height*0.68} rx="3" fill={fill} stroke={stroke} strokeWidth="1.5"/>
                      {pat && <rect x="3" y={item.height*0.32} width={item.width-6} height={item.height*0.64} rx="2" fill={pat}/>}
                      <rect x="3" y="1" width={item.width-6} height={item.height*0.26} rx="2" fill={stroke}/>
                      {item.shape === 'arm' && (<>
                        <rect x="0" y={item.height*0.3} width="3" height={item.height*0.5} rx="1" fill={stroke}/>
                        <rect x={item.width-3} y={item.height*0.3} width="3" height={item.height*0.5} rx="1" fill={stroke}/>
                      </>)}
                    </>)}

                    {/* SOFA */}
                    {item.type === 'sofa' && item.shape !== 'corner' && (<>
                      <rect x="2" y="2" width={item.width-4} height={item.height-4} rx="8" fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <rect x="3" y="3" width={item.width-6} height={item.height-6} rx="7" fill={pat}/>}
                      <rect x={item.width*0.05} y={item.height*0.18} width={item.width*0.9} height={item.height*0.45} rx="4" fill={stroke} opacity="0.3"/>
                      {Array.from({ length: Math.max(2, Math.floor(item.width / 50)) }).map((_, ci) => {
                        const cx = item.width * (0.12 + ci * (0.76 / Math.max(1, Math.floor(item.width / 50))));
                        return <line key={ci} x1={cx} y1={item.height*0.2} x2={cx} y2={item.height*0.58} stroke={fill} strokeWidth="1" opacity="0.6"/>;
                      })}
                    </>)}
                    {item.type === 'sofa' && item.shape === 'corner' && (<>
                      <path d={`M8,2 L${item.width-4},2 L${item.width-4},${item.height*0.4} L${item.width*0.4},${item.height*0.4} L${item.width*0.4},${item.height-4} L2,${item.height-4} L2,8 Z`} fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <path d={`M10,4 L${item.width-6},4 L${item.width-6},${item.height*0.38} L${item.width*0.42},${item.height*0.38} L${item.width*0.42},${item.height-6} L4,${item.height-6} L4,10 Z`} fill={pat}/>}
                    </>)}

                    {/* BAR */}
                    {item.type === 'bar' && item.shape !== 'corner' && (<>
                      <rect x="1" y="1" width={item.width-2} height={item.height-2} rx="4" fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <rect x="2" y="2" width={item.width-4} height={item.height-4} rx="3" fill={pat}/>}
                      <rect x="3" y="3" width={item.width-6} height={item.height*0.35} rx="2" fill={stroke} opacity="0.3"/>
                      <text x={item.width/2} y={item.height/2+3} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">БАР</text>
                    </>)}
                    {item.type === 'bar' && item.shape === 'corner' && (<>
                      <path d={`M2,2 L${item.width-2},2 L${item.width-2},${item.height*0.3} L${item.width*0.3},${item.height*0.3} L${item.width*0.3},${item.height-2} L2,${item.height-2} Z`} fill={fill} stroke={stroke} strokeWidth="2"/>
                      {pat && <path d={`M4,4 L${item.width-4},4 L${item.width-4},${item.height*0.28} L${item.width*0.32},${item.height*0.28} L${item.width*0.32},${item.height-4} L4,${item.height-4} Z`} fill={pat}/>}
                    </>)}

                    {/* WALL */}
                    {item.type === 'wall' && <rect x="0" y="0" width={item.width} height={item.height} rx="2" fill="#555" stroke="#777" strokeWidth="1"/>}

                    {/* PLANT */}
                    {item.type === 'plant' && (<>
                      <circle cx={item.width/2} cy={item.height/2} r={item.width/2-1} fill="#2A4A2A" stroke="#3A6A3A" strokeWidth="1.5"/>
                      {item.shape === 'tree' ? (<>
                        <circle cx={item.width/2} cy={item.height*0.3} r={item.width*0.25} fill="#2E7A2E"/>
                        <circle cx={item.width*0.3} cy={item.height*0.5} r={item.width*0.2} fill="#2A6A2A"/>
                        <circle cx={item.width*0.7} cy={item.height*0.5} r={item.width*0.2} fill="#3A7A3A"/>
                        <circle cx={item.width/2} cy={item.height*0.65} r={item.width*0.18} fill="#2E6E2E"/>
                      </>) : (<>
                        <circle cx={item.width/2} cy={item.height*0.35} r={item.width*0.17} fill="#3A7A3A"/>
                        <circle cx={item.width*0.35} cy={item.height*0.55} r={item.width*0.14} fill="#2E6E2E"/>
                        <circle cx={item.width*0.65} cy={item.height*0.55} r={item.width*0.14} fill="#3A6A3A"/>
                      </>)}
                    </>)}

                    {/* ENTRANCE */}
                    {item.type === 'entrance' && (<>
                      <rect x="1" y="1" width={item.width-2} height={item.height-2} rx="2" fill="none" stroke="#7777BB" strokeWidth="1.5" strokeDasharray="4,2"/>
                      <text x={item.width/2} y={item.height/2+3} textAnchor="middle" fill="#9999DD" fontSize="8">ВХОД</text>
                    </>)}
                  </svg>
                  {isSel && <div className="absolute -inset-[3px] border-2 border-primary rounded-lg pointer-events-none" style={{ borderRadius: isRound || item.type === 'plant' ? '50%' : 6 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: properties */}
        <div className="w-52 bg-surface border-l border-border flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-2.5 border-b border-border"><p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Свойства</p></div>
          {sel ? (
            <div className="p-2.5 space-y-3 text-[11px]">
              <p className="font-semibold text-text-primary text-xs">
                {sel.type === 'table' ? `Стол #${sel.tableNumber}` : FURNITURE.find(f => f.type === sel.type && (f.shape || '') === (sel.shape || ''))?.label || sel.type}
              </p>

              {sel.type === 'table' && (
                <div>
                  <label className="text-[9px] text-text-muted">Номер стола</label>
                  <input type="number" value={sel.tableNumber || ''} onChange={e => updateItem(sel.id, { tableNumber: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-primary mt-0.5" />
                </div>
              )}

              {/* Size */}
              <div>
                <label className="text-[9px] text-text-muted">Размер</label>
                <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                  <input type="number" value={sel.width} onChange={e => updateItem(sel.id, { width: parseInt(e.target.value) || 20 })}
                    className="px-2 py-1 rounded bg-surface-2 border border-border text-text-primary focus:outline-none" placeholder="Ш" />
                  <input type="number" value={sel.height} onChange={e => updateItem(sel.id, { height: parseInt(e.target.value) || 20 })}
                    className="px-2 py-1 rounded bg-surface-2 border border-border text-text-primary focus:outline-none" placeholder="В" />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="text-[9px] text-text-muted">Поворот: {sel.rotation}°</label>
                <input type="range" min="0" max="360" step="5" value={sel.rotation}
                  onChange={e => updateItem(sel.id, { rotation: parseInt(e.target.value) })}
                  className="w-full accent-primary mt-0.5" />
              </div>

              {/* Material */}
              {selMaterials && (<>
                <div>
                  <label className="text-[9px] text-text-muted block mb-1">Материал</label>
                  <div className="space-y-0.5">
                    {selMaterials.map(m => (
                      <button key={m.id} onClick={() => updateItem(sel.id, { material: m.id, color: undefined })}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition ${
                          (sel.material || selMaterials[0].id) === m.id ? 'bg-primary/15 text-primary' : 'hover:bg-surface-3 text-text-secondary'
                        }`}>
                        <span className="w-4 h-4 rounded" style={{ background: m.fill, border: `1px solid ${m.stroke}` }} />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom color */}
                <div>
                  <label className="text-[9px] text-text-muted block mb-1">Свой цвет</label>
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => updateItem(sel.id, { color: c })}
                        className={`w-4 h-4 rounded-sm ${sel.color === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input type="color" value={sel.color || getMat(sel).fill} onChange={e => updateItem(sel.id, { color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0" />
                    <span className="text-[9px] text-text-muted">Произвольный</span>
                  </div>
                </div>

                {/* Pattern */}
                <div>
                  <label className="text-[9px] text-text-muted block mb-1">Узор</label>
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-2 gap-1">
                    {PATTERNS.map(p => (
                      <button key={p.id} onClick={() => updateItem(sel.id, { pattern: p.id })}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition ${
                          (sel.pattern || 'none') === p.id ? 'bg-primary/15 text-primary' : 'hover:bg-surface-3 text-text-secondary'
                        }`}>
                        <span className="text-sm opacity-70">{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </>)}

              <div className="flex gap-1.5 pt-1">
                <button onClick={duplicateItem} className="flex-1 py-1.5 rounded-lg bg-surface-3 text-text-secondary text-[10px] hover:text-text-primary transition">Копировать</button>
                <button onClick={deleteSelected} className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] hover:bg-red-500/20 transition">Удалить</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-3">
              <p className="text-[10px] text-text-muted text-center leading-relaxed">Нажмите на элемент<br/>для настройки</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
