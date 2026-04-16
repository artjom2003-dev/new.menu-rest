import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  loyaltyPoints: number;
  loyaltyLevel: 'bronze' | 'silver' | 'gold';
  role?: 'user' | 'owner' | 'admin';
  referralCode?: string;
  allergenProfile?: Array<{ id: number; name: string; slug: string; icon: string }>;
  nutritionGoal?: string;
  hideFromWishlists?: boolean;
  blockMessages?: boolean;
  bio?: string;
  age?: number;
  cityName?: string;
  favoriteCuisines?: string;
  favoriteDishes?: string;
  restaurantSlug?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  _hydrated: boolean;

  setUser: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

/** Decode JWT payload without library */
function decodeJwtPayload(token: string): { sub?: number; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch { return null; }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      _hydrated: false,

      setUser: (user, accessToken) => {
        // Clear user-specific caches from previous session
        localStorage.removeItem('menurest-gastro');
        // Write token and user id synchronously — source of truth for API calls
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('menurest-uid', String(user.id));
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        set({ user, accessToken, isLoggedIn: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('menurest-uid');
        localStorage.removeItem('menurest-gastro');
        document.cookie = 'access_token=; path=/; max-age=0';
        set({ user: null, accessToken: null, isLoggedIn: false });
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'menurest-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          const lsToken = localStorage.getItem('access_token');
          const lsUid = localStorage.getItem('menurest-uid');

          if (lsToken) {
            // localStorage token is the source of truth (written synchronously at login)
            state.accessToken = lsToken;

            // Check if stored user matches the token
            const jwtPayload = decodeJwtPayload(lsToken);
            const tokenUid = jwtPayload?.sub;
            const storeUid = state.user?.id;

            if (tokenUid && storeUid && tokenUid !== storeUid) {
              // Token belongs to a different user — clear stale user data
              // AuthSync will fetch the correct user from server
              state.user = null;
              state.isLoggedIn = true; // keep logged in — token is valid
            } else if (lsUid && storeUid && String(storeUid) !== lsUid) {
              // uid mismatch — same treatment
              state.user = null;
              state.isLoggedIn = true;
            }
          } else if (state.accessToken) {
            // No token in localStorage but store has one — restore it
            localStorage.setItem('access_token', state.accessToken);
            document.cookie = `access_token=${state.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }
        }
      },
    },
  ),
);
