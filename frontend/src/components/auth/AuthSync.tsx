'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userApi } from '@/lib/api';

/**
 * Bump this number to force all users to re-login.
 * When the stored version doesn't match, all auth data is cleared.
 */
const AUTH_VERSION = 2;

/**
 * Global auth sync: on every page load, fetches the actual user
 * from the server (based on JWT token) and syncs the store.
 * This prevents stale user data from appearing after account switches.
 */
export function AuthSync() {
  const { isLoggedIn, _hydrated } = useAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Force logout if auth version changed (JWT secret rotated, etc.)
    const storedVersion = localStorage.getItem('menurest-auth-v');
    if (storedVersion !== String(AUTH_VERSION)) {
      localStorage.removeItem('menurest-auth');
      localStorage.removeItem('menurest-gastro');
      localStorage.removeItem('access_token');
      document.cookie = 'access_token=; path=/; max-age=0';
      localStorage.setItem('menurest-auth-v', String(AUTH_VERSION));
      // Force zustand in-memory clear
      const store = useAuthStore.getState();
      if (store.isLoggedIn) {
        store.logout();
      }
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.replace('/login');
      } else {
        window.location.reload();
      }
      return;
    }

    if (!_hydrated || !isLoggedIn) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    userApi.getMe().then(r => {
      if (!r.data) return;
      const store = useAuthStore.getState();
      if (!store.user || store.user.id !== r.data.id) {
        store.setUser({
          id: r.data.id,
          name: r.data.name,
          email: r.data.email,
          avatarUrl: r.data.avatarUrl,
          loyaltyPoints: r.data.loyaltyPoints ?? 0,
          loyaltyLevel: r.data.loyaltyLevel ?? 'bronze',
          role: r.data.role || 'user',
          referralCode: r.data.referralCode,
          bio: r.data.bio,
          age: r.data.age,
          cityName: r.data.city?.name || r.data.cityName,
        }, token);
      } else {
        store.updateUser({
          name: r.data.name,
          email: r.data.email,
          avatarUrl: r.data.avatarUrl,
          loyaltyPoints: r.data.loyaltyPoints,
          loyaltyLevel: r.data.loyaltyLevel,
          role: r.data.role || 'user',
        });
      }
    }).catch(() => {});
  }, [_hydrated, isLoggedIn]);

  return null;
}
