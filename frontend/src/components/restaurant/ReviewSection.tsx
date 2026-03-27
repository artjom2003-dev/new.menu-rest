'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslations } from 'next-intl';

interface Review {
  id: number;
  ratingFood: number | null;
  ratingService: number | null;
  ratingAtmosphere: number | null;
  ratingValue: number | null;
  ratingOverall: number;
  text: string | null;
  authorName: string | null;
  createdAt: string;
  user?: { name: string; avatarUrl?: string } | null;
}

interface ReviewSectionProps {
  restaurantId: number;
}

export function ReviewSection({ restaurantId }: ReviewSectionProps) {
  const t = useTranslations('review');
  const { isLoggedIn } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    ratingFood: 5, ratingService: 5, ratingAtmosphere: 5, ratingValue: 5, text: '',
  });

  const RATING_LABELS = [
    { key: 'ratingFood', label: t('ratingFood'), icon: '🍽️' },
    { key: 'ratingService', label: t('ratingService'), icon: '👨‍🍳' },
    { key: 'ratingAtmosphere', label: t('ratingAtmosphere'), icon: '🕯️' },
    { key: 'ratingValue', label: t('ratingValue'), icon: '💰' },
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/reviews/restaurant/${restaurantId}`)
      .then(r => r.json())
      .then(data => setReviews(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ restaurantId, ...form }),
      });
      if (!res.ok) throw new Error('error');
      setSuccess(true);
      setShowForm(false);
    } catch { setError(t('submitError')); }
    setSubmitting(false);
  };

  const Stars = ({ rating }: { rating: number }) => (
    <span className="text-[var(--gold)]">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
  );

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-[24px] font-bold text-[var(--text)]">
          {t('title')} {reviews.length > 0 && <span className="text-[var(--text3)] font-normal text-[16px]">({reviews.length})</span>}
        </h2>
        {isLoggedIn && !showForm && !success && (
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
            style={{ background: 'var(--accent)' }}>
            {t('leaveReview')}
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-[16px] border p-5 mb-6 text-center"
          style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}>
          <p className="text-[14px] text-emerald-400 font-semibold">{t('sentModeration')}</p>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit}
          className="rounded-[20px] border p-6 mb-8"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <h3 className="text-[16px] font-semibold text-[var(--text)] mb-4">{t('yourReview')}</h3>

          <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
            {RATING_LABELS.map(({ key, label, icon }) => (
              <div key={key}>
                <label className="text-[12px] text-[var(--text3)] font-semibold mb-2 block">{icon} {label}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm({ ...form, [key]: v })}
                      className="w-9 h-9 rounded-full text-[14px] cursor-pointer border transition-all"
                      style={{
                        background: (form as Record<string, unknown>)[key] === v ? 'var(--accent)' : 'var(--bg3)',
                        color: (form as Record<string, unknown>)[key] === v ? '#fff' : 'var(--text3)',
                        borderColor: (form as Record<string, unknown>)[key] === v ? 'var(--accent)' : 'var(--card-border)',
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <textarea value={form.text}
            onChange={e => setForm({ ...form, text: e.target.value })}
            rows={3} placeholder={t('placeholderText')}
            className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border resize-none mb-4"
            style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />

          {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-6 py-3 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
              style={{ background: 'var(--accent)' }}>
              {submitting ? t('submitting') : t('submit')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-full text-[13px] text-[var(--text3)] cursor-pointer border"
              style={{ background: 'var(--glass)', borderColor: 'var(--glass-border)' }}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[120px] rounded-[16px] animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 rounded-[20px] border" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <div className="text-4xl mb-3">💬</div>
          <p className="text-[15px] text-[var(--text2)]">{t('noReviews')}</p>
          <p className="text-[13px] text-[var(--text3)]">{t('beFirst')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="rounded-[16px] border p-5"
              style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[16px]"
                    style={{ background: 'var(--bg3)' }}>
                    {review.user?.avatarUrl ? (
                      <img src={review.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : '👤'}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text)]">
                      {review.user?.name || review.authorName || t('guest')}
                    </div>
                    <div className="text-[11px] text-[var(--text3)]">
                      {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-bold text-[var(--gold)]">
                    {Number(review.ratingOverall).toFixed(1)}
                  </span>
                  <Stars rating={Math.round(review.ratingOverall)} />
                </div>
              </div>

              {/* Sub-ratings */}
              <div className="flex gap-4 mb-3 flex-wrap">
                {RATING_LABELS.map(({ key, label, icon }) => {
                  const val = review[key as keyof Review] as number | null;
                  if (!val) return null;
                  return (
                    <span key={key} className="text-[11px] text-[var(--text3)]">
                      {icon} {label}: <span className="font-semibold text-[var(--text2)]">{val}/5</span>
                    </span>
                  );
                })}
              </div>

              {review.text && (
                <p className="text-[14px] text-[var(--text2)] leading-[1.6]">{review.text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
