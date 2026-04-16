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

// Write persist state synchronously to avoid race conditions
function syncPersist(state: { user: User | null; accessToken: string | null; isLoggedIn: boolean }) {
  try {
    localStorage.setItem('menurest-auth', JSON.stringify({ state, version: 0 }));
  } catch {}
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
        // Write token synchronously — this is the source of truth for API calls
        localStorage.setItem('access_token', accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        // Write persist state synchronously so reloads see the new user immediately
        syncPersist({ user, accessToken, isLoggedIn: true });
        set({ user, accessToken, isLoggedIn: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('menurest-gastro');
        document.cookie = 'access_token=; path=/; max-age=0';
        // Write persist state synchronously so reloads don't resurrect old user
        syncPersist({ user: null, accessToken: null, isLoggedIn: false });
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
          if (lsToken && state.accessToken && lsToken !== state.accessToken) {
            // localStorage token was updated by another tab/login — it's fresher
            // Force store to use the localStorage token (server will determine the user)
            state.accessToken = lsToken;
          }
          if (state.accessToken && !lsToken) {
            localStorage.setItem('access_token', state.accessToken);
            document.cookie = `access_token=${state.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }
        }
      },
    },
  ),
);
