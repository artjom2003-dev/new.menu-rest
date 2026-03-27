'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchStore } from '@/stores/search.store';
import { useGeoStore } from '@/stores/geo.store';
import { useCityStore } from '@/stores/city.store';
import { referenceApi } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface FilterOption {
  label: string;
  value: string;
  icon?: string;
}

/* ─── Compact dropdown (with optional search) ─── */
function MiniDropdown({ icon, label, options, value, onChange, searchable, resetLabel, searchPlaceholder, nothingFoundLabel }: {
  icon: string; label: string; options: FilterOption[];
  value?: string; onChange: (v: string | undefined) => void;
  searchable?: boolean; resetLabel?: string; searchPlaceholder?: string; nothingFoundLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, searchable]);

  const selected = options.find(o => o.value === value);
  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) setSearch(''); }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap font-sans border"
        style={{
          background: value ? 'var(--accent-glow)' : 'var(--bg3)',
          borderColor: value ? 'var(--chat-user-border)' : 'var(--card-border)',
          color: value ? 'var(--accent)' : 'var(--text2)',
        }}>
        {icon} {selected ? (selected.icon ? `${selected.icon} ${selected.label}` : selected.label) : label}
        <span className={`text-[10px] opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 min-w-[240px] max-h-[360px] rounded-2xl p-1.5 z-[100] border flex flex-col"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {searchable && (
            <div className="px-2 pt-1 pb-2">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder || 'Search...'}
                className="w-full px-3 py-2 rounded-xl text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none border font-sans"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--card-border)')}
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1">
            {value && (
              <div onClick={() => { onChange(undefined); setOpen(false); setSearch(''); }}
                className="px-3.5 py-2 rounded-xl text-[12px] cursor-pointer text-[var(--text3)] hover:text-red-400 mb-1">
                ✕ {resetLabel || 'Reset'}
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3.5 py-3 text-[12px] text-[var(--text3)]">{nothingFoundLabel || 'Nothing found'}</div>
            )}
            {filtered.map(o => (
              <div key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                className="px-3.5 py-2.5 rounded-xl text-[13px] cursor-pointer transition-all"
                style={{
                  color: value === o.value ? 'var(--accent)' : 'var(--text2)',
                  background: value === o.value ? 'var(--accent-glow)' : 'transparent',
                }}>
                {o.icon ? `${o.icon} ${o.label}` : o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── City search input with autocomplete ─── */
function CitySearch({ options, value, onChange, placeholder: cityPlaceholder }: {
  options: FilterOption[]; value?: string; onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const matches = input.trim()
    ? options.filter(o => o.label.toLowerCase().includes(input.toLowerCase()))
    : [];

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
        style={{
          background: value ? 'var(--accent-glow)' : 'var(--bg3)',
          borderColor: value ? 'var(--chat-user-border)' : focused ? 'var(--accent)' : 'var(--card-border)',
        }}>
        <span className="text-[13px]">📍</span>
        {value && selected ? (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] whitespace-nowrap">
            {selected.label}
            <span className="text-[10px] opacity-60 cursor-pointer hover:opacity-100"
              onClick={() => { onChange(undefined); setInput(''); }}>✕</span>
          </span>
        ) : (
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            placeholder={cityPlaceholder || 'City...'}
            className="bg-transparent outline-none text-[13px] font-medium text-[var(--text2)] placeholder-[var(--text3)] w-[100px] font-sans"
          />
        )}
      </div>
      {focused && matches.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] left-0 max-sm:left-auto max-sm:right-0 min-w-[200px] max-sm:min-w-[calc(100vw-24px)] max-h-[280px] max-sm:max-h-[50vh] overflow-y-auto rounded-2xl p-1.5 z-[100] border"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {matches.map(o => (
            <div key={o.value}
              onClick={() => { onChange(o.value); setInput(''); setFocused(false); }}
              className="px-3.5 py-2.5 rounded-xl text-[13px] cursor-pointer transition-all text-[var(--text2)] hover:bg-[var(--bg3)]">
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cuisine selector: top picks + expandable grid ─── */
const VISIBLE_COUNT = 8;

function CuisineSelector({ cuisines, selected, onToggle, cuisineLabel, collapseLabel, moreLabel }: {
  cuisines: FilterOption[]; selected: string[];
  onToggle: (slug: string) => void;
  cuisineLabel?: string; collapseLabel?: string; moreLabel?: (count: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setExpanded(false);
    };
    if (expanded) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [expanded]);

  // Put selected cuisines first, then the rest
  const sorted = [...cuisines].sort((a, b) => {
    const aActive = selected.includes(a.value) ? 0 : 1;
    const bActive = selected.includes(b.value) ? 0 : 1;
    return aActive - bActive;
  });
  const visible = sorted.slice(0, VISIBLE_COUNT);
  const hiddenCount = cuisines.length - VISIBLE_COUNT;
  const activeHiddenCount = selected.filter(s => !visible.some(v => v.value === s)).length;

  const Chip = ({ c }: { c: FilterOption }) => {
    const active = selected.includes(c.value);
    return (
      <button
        onClick={() => onToggle(c.value)}
        className="px-4 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all border whitespace-nowrap"
        style={{
          background: active ? 'var(--accent)' : 'var(--bg3)',
          color: active ? '#fff' : 'var(--text3)',
          borderColor: active ? 'var(--accent)' : 'var(--card-border)',
        }}>
        {c.label}
      </button>
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-[var(--text3)] mr-1">{cuisineLabel || 'Cuisine'}</span>
        {visible.map(c => <Chip key={c.value} c={c} />)}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all border whitespace-nowrap"
            style={{
              background: activeHiddenCount > 0 ? 'var(--accent-glow)' : 'var(--glass)',
              color: activeHiddenCount > 0 ? 'var(--accent)' : 'var(--text3)',
              borderColor: activeHiddenCount > 0 ? 'var(--chat-user-border)' : 'var(--glass-border)',
            }}>
            {expanded ? (collapseLabel || 'Collapse') : (moreLabel ? moreLabel(hiddenCount) : `+${hiddenCount} more`)}
            {activeHiddenCount > 0 && !expanded && (
              <span className="ml-1.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--accent)' }}>
                {activeHiddenCount}
              </span>
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-[100] rounded-2xl border p-5 min-w-[500px] max-w-[700px] animate-fade-up"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--card-border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            {cuisines.map(c => <Chip key={c.value} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Price range selector ─── */

function PriceRangeSelector({ minVal, maxVal, onChange, priceLabels, avgBillLabel, resetLabel }: {
  minVal?: number; maxVal?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
  priceLabels?: string[]; avgBillLabel?: string; resetLabel?: string;
}) {
  const PRICE_RANGES = [
    { min: 1, max: 1, label: priceLabels?.[0] || 'up to 700 ₽' },
    { min: 2, max: 2, label: priceLabels?.[1] || '700 – 1,500 ₽' },
    { min: 3, max: 3, label: priceLabels?.[2] || '1,500 – 3,000 ₽' },
    { min: 4, max: 4, label: priceLabels?.[3] || '3,000+ ₽' },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const hasValue = minVal !== undefined || maxVal !== undefined;
  const displayLabel = hasValue
    ? PRICE_RANGES.find(r => r.min === minVal && r.max === maxVal)?.label || `${minVal || '?'}–${maxVal || '?'}`
    : (avgBillLabel || 'Average bill');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap font-sans border"
        style={{
          background: hasValue ? 'var(--accent-glow)' : 'var(--bg3)',
          borderColor: hasValue ? 'var(--chat-user-border)' : 'var(--card-border)',
          color: hasValue ? 'var(--accent)' : 'var(--text2)',
        }}>
        💰 {displayLabel}
        <span className={`text-[10px] opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 min-w-[220px] rounded-2xl p-2 z-[100] border"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {hasValue && (
            <div onClick={() => { onChange(undefined, undefined); setOpen(false); }}
              className="px-3.5 py-2 rounded-xl text-[12px] cursor-pointer text-[var(--text3)] hover:text-red-400 mb-1">
              ✕ {resetLabel || 'Reset'}
            </div>
          )}
          {PRICE_RANGES.map((r, i) => {
            const active = minVal === r.min && maxVal === r.max;
            return (
              <div key={i}
                onClick={() => { onChange(r.min, r.max); setOpen(false); }}
                className="px-3.5 py-2.5 rounded-xl text-[13px] cursor-pointer transition-all"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: active ? 'var(--accent-glow)' : 'transparent',
                }}>
                {r.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Active filter tags ─── */
function ActiveTags({ tags, onRemove, onClear, resetAllLabel }: {
  tags: Array<{ key: string; label: string }>; onRemove: (key: string) => void; onClear: () => void;
  resetAllLabel?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map(t => (
        <span key={t.key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--chat-user-border)' }}
          onClick={() => onRemove(t.key)}>
          {t.label} <span className="opacity-60">✕</span>
        </span>
      ))}
      <button onClick={onClear}
        className="text-[11px] text-[var(--text3)] cursor-pointer hover:text-red-400 transition-colors font-sans border-none bg-transparent px-1">
        {resetAllLabel || 'Reset all'}
      </button>
    </div>
  );
}

/* ─── Nearby button ─── */
function NearbyButton({ active, onToggle, detectingLabel, activeLabel, nearbyLabel }: { active: boolean; onToggle: () => void; detectingLabel?: string; activeLabel?: string; nearbyLabel?: string }) {
  const isRequesting = useGeoStore(s => s.status) === 'requesting';

  return (
    <button
      onClick={onToggle}
      disabled={isRequesting}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap font-sans border"
      style={{
        background: active ? 'var(--accent-glow)' : 'var(--bg3)',
        borderColor: active ? 'var(--chat-user-border)' : 'var(--card-border)',
        color: active ? 'var(--accent)' : 'var(--text2)',
        opacity: isRequesting ? 0.6 : 1,
      }}>
      {isRequesting ? '📡' : '📍'} {isRequesting ? (detectingLabel || 'Detecting...') : active ? (activeLabel || 'Nearby ✓') : (nearbyLabel || 'Near me')}
    </button>
  );
}

/* ─── Main FiltersBar ─── */
function FiltersBarInner() {
  const t = useTranslations('filters');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setFilter, filters } = useSearchStore();
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [cuisines, setCuisines] = useState<FilterOption[]>([]);
  const [occasions, setOccasions] = useState<FilterOption[]>([]);
  const [atmospheres, setAtmospheres] = useState<FilterOption[]>([]);
  const [entertainments, setEntertainments] = useState<FilterOption[]>([]);
  const [metroStations, setMetroStations] = useState<FilterOption[]>([]);
  const [districts, setDistricts] = useState<FilterOption[]>([]);
  const [venueTypes, setVenueTypes] = useState<FilterOption[]>([]);

  // Local state for occasion, atmosphere, entertainment, price range, metro, district, venue
  const [selectedOccasion, setSelectedOccasion] = useState<string | undefined>();
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string | undefined>();
  const [selectedEntertainment, setSelectedEntertainment] = useState<string | undefined>();
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [selectedMetro, setSelectedMetro] = useState<string | undefined>();
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const [selectedVenue, setSelectedVenue] = useState<string | undefined>();
  const [nearbyActive, setNearbyActive] = useState(false);
  const geoStatus = useGeoStore(s => s.status);
  const geoLat = useGeoStore(s => s.lat);
  const geoLng = useGeoStore(s => s.lng);
  const savedCitySlug = useCityStore(s => s.slug);

  // Geo is ready but NOT auto-activated — user must click "Рядом" manually

  useEffect(() => {
    Promise.all([
      referenceApi.getCities().catch(() => ({ data: [] })),
      referenceApi.getCuisines().catch(() => ({ data: [] })),
      referenceApi.getFeatures('occasion').catch(() => ({ data: [] })),
      referenceApi.getFeatures('atmosphere').catch(() => ({ data: [] })),
      referenceApi.getFeatures('entertainment').catch(() => ({ data: [] })),
      referenceApi.getVenueTypes().catch(() => ({ data: [] })),
    ]).then(([citiesRes, cuisinesRes, occasionsRes, atmospheresRes, entertainmentsRes, venueRes]) => {
      setCities((citiesRes.data || []).map((c: { name: string; slug: string }) => ({ label: c.name, value: c.slug })));
      setCuisines((cuisinesRes.data || []).map((c: { name: string; slug: string }) => ({ label: c.name, value: c.slug })));
      setOccasions((occasionsRes.data || []).map((f: { name: string; slug: string; icon?: string }) => ({ label: f.name, value: f.slug, icon: f.icon })));
      setAtmospheres((atmospheresRes.data || []).map((f: { name: string; slug: string; icon?: string }) => ({ label: f.name, value: f.slug, icon: f.icon })));
      setEntertainments((entertainmentsRes.data || []).map((f: { name: string; slug: string; icon?: string }) => ({ label: f.name, value: f.slug, icon: f.icon })));
      setVenueTypes((venueRes.data || []).map((v: { slug: string; name: string }) => ({ label: v.name, value: v.slug })));
    });
  }, []);

  // Load metro stations and districts when city changes
  useEffect(() => {
    const citySlug = filters.city;
    if (!citySlug) {
      setMetroStations([]);
      setDistricts([]);
      setSelectedMetro(undefined);
      setSelectedDistrict(undefined);
      return;
    }
    Promise.all([
      referenceApi.getMetroStations(citySlug).catch(() => ({ data: [] })),
      referenceApi.getDistricts(citySlug).catch(() => ({ data: [] })),
    ]).then(([metroRes, distRes]) => {
      setMetroStations((metroRes.data || []).map((m: { name: string }) => ({ label: m.name, value: m.name })));
      setDistricts((distRes.data || []).map((d: { name: string; slug: string }) => ({ label: d.name, value: d.slug })));
    });
  }, [filters.city]);

  useEffect(() => {
    const city = searchParams.get('city');
    const cuisine = searchParams.get('cuisine');
    const pMin = searchParams.get('priceLevelMin');
    const pMax = searchParams.get('priceLevelMax');
    const features = searchParams.get('features');
    const metro = searchParams.get('metro');
    const district = searchParams.get('district');
    const venueType = searchParams.get('venueType');
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');
    if (urlLat && urlLng) setNearbyActive(true);
    if (city) setFilter('city', city);
    if (cuisine) setFilter('cuisine', cuisine.split(','));
    if (pMin) setPriceMin(Number(pMin));
    if (pMax) setPriceMax(Number(pMax));
    if (metro) setSelectedMetro(metro);
    if (district) setSelectedDistrict(district);
    if (venueType) setSelectedVenue(venueType);
    if (features) {
      const slugs = features.split(',');
      // We'll restore occasion/atmosphere from URL after options load
      setSelectedOccasion(slugs.find(s => s) || undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply saved city from CityDetector when no city in URL
  useEffect(() => {
    const urlCity = searchParams.get('city');
    if (!urlCity && savedCitySlug && !filters.city) {
      setFilter('city', savedCitySlug);
      const params = new URLSearchParams(searchParams.toString());
      params.set('city', savedCitySlug);
      params.set('page', '1');
      router.replace(`/restaurants?${params.toString()}`);
    }
  }, [savedCitySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore occasion/atmosphere/entertainment from URL once options are loaded
  useEffect(() => {
    const features = searchParams.get('features');
    if (features && (occasions.length || atmospheres.length || entertainments.length)) {
      const slugs = features.split(',');
      const occasionSlugs = new Set(occasions.map(o => o.value));
      const atmosphereSlugs = new Set(atmospheres.map(a => a.value));
      const entertainmentSlugs = new Set(entertainments.map(e => e.value));
      setSelectedOccasion(slugs.find(s => occasionSlugs.has(s)));
      setSelectedAtmosphere(slugs.find(s => atmosphereSlugs.has(s)));
      setSelectedEntertainment(slugs.find(s => entertainmentSlugs.has(s)));
    }
  }, [occasions, atmospheres, entertainments, searchParams]);

  const buildFeaturesParam = useCallback((overrideOccasion?: string | null, overrideAtmo?: string | null, overrideEnt?: string | null) => {
    const occ = overrideOccasion === null ? undefined : (overrideOccasion ?? selectedOccasion);
    const atm = overrideAtmo === null ? undefined : (overrideAtmo ?? selectedAtmosphere);
    const ent = overrideEnt === null ? undefined : (overrideEnt ?? selectedEntertainment);
    const parts = [occ, atm, ent].filter(Boolean) as string[];
    return parts.length ? parts.join(',') : undefined;
  }, [selectedOccasion, selectedAtmosphere, selectedEntertainment]);

  const pushFilters = useCallback((overrides: Record<string, unknown> = {}, featuresOverride?: string | undefined) => {
    const current = useSearchStore.getState().filters;
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (merged.city) params.set('city', merged.city as string);
    if ((merged.cuisine as string[] | undefined)?.length) params.set('cuisine', (merged.cuisine as string[]).join(','));
    const pmn = (overrides.priceLevelMin !== undefined ? overrides.priceLevelMin : priceMin) as number | undefined;
    const pmx = (overrides.priceLevelMax !== undefined ? overrides.priceLevelMax : priceMax) as number | undefined;
    if (pmn) params.set('priceLevelMin', String(pmn));
    if (pmx) params.set('priceLevelMax', String(pmx));
    const feat = featuresOverride !== undefined ? featuresOverride : buildFeaturesParam();
    if (feat) params.set('features', feat);
    const metroVal = overrides.metro !== undefined ? overrides.metro as string | undefined : selectedMetro;
    const districtVal = overrides.district !== undefined ? overrides.district as string | undefined : selectedDistrict;
    const venueVal = overrides.venueType !== undefined ? overrides.venueType as string | undefined : selectedVenue;
    if (metroVal) params.set('metro', metroVal);
    if (districtVal) params.set('district', districtVal);
    if (venueVal) params.set('venueType', venueVal);
    // Geo: pass lat/lng from overrides or from active nearby filter
    const latVal = overrides.lat !== undefined ? overrides.lat as number | undefined : (nearbyActive && geoLat ? geoLat : undefined);
    const lngVal = overrides.lng !== undefined ? overrides.lng as number | undefined : (nearbyActive && geoLng ? geoLng : undefined);
    if (latVal && lngVal) { params.set('lat', String(latVal)); params.set('lng', String(lngVal)); }
    const search = searchParams.get('search');
    if (search) params.set('search', search);
    const qs = params.toString();
    router.push(`/restaurants${qs ? `?${qs}` : ''}`);
  }, [router, searchParams, buildFeaturesParam, selectedMetro, selectedDistrict, selectedVenue, nearbyActive, geoLat, geoLng]);

  const handleCityChange = (v: string | undefined) => {
    setFilter('city', v);
    setSelectedMetro(undefined);
    setSelectedDistrict(undefined);
    // Sync with global city store
    if (v) {
      const cityOption = cities.find(c => c.value === v);
      if (cityOption) useCityStore.getState().setCity(v, cityOption.label);
    }
    pushFilters({ city: v, metro: undefined, district: undefined });
  };

  const handleCuisineToggle = (slug: string) => {
    const current = filters.cuisine || [];
    const next = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
    setFilter('cuisine', next.length ? next : undefined);
    pushFilters({ cuisine: next.length ? next : undefined });
  };

  const handlePriceRangeChange = (min: number | undefined, max: number | undefined) => {
    setPriceMin(min);
    setPriceMax(max);
    pushFilters({ priceLevelMin: min, priceLevelMax: max });
  };

  const handleOccasionChange = (v: string | undefined) => {
    setSelectedOccasion(v);
    const feat = buildFeaturesParam(v === undefined ? null : v, undefined, undefined);
    pushFilters({}, feat);
  };

  const handleAtmosphereChange = (v: string | undefined) => {
    setSelectedAtmosphere(v);
    const feat = buildFeaturesParam(undefined, v === undefined ? null : v, undefined);
    pushFilters({}, feat);
  };

  const handleEntertainmentChange = (v: string | undefined) => {
    setSelectedEntertainment(v);
    const feat = buildFeaturesParam(undefined, undefined, v === undefined ? null : v);
    pushFilters({}, feat);
  };

  const handleMetroChange = (v: string | undefined) => {
    setSelectedMetro(v);
    pushFilters({ metro: v });
  };

  const handleDistrictChange = (v: string | undefined) => {
    setSelectedDistrict(v);
    pushFilters({ district: v });
  };

  const handleVenueChange = (v: string | undefined) => {
    setSelectedVenue(v);
    pushFilters({ venueType: v });
  };

  const handleNearbyToggle = () => {
    if (nearbyActive) {
      setNearbyActive(false);
      // Remove lat/lng from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('lat');
      params.delete('lng');
      params.set('page', '1');
      router.push(`/restaurants?${params.toString()}`);
    } else if (geoLat && geoLng) {
      setNearbyActive(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set('lat', String(geoLat));
      params.set('lng', String(geoLng));
      params.set('page', '1');
      router.push(`/restaurants?${params.toString()}`);
    } else {
      // Request geolocation — effect will handle activation
      useGeoStore.getState().requestLocation();
    }
  };

  // Active tags
  const activeTags: Array<{ key: string; label: string }> = [];
  if (filters.city) {
    const c = cities.find(c => c.value === filters.city);
    if (c) activeTags.push({ key: `city:${c.value}`, label: `📍 ${c.label}` });
  }
  (filters.cuisine || []).forEach(slug => {
    const c = cuisines.find(c => c.value === slug);
    if (c) activeTags.push({ key: `cuisine:${slug}`, label: c.label });
  });
  if (priceMin || priceMax) {
    const priceRangesLocal = [
      { min: 1, max: 1, label: t('priceTo700') },
      { min: 2, max: 2, label: t('price700to1500') },
      { min: 3, max: 3, label: t('price1500to3000') },
      { min: 4, max: 4, label: t('priceOver3000') },
    ];
    const range = priceRangesLocal.find(r => r.min === priceMin && r.max === priceMax);
    activeTags.push({ key: 'price', label: `💰 ${range?.label || t('bill')}` });
  }
  if (selectedOccasion) {
    const o = occasions.find(o => o.value === selectedOccasion);
    if (o) activeTags.push({ key: `occasion:${o.value}`, label: `${o.icon || ''} ${o.label}`.trim() });
  }
  if (selectedAtmosphere) {
    const a = atmospheres.find(a => a.value === selectedAtmosphere);
    if (a) activeTags.push({ key: `atmosphere:${a.value}`, label: `${a.icon || ''} ${a.label}`.trim() });
  }
  if (selectedEntertainment) {
    const e = entertainments.find(e => e.value === selectedEntertainment);
    if (e) activeTags.push({ key: `entertainment:${e.value}`, label: `${e.icon || ''} ${e.label}`.trim() });
  }
  if (selectedMetro) {
    activeTags.push({ key: `metro:${selectedMetro}`, label: `🚇 ${selectedMetro}` });
  }
  if (selectedDistrict) {
    const d = districts.find(d => d.value === selectedDistrict);
    if (d) activeTags.push({ key: `district:${d.value}`, label: `🏘 ${d.label}` });
  }
  if (selectedVenue) {
    const v = venueTypes.find(v => v.value === selectedVenue);
    if (v) activeTags.push({ key: `venue:${v.value}`, label: v.label });
  }
  if (nearbyActive) {
    activeTags.push({ key: 'nearby', label: `📍 ${t('nearbyTag')}` });
  }

  const handleRemoveTag = (key: string) => {
    if (key === 'price') return handlePriceRangeChange(undefined, undefined);
    if (key.startsWith('city:')) return handleCityChange(undefined);
    if (key.startsWith('cuisine:')) return handleCuisineToggle(key.split(':')[1]);
    if (key.startsWith('occasion:')) return handleOccasionChange(undefined);
    if (key.startsWith('atmosphere:')) return handleAtmosphereChange(undefined);
    if (key.startsWith('entertainment:')) return handleEntertainmentChange(undefined);
    if (key.startsWith('metro:')) return handleMetroChange(undefined);
    if (key.startsWith('district:')) return handleDistrictChange(undefined);
    if (key.startsWith('venue:')) return handleVenueChange(undefined);
    if (key === 'nearby') return handleNearbyToggle();
  };

  const handleClearAll = () => {
    setFilter('city', undefined);
    setFilter('cuisine', undefined);
    setPriceMin(undefined);
    setPriceMax(undefined);
    setSelectedOccasion(undefined);
    setSelectedAtmosphere(undefined);
    setSelectedEntertainment(undefined);
    setSelectedMetro(undefined);
    setSelectedDistrict(undefined);
    setSelectedVenue(undefined);
    setNearbyActive(false);
    const params = new URLSearchParams();
    const search = searchParams.get('search');
    if (search) params.set('search', search);
    const qs = params.toString();
    router.push(`/restaurants${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="filters-strip">
    <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 space-y-4">
      {/* Row 1: Dropdowns + Price + active tags */}
      <div className="flex items-center gap-3 flex-wrap">
        <CitySearch options={cities} value={filters.city} onChange={handleCityChange} placeholder={t('cityPlaceholder')} />
        {metroStations.length > 0 && (
          <MiniDropdown icon="🚇" label={t('metro')} options={metroStations} value={selectedMetro} onChange={handleMetroChange} searchable resetLabel={t('reset')} searchPlaceholder={t('searchPlaceholder')} nothingFoundLabel={t('nothingFound')} />
        )}
        {districts.length > 0 && (
          <MiniDropdown icon="🏘" label={t('district')} options={districts} value={selectedDistrict} onChange={handleDistrictChange} searchable resetLabel={t('reset')} searchPlaceholder={t('searchPlaceholder')} nothingFoundLabel={t('nothingFound')} />
        )}
        <MiniDropdown icon="🏠" label={t('venueType')} options={venueTypes} value={selectedVenue} onChange={handleVenueChange} searchable resetLabel={t('reset')} searchPlaceholder={t('searchPlaceholder')} nothingFoundLabel={t('nothingFound')} />
        <MiniDropdown icon="🎉" label={t('occasion')} options={occasions} value={selectedOccasion} onChange={handleOccasionChange} resetLabel={t('reset')} nothingFoundLabel={t('nothingFound')} />
        <MiniDropdown icon="✨" label={t('atmosphere')} options={atmospheres} value={selectedAtmosphere} onChange={handleAtmosphereChange} resetLabel={t('reset')} nothingFoundLabel={t('nothingFound')} />
        <MiniDropdown icon="🎭" label={t('entertainment')} options={entertainments} value={selectedEntertainment} onChange={handleEntertainmentChange} resetLabel={t('reset')} nothingFoundLabel={t('nothingFound')} />
        <PriceRangeSelector minVal={priceMin} maxVal={priceMax} onChange={handlePriceRangeChange} priceLabels={[t('priceTo700'), t('price700to1500'), t('price1500to3000'), t('priceOver3000')]} avgBillLabel={t('avgBill')} resetLabel={t('reset')} />
        <NearbyButton active={nearbyActive} onToggle={handleNearbyToggle} detectingLabel={t('nearbyDetecting')} activeLabel={t('nearbyActive')} nearbyLabel={t('nearby')} />
        {activeTags.length > 0 && (
          <>
            <div className="w-px h-7" style={{ background: 'var(--card-border)' }} />
            <ActiveTags tags={activeTags} onRemove={handleRemoveTag} onClear={handleClearAll} resetAllLabel={t('resetAll')} />
          </>
        )}
      </div>

      {/* Row 2: Cuisines */}
      {cuisines.length > 0 && (
        <CuisineSelector cuisines={cuisines} selected={filters.cuisine || []} onToggle={handleCuisineToggle} cuisineLabel={t('cuisine')} collapseLabel={t('collapse')} moreLabel={(count) => t('moreCount', { count })} />
      )}
    </div>
    </div>
  );
}

export function FiltersBar() {
  return (
    <Suspense fallback={<div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 py-5 h-[52px]" />}>
      <FiltersBarInner />
    </Suspense>
  );
}
