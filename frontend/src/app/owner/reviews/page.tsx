'use client';

import { useEffect, useState } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import api from '@/lib/api';

interface Review {
  id: number;
  authorName: string;
  authorAvatarUrl?: string;
  ratingFood: number;
  ratingService: number;
  ratingAmbiance: number;
  ratingValue: number;
  text: string;
  createdAt: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[12px]" style={{ color: '#ffb428' }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export default function OwnerReviewsPage() {
  const { myRestaurant } = useOwner();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myRestaurant) return;
    (async () => {
      try {
        const res = await api.get(`/reviews/restaurant/${myRestaurant.id}`);
        setReviews(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch {
        // no reviews
      } finally {
        setLoading(false);
      }
    })();
  }, [myRestaurant]);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.ratingFood + r.ratingService + r.ratingAmbiance + r.ratingValue) / 4, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 className="font-serif text-[22px] font-bold text-[var(--text)] m-0">Отзывы</h1>
        <span className="rounded-[10px] px-3 py-1 text-[13px] font-bold" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
          {reviews.length} отзывов | Средний: {avgRating}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <div className="text-[36px] mb-3">⭐</div>
          <p className="text-[var(--text3)] text-[14px]">Отзывов пока нет.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(r => (
            <div key={r.id} className="rounded-[14px] border p-4"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ width: 32, height: 32, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>
                  {r.authorName?.[0] || '?'}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[var(--text)]">{r.authorName}</div>
                  <div className="text-[11px] text-[var(--text3)]">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="text-[11px] text-[var(--text3)]">Кухня <Stars rating={r.ratingFood} /></span>
                <span className="text-[11px] text-[var(--text3)]">Сервис <Stars rating={r.ratingService} /></span>
                <span className="text-[11px] text-[var(--text3)]">Атмосфера <Stars rating={r.ratingAmbiance} /></span>
                <span className="text-[11px] text-[var(--text3)]">Цена/качество <Stars rating={r.ratingValue} /></span>
              </div>
              <p className="text-[13px] text-[var(--text2)] m-0">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
