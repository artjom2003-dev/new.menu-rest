'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Branch {
  id: number;
  slug: string;
  name: string;
  address: string;
  metroStation?: string;
  rating: string;
  reviewCount: number;
  city?: { id: number; name: string };
  lat?: number;
  lng?: number;
}

function pluralBranch(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'филиал';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'филиала';
  return 'филиалов';
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function BranchSelector({ slug }: { slug: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sortNearest, setSortNearest] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/restaurants/${slug}/branches`)
      .then(res => setBranches(res.data))
      .catch(() => {});
  }, [slug]);

  // Deduplicate
  const uniqueBranches = useMemo(() => {
    const valid = branches.filter(b => b.address);
    const seen = new Set<string>();
    return valid.filter(b => {
      const key = b.address.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [branches]);

  const current = uniqueBranches.find(b => b.slug === slug) || uniqueBranches[0];
  const others = uniqueBranches.filter(b => b.slug !== current?.slug);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = others;
    if (q) {
      list = others.filter(b =>
        b.address.toLowerCase().includes(q) ||
        (b.metroStation || '').toLowerCase().includes(q) ||
        (b.city?.name || '').toLowerCase().includes(q)
      );
    }
    if (sortNearest && userPos) {
      list = [...list].sort((a, b) => {
        const dA = a.lat && a.lng ? getDistanceKm(userPos.lat, userPos.lng, a.lat, a.lng) : 99999;
        const dB = b.lat && b.lng ? getDistanceKm(userPos.lat, userPos.lng, b.lat, b.lng) : 99999;
        return dA - dB;
      });
    }
    return list;
  }, [others, search, sortNearest, userPos]);

  const handleNearby = () => {
    if (userPos) {
      setSortNearest(!sortNearest);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortNearest(true);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  const formatDist = (b: Branch) => {
    if (!userPos || !b.lat || !b.lng) return null;
    const d = getDistanceKm(userPos.lat, userPos.lng, b.lat, b.lng);
    return d < 1 ? `${Math.round(d * 1000)} м` : `${d.toFixed(1)} км`;
  };

  // Sample address for placeholder
  const sampleAddr = useMemo(() => {
    if (!others.length) return 'Введите улицу...';
    const addr = others[Math.floor(others.length / 2)]?.address || '';
    const street = addr.split(',')[0]?.trim();
    return street ? `Например: ${street}` : 'Введите улицу...';
  }, [others]);

  if (uniqueBranches.length <= 1) return null;

  const showSearch = others.length > 4;
  const MAX_VISIBLE = 8;
  const visibleList = filtered.slice(0, open ? undefined : MAX_VISIBLE);
  const hasMore = !open && filtered.length > MAX_VISIBLE;

  return (
    <div className="mt-6 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-[14px] border transition-colors duration-200"
        style={{
          background: 'var(--bg2)',
          borderColor: open ? 'var(--accent)' : 'var(--card-border)',
        }}>
        <div className="flex items-center gap-3">
          <span className="text-[16px]">📍</span>
          <div className="text-left">
            <p className="text-[13px] font-medium text-[var(--text)]">
              Сеть — {uniqueBranches.length} {pluralBranch(uniqueBranches.length)}
            </p>
            <p className="text-[12px] text-[var(--text3)] mt-0.5">
              Сейчас: {current?.address || 'Этот филиал'}{current?.city ? `, ${current.city.name}` : ''}
            </p>
          </div>
        </div>
        <span className="text-[var(--text3)] text-[14px] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-[14px] border overflow-hidden"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

          {/* Search + nearby */}
          {showSearch && (
            <div className="px-4 py-3 flex gap-2 items-center"
              style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--text3)] pointer-events-none">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={sampleAddr}
                  className="w-full pl-9 pr-3 py-2 rounded-[10px] border text-[13px] outline-none transition-colors"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: search ? 'var(--accent)' : 'var(--card-border)',
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { if (!search) e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={handleNearby}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] border text-[12px] font-medium transition-all"
                style={{
                  background: sortNearest ? 'var(--accent)' : 'var(--bg3)',
                  borderColor: sortNearest ? 'var(--accent)' : 'var(--card-border)',
                  color: sortNearest ? '#fff' : 'var(--text2)',
                }}>
                {geoLoading ? '...' : '📍'} Рядом
              </button>
            </div>
          )}

          {/* Results count when searching */}
          {search && (
            <div className="px-5 py-2 text-[11px] text-[var(--text3)]"
              style={{ borderBottom: '1px solid var(--card-border)' }}>
              {filtered.length === 0
                ? 'Ничего не найдено'
                : `Найдено: ${filtered.length} ${pluralBranch(filtered.length)}`}
            </div>
          )}

          {/* Branch list */}
          <div className={others.length > 6 ? 'max-h-[280px] overflow-y-auto' : ''}>
            {visibleList.map((branch, i) => {
              const dist = formatDist(branch);
              return (
                <Link
                  key={branch.id}
                  href={`/restaurants/${branch.slug}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors duration-150 hover:bg-[var(--bg3)]"
                  style={{ borderTop: i > 0 ? '1px solid var(--card-border)' : undefined }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">
                      {branch.address}
                    </p>
                    <p className="text-[11px] text-[var(--text3)] mt-0.5 truncate">
                      {[branch.city?.name, branch.metroStation ? `м. ${branch.metroStation}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {dist && (
                      <span className="text-[11px] text-[var(--teal)] font-medium">
                        {dist}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Show all button */}
          {hasMore && (
            <button
              onClick={() => setOpen(true)}
              className="w-full px-5 py-2.5 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--bg3)] transition-colors"
              style={{ borderTop: '1px solid var(--card-border)' }}>
              Показать все {filtered.length} {pluralBranch(filtered.length)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
