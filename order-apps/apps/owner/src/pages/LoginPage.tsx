import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { user, accessToken } = res.data;
      if (user.role !== 'owner' && user.role !== 'admin') {
        setError('\u0414\u043E\u0441\u0442\u0443\u043F \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0440\u0435\u0441\u0442\u043E\u0440\u0430\u0442\u043E\u0440\u043E\u0432');
        setLoading(false);
        return;
      }
      setAuth(user, accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-xs font-black text-white">MR</span>
            <span className="text-xl font-bold text-text-primary">
              Menu<span className="text-primary">Rest</span>
            </span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{'\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u0440\u0435\u0441\u0442\u043E\u0440\u0430\u0442\u043E\u0440\u0430'}</h1>
          <p className="text-sm text-text-muted mt-1">{'\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0440\u0435\u0441\u0442\u043E\u0440\u0430\u043D\u043E\u043C'}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition"
              placeholder="owner@restaurant.ru"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">{'\u041F\u0430\u0440\u043E\u043B\u044C'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition"
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover disabled:opacity-50 transition"
          >
            {loading ? '\u0412\u0445\u043E\u0434...' : '\u0412\u043E\u0439\u0442\u0438'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-4">
          {'\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430? '}<a href="https://new.menu-rest.com/for-business" className="text-primary hover:underline">{'\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0441\u0442\u043E\u0440\u0430\u043D'}</a>
        </p>
      </div>
    </div>
  );
}
