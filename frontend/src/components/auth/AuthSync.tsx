'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userApi } from '@/lib/api';

/**
 * Global auth sync: on mount, verifies the stored user matches the JWT token.
 * If the server returns a different user (e.g. logged in as someone else in another tab),
 * forces the store to update.
 */
export function AuthSync() {
  const { isLoggedIn, user, _hydrated } = useAuthStore();

  useEffect(() => {
    if (!_hydrated || !isLoggedIn || !user) return;

    userApi.getMe().then(r => {
      if (r.data && r.data.id !== user.id) {
        // Token belongs to a different user — force sync store
        const token = localStorage.getItem('access_token') || '';
        useAuthStore.getState().setUser({
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
      }
    }).catch(() => {});
  }, [_hydrated, isLoggedIn, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
