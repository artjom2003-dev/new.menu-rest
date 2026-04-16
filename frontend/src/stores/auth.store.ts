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

/** Decode JWT payload synchronously — returns user id from token */
function getTokenUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return decoded.sub ?? null;
  } catch { return null; }
}

/**
 * Returns the verified user: if stored user.id doesn't match JWT sub, returns null.
 * This prevents showing stale user data from a previous login session.
 */
export function getVerifiedUser(state: AuthState): User | null {
  if (!state.user) return null;
  const tokenUid = getTokenUserId();
  if (tokenUid !== null && tokenUid !== state.user.id) return null;
  return state.user;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      _hydrated: false,

      setUser: (user, accessToken) => {
        localStorage.removeItem('menurest-gastro');
        localStorage.setItem('access_token', accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        set({ user, accessToken, isLoggedIn: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
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
          if (lsToken) {
            state.accessToken = lsToken;
          } else if (state.accessToken) {
            localStorage.setItem('access_token', state.accessToken);
            document.cookie = `access_token=${state.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }
        }
      },
    },
  ),
);
