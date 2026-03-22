'use client';

import Link from 'next/link';
import { useOwner } from '@/components/owner/OwnerContext';

export default function OwnerDashboard() {
  const { myRestaurant } = useOwner();

  if (!myRestaurant) {
    return (
      <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
        <p className="text-[var(--text2)] text-[15px]">Ресторан не привязан к вашему аккаунту.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Рейтинг', value: myRestaurant.rating ? Number(myRestaurant.rating).toFixed(1) : '—', icon: '⭐' },
    { label: 'Отзывов', value: myRestaurant.reviewCount ?? 0, icon: '💬' },
    { label: 'Фото', value: myRestaurant.photos?.length ?? 0, icon: '📸' },
    { label: 'Средний чек', value: myRestaurant.averageBill ? `${myRestaurant.averageBill} ₽` : '—', icon: '💰' },
  ];

  const actions = [
    { label: 'Редактировать карточку', href: '/owner/edit', icon: '✏️' },
    { label: 'Загрузить фото', href: '/owner/photos', icon: '📸' },
    { label: 'Создать публикацию', href: '/owner/posts', icon: '📝' },
  ];

  return (
    <div>
      <h1 className="font-serif text-[24px] font-bold text-[var(--text)] mb-6">{myRestaurant.name}</h1>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="rounded-[16px] border p-4"
            style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
            <div className="text-[20px] mb-1">{s.icon}</div>
            <div className="text-[22px] font-bold text-[var(--text)]">{s.value}</div>
            <div className="text-[12px] text-[var(--text3)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Public page link */}
      <div className="rounded-[16px] border p-4 mb-6"
        style={{ borderColor: 'var(--card-border)', background: 'linear-gradient(135deg, rgba(255,92,40,0.05), rgba(57,255,209,0.03))' }}>
        <Link href={`/restaurants/${myRestaurant.slug}`}
          className="text-[14px] text-[var(--accent)] font-semibold no-underline hover:underline">
          Открыть публичную страницу ресторана →
        </Link>
      </div>

      {/* Quick actions */}
      <h2 className="font-serif text-[18px] font-bold text-[var(--text)] mb-3">Быстрые действия</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {actions.map(a => (
          <Link key={a.href} href={a.href}
            className="rounded-[14px] border px-5 py-3 no-underline text-[14px] font-semibold transition-all"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
            }}>
            <span className="mr-2">{a.icon}</span>{a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
