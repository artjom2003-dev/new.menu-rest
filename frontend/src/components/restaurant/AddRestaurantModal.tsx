'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface AddRestaurantModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddRestaurantModal({ open, onClose }: AddRestaurantModalProps) {
  const t = useTranslations('addRestaurant');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    restaurantName: '',
    city: '',
    address: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    website: '',
    comment: '',
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/restaurant-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || t('submitError'));
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('submitError'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = 'var(--accent)');
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = '');

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="border rounded-[22px] p-8 max-w-[520px] w-full relative max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer border transition-all"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-2">
              {t('successTitle')}
            </h2>
            <p className="text-[14px] text-[var(--text3)] mb-2 leading-relaxed">
              {t('successText')}
            </p>
            <p className="text-[13px] text-[var(--text3)] mb-6">
              {t('successNote')}
            </p>
            <button
              onClick={() => { setSuccess(false); setForm({ restaurantName: '', city: '', address: '', contactName: '', contactPhone: '', contactEmail: '', website: '', comment: '' }); onClose(); }}
              className="px-6 py-3 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer"
              style={{ background: 'var(--accent)' }}
            >
              {t('successButton')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-1">
                {t('title')}
              </h2>
              <p className="text-[13px] text-[var(--text3)] leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Restaurant info */}
              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                  {t('labelRestaurantName')}
                </label>
                <input
                  required
                  value={form.restaurantName}
                  onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                  placeholder={t('placeholderName')}
                  className={inputClass}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                    {t('labelCity')}
                  </label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder={t('placeholderCity')}
                    className={inputClass}
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                    {t('labelAddress')}
                  </label>
                  <input
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={t('placeholderAddress')}
                    className={inputClass}
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative text-center text-[11px] text-[var(--text3)] my-1">
                <span className="relative z-10 px-2" style={{ background: 'var(--bg2)' }}>
                  {t('contactDetails')}
                </span>
                <div
                  className="absolute inset-y-1/2 left-0 right-0 h-px"
                  style={{ background: 'var(--card-border)' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                  {t('labelContactName')}
                </label>
                <input
                  required
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder={t('placeholderContactName')}
                  className={inputClass}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                    {t('labelPhone')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder={t('placeholderPhone')}
                    className={inputClass}
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                    {t('labelEmail')}
                  </label>
                  <input
                    type="email"
                    required
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder={t('placeholderEmail')}
                    className={inputClass}
                    style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                  {t('labelWebsite')}
                </label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder={t('placeholderWebsite')}
                  className={inputClass}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">
                  {t('labelComment')}
                </label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={2}
                  placeholder={t('placeholderComment')}
                  className="w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border resize-none"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all disabled:opacity-60"
                style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
              >
                {loading ? t('submitting') : t('submit')}
              </button>

              <p className="text-[11px] text-[var(--text4)] text-center">
                {t('footnote')}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
