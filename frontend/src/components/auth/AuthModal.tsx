'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { authApi } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { setUser } = useAuthStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', code: '', newPassword: '' });
  const [consent, setConsent] = useState(false);

  // Подхватываем реферальный код из URL (?ref=XXXX)
  const [refCode, setRefCode] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authApi.login(form.email, form.password);
        useFavoritesStore.getState().clear();
        useWishlistStore.getState().clear();
        setUser(res.data.user, res.data.accessToken);
        onClose();
      } else if (mode === 'register') {
        const res = await authApi.register({ name: form.name, email: form.email, password: form.password, ...(refCode ? { referralCode: refCode } : {}) });
        useFavoritesStore.getState().clear();
        useWishlistStore.getState().clear();
        setUser(res.data.user, res.data.accessToken);
        onClose();
      } else if (mode === 'forgot') {
        await authApi.forgotPassword(form.email);
        setSuccess(t('codeSent'));
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await authApi.resetPassword({ email: form.email, code: form.code, newPassword: form.newPassword });
        setUser(res.data.user, res.data.accessToken);
        onClose();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border";

  const renderInput = (
    label: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    extra?: { required?: boolean; minLength?: number; maxLength?: number; inputMode?: string; passwordToggle?: [boolean, (v: boolean) => void] },
  ) => {
    const isPassword = type === 'password';
    const [visible, setVisible] = isPassword && extra?.passwordToggle ? extra.passwordToggle : [false, () => {}];

    return (
      <div className="mb-3.5">
        <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">{label}</label>
        <div className="relative">
          <input
            type={isPassword && visible ? 'text' : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={extra?.required !== false}
            minLength={extra?.minLength}
            maxLength={extra?.maxLength}
            inputMode={extra?.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
            className={inputClass}
            style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)', paddingRight: isPassword ? '44px' : undefined }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '')}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full border-0 cursor-pointer transition-colors"
              style={{ background: 'transparent', color: 'var(--text3)' }}
              tabIndex={-1}
              title={visible ? t('hidePassword') : t('showPassword')}>
              {visible ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const titles: Record<Mode, string> = {
    login: t('titleLogin'),
    register: t('titleRegister'),
    forgot: t('titleForgot'),
    reset: t('titleReset'),
  };

  const subtitles: Record<Mode, string> = {
    login: t('subtitleLogin'),
    register: t('subtitleRegister'),
    forgot: t('subtitleForgot'),
    reset: t('subtitleReset'),
  };

  const buttonLabels: Record<Mode, string> = {
    login: t('buttonLogin'),
    register: t('buttonRegister'),
    forgot: t('buttonForgot'),
    reset: t('buttonReset'),
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="border rounded-[22px] p-9 max-sm:p-5 max-w-[420px] w-full relative"
        style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer border transition-all"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          ✕
        </button>

        <h2 className="font-serif text-[26px] font-black text-[var(--text)] mb-1">
          {titles[mode]}
        </h2>
        <p className="text-[13px] text-[var(--text3)] mb-6">
          {subtitles[mode]}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Имя — только регистрация */}
          {mode === 'register' && renderInput(
            t('labelName'), 'text', form.name,
            (v) => setForm({ ...form, name: v }),
            t('placeholderName'),
          )}

          {/* Email — логин, регистрация, forgot */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && renderInput(
            t('labelEmail'), 'email', form.email,
            (v) => setForm({ ...form, email: v }),
            t('placeholderEmail'),
          )}

          {/* Пароль — логин, регистрация */}
          {(mode === 'login' || mode === 'register') && renderInput(
            t('labelPassword'), 'password', form.password,
            (v) => setForm({ ...form, password: v }),
            t('placeholderPassword'),
            { minLength: 8, passwordToggle: [showPassword, setShowPassword] },
          )}

          {/* Код из письма — reset */}
          {mode === 'reset' && renderInput(
            t('labelCode'), 'text', form.code,
            (v) => setForm({ ...form, code: v.replace(/\D/g, '').slice(0, 6) }),
            t('placeholderCode'),
            { maxLength: 6, minLength: 6, inputMode: 'numeric' },
          )}

          {/* Новый пароль — reset */}
          {mode === 'reset' && renderInput(
            t('labelNewPassword'), 'password', form.newPassword,
            (v) => setForm({ ...form, newPassword: v }),
            t('placeholderPassword'),
            { minLength: 8, passwordToggle: [showNewPassword, setShowNewPassword] },
          )}

          {/* Согласие на обработку ПД — только регистрация (152-ФЗ) */}
          {mode === 'register' && (
            <label className="flex items-start gap-2.5 cursor-pointer mb-2 mt-1">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-[11px] text-[var(--text3)] leading-[1.5]">
                {t('consentText')}{' '}
                <Link href="/privacy" target="_blank" className="text-[var(--accent)] underline">
                  {t('consentPrivacy')}
                </Link>{' '}
                {t('consentAnd')}{' '}
                <Link href="/consent" target="_blank" className="text-[var(--accent)] underline">
                  {t('consentProcessing')}
                </Link>
              </span>
            </label>
          )}

          {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}
          {success && <p className="text-[12px] text-green-400 mb-3">{success}</p>}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && !consent)}
            className="w-full flex items-center justify-center py-3.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all mt-1.5 disabled:opacity-60"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            {loading ? '...' : buttonLabels[mode]}
          </button>
        </form>

        {/* Забыли пароль — только на экране логина */}
        {mode === 'login' && (
          <p className="text-center text-[12px] text-[var(--text3)] mt-3">
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">
              {t('forgotPassword')}
            </button>
          </p>
        )}

        {/* Вернуться к вводу email — на экране reset */}
        {mode === 'reset' && (
          <p className="text-center text-[12px] text-[var(--text3)] mt-3">
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">
              {t('resendCode')}
            </button>
          </p>
        )}

        {/* Social OAuth — uncomment when VK/Telegram OAuth is implemented on backend
        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="relative text-center text-[11px] text-[var(--text3)] my-3.5">
              <span className="relative z-10 px-2" style={{ background: 'var(--bg2)' }}>{t('or')}</span>
              <div className="absolute inset-y-1/2 left-0 right-0 h-px" style={{ background: 'var(--card-border)' }} />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/vk`; }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                {t('loginVk')}
              </button>
              <button onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/telegram`; }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                {t('loginTelegram')}
              </button>
            </div>
          </>
        )}
        */}

        {/* Переключение login/register */}
        {(mode === 'login' || mode === 'register') && (
          <p className="text-center text-[12px] text-[var(--text3)] mt-4">
            {mode === 'login' ? (
              <>{t('noAccount')} <button onClick={() => { setMode('register'); setError(''); }} className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">{t('register')}</button></>
            ) : (
              <>{t('hasAccount')} <button onClick={() => { setMode('login'); setError(''); }} className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">{t('login')}</button></>
            )}
          </p>
        )}

        {/* Назад к логину — из forgot/reset */}
        {(mode === 'forgot' || mode === 'reset') && (
          <p className="text-center text-[12px] text-[var(--text3)] mt-4">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">
              {t('backToLogin')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
