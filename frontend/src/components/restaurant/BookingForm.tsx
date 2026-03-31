'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { bookingApi } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface BookingFormProps {
  restaurantId: number;
  restaurantName: string;
  open: boolean;
  onClose: () => void;
}

export function BookingForm({ restaurantId, restaurantName, open, onClose }: BookingFormProps) {
  const t = useTranslations('booking');
  const { isLoggedIn, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    bookingDate: '',
    bookingTime: '19:00',
    guestsCount: 2,
    contactName: user?.name || '',
    contactPhone: '',
    comment: '',
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setError('Для бронирования необходимо войти в аккаунт');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await bookingApi.create({
        restaurantId,
        bookingDate: form.bookingDate,
        bookingTime: form.bookingTime,
        guestsCount: form.guestsCount,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        comment: form.comment || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || t('error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="border rounded-[22px] p-8 max-sm:p-5 max-w-[480px] w-full relative"
        style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

        <button onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer border"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>✕</button>

        {!isLoggedIn ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-2">Необходима авторизация</h2>
            <p className="text-[14px] text-[var(--text3)] mb-6">
              Для бронирования столика необходимо войти в аккаунт или зарегистрироваться
            </p>
            <a href="/login"
              className="inline-block px-8 py-3 rounded-full text-[14px] font-semibold text-white no-underline"
              style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              Войти / Зарегистрироваться
            </a>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-2">{t('successTitle')}</h2>
            <p className="text-[14px] text-[var(--text3)] mb-6">
              {t('successText')}
            </p>
            <button onClick={onClose}
              className="px-6 py-3 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer"
              style={{ background: 'var(--accent)' }}>
              {t('done')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-1">{t('title')}</h2>
            <p className="text-[13px] text-[var(--text3)] mb-6">{restaurantName}</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelDate')}</label>
                  <input type="date" required value={form.bookingDate}
                    onChange={e => setForm({ ...form, bookingDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelTime')}</label>
                  <input type="time" required value={form.bookingTime}
                    onChange={e => setForm({ ...form, bookingTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelGuests')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, guestsCount: n })}
                      className="w-10 h-10 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
                      style={{
                        background: form.guestsCount === n ? 'var(--accent)' : 'var(--bg3)',
                        color: form.guestsCount === n ? '#fff' : 'var(--text2)',
                        borderColor: form.guestsCount === n ? 'var(--accent)' : 'var(--card-border)',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelName')}</label>
                <input required value={form.contactName}
                  onChange={e => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelPhone')}</label>
                <input type="tel" required value={form.contactPhone}
                  onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder={t('placeholderPhone')}
                  className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{t('labelWishes')}</label>
                <textarea value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  rows={2} placeholder={t('placeholderWishes')}
                  className="w-full px-4 py-3 rounded-[10px] text-[14px] text-[var(--text)] outline-none border resize-none"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }} />
              </div>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all disabled:opacity-60"
                style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
                {loading ? t('submitting') : t('submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
