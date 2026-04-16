'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userApi } from '@/lib/api';

/**
 * Global auth sync: on every page load, fetches the actual user
 * from the server (based on JWT token) and syncs the store.
 * This prevents stale user data from appearing after account switches.
 */
export function AuthSync() {
  const { isLoggedIn, _hydrated } = useAuthStore();

  useEffect(() => {
    if (!_hydrated || !isLoggedIn) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    userApi.getMe().then(r => {
      if (!r.data) return;
      const store = useAuthStore.getState();
      // Always update store with server data — server is the source of truth
      if (!store.user || store.user.id !== r.data.id) {
        // Different user or no user in store — full replace
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
        // Same user — just update fields that may have changed
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
