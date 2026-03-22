'use client';

import { useState, useEffect } from 'react';
import { listingApi } from '@/lib/api';

interface Listing {
  id: number; type: string; title: string; description?: string; category?: string;
  salary?: string; contactInfo?: string; createdAt?: string;
  restaurant?: { name: string; slug: string };
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<'job' | 'supplier'>('job');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listingApi.getPublic(tab).then(r => setListings(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12">
      <h1 className="font-serif text-[28px] font-bold text-[var(--text)] mb-1">Доска объявлений</h1>
      <p className="text-[14px] text-[var(--text3)] mb-8">Вакансии ресторанов и предложения поставщиков</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([['job', 'Вакансии'], ['supplier', 'Поставщики']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className="rounded-[12px] px-5 py-2.5 text-[14px] font-bold border-0 cursor-pointer transition-all"
            style={{ background: tab === val ? 'linear-gradient(135deg, var(--accent), #ff8c42)' : 'var(--bg2)', color: tab === val ? '#fff' : 'var(--text3)', border: tab === val ? 'none' : '1px solid var(--card-border)' }}>
            {val === 'job' ? '🧑‍🍳' : '📦'} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text3)] text-[14px] text-center py-12">Загрузка...</p>
      ) : listings.length === 0 ? (
        <div className="rounded-[16px] border p-10 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <p className="text-[var(--text3)] text-[14px]">{tab === 'job' ? 'Вакансий пока нет' : 'Предложений поставщиков пока нет'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {listings.map(l => (
            <div key={l.id} className="rounded-[14px] border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {l.restaurant && <span className="text-[12px] font-semibold text-[var(--accent)]">{l.restaurant.name}</span>}
                {l.category && <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>{l.category}</span>}
              </div>
              <h3 className="text-[16px] font-bold text-[var(--text)] m-0 mb-1">{l.title}</h3>
              {l.description && <p className="text-[13px] text-[var(--text2)] m-0 line-clamp-2">{l.description}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-[var(--text3)]">
                {l.salary && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{l.salary}</span>}
                {l.contactInfo && <span>{l.contactInfo}</span>}
                {l.createdAt && <span>{new Date(l.createdAt).toLocaleDateString('ru-RU')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
