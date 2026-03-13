'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api';
import { AuthModal } from '@/components/auth/AuthModal';

function LoginPageInner() {
  const { isLoggedIn, setUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;

    // Handle OAuth callback token (from VK redirect)
    const token = searchParams.get('token');
    if (token) {
      setHandled(true);
      localStorage.setItem('access_token', token);
      authApi.me().then(res => {
        setUser(res.data, token);
        router.push('/profile');
      }).catch(() => router.push('/login'));
      return;
    }

    // Handle Telegram callback
    const provider = searchParams.get('provider');
    if (provider === 'telegram' && searchParams.get('id')) {
      setHandled(true);
      const data: Record<string, string> = {};
      searchParams.forEach((v, k) => { if (k !== 'provider') data[k] = v; });
      fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(r => r.json())
        .then(res => {
          if (res.accessToken) {
            localStorage.setItem('access_token', res.accessToken);
            setUser(res.user, res.accessToken);
            router.push('/profile');
          }
        })
        .catch(() => {});
      return;
    }
  }, [handled, searchParams, setUser, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <AuthModal open={true} onClose={() => router.push('/')} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><p className="text-[var(--text3)]">Загрузка...</p></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
