'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import VacanciesSection from '../owner/vacancies/page';
import SuppliersSection from '../owner/suppliers/page';

type Section = 'vacancies' | 'suppliers';

export default function MarketplacePage() {
  const router = useRouter();
  const { user, isLoggedIn, _hydrated } = useAuthStore();
  const [section, setSection] = useState<Section>('vacancies');

  useEffect(() => {
    if (!_hydrated) return;
    if (!isLoggedIn) { router.replace('/login'); return; }
    if (user?.role !== 'owner' && user?.role !== 'admin') { router.replace('/'); return; }
  }, [_hydrated, isLoggedIn, user?.role, router]);

  if (!_hydrated || !isLoggedIn) return null;
  if (user?.role !== 'owner' && user?.role !== 'admin') return null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 20px 40px' }}>
      {/* Section toggle */}
      <div className="flex gap-2 mb-6">
        {([
          ['vacancies', '👥 Вакансии'],
          ['suppliers', '📦 Поставщики'],
        ] as [Section, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer border transition-all"
            style={{
              background: section === id
                ? 'linear-gradient(135deg, var(--accent), #ff8c42)'
                : 'var(--bg2)',
              color: section === id ? '#fff' : 'var(--text3)',
              borderColor: section === id ? 'transparent' : 'var(--card-border)',
              boxShadow: section === id ? '0 4px 16px var(--accent-glow)' : 'none',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (section !== id) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (section !== id) {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.color = 'var(--text3)';
              }
            }}>
            {label}
          </button>
        ))}
      </div>

      {section === 'vacancies' && <VacanciesSection />}
      {section === 'suppliers' && <SuppliersSection />}
    </div>
  );
}
