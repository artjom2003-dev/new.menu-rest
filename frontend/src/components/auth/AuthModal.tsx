'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuthStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', city: '' });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = mode === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register({ name: form.name, email: form.email, password: form.password });

      setUser(res.data.user, res.data.accessToken);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="border rounded-[22px] p-9 max-w-[420px] w-full relative"
        style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer border transition-all"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          ✕
        </button>

        <h2 className="font-serif text-[26px] font-black text-[var(--text)] mb-1">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h2>
        <p className="text-[13px] text-[var(--text3)] mb-6">
          {mode === 'login'
            ? 'Войдите, чтобы копить бонусы и сохранять избранное'
            : 'Создайте аккаунт для бонусов и рекомендаций'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="mb-3.5">
              <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">Имя</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Александр"
                className="w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '')}
              />
            </div>
          )}

          <div className="mb-3.5">
            <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '')}
            />
          </div>

          <div className="mb-3.5">
            <label className="text-[11px] font-semibold text-[var(--text2)] block mb-1.5">Пароль</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-[10px] text-[14px] font-sans text-[var(--text)] outline-none transition-all border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '')}
            />
          </div>

          {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all mt-1.5 disabled:opacity-60"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative text-center text-[11px] text-[var(--text3)] my-3.5">
          <span className="relative z-10 px-2" style={{ background: 'var(--bg2)' }}>или</span>
          <div className="absolute inset-y-1/2 left-0 right-0 h-px" style={{ background: 'var(--card-border)' }} />
        </div>

        {/* Social */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/vk`; }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
            🔵 Войти через VK
          </button>
          <button
            onClick={() => {
              const botName = 'menurest_bot';
              const redirectUrl = encodeURIComponent(window.location.origin + '/login?provider=telegram');
              window.location.href = `https://oauth.telegram.org/auth?bot_id=${botName}&origin=${window.location.origin}&embed=0&request_access=write&return_to=${redirectUrl}`;
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
            📱 Войти через Telegram
          </button>
        </div>

        <p className="text-center text-[12px] text-[var(--text3)] mt-4">
          {mode === 'login' ? (
            <>Нет аккаунта? <button onClick={() => setMode('register')} className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">Регистрация</button></>
          ) : (
            <>Уже есть аккаунт? <button onClick={() => setMode('login')} className="text-[var(--accent)] font-semibold cursor-pointer bg-none border-none">Войти</button></>
          )}
        </p>
      </div>
    </div>
  );
}
