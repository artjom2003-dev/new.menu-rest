import { create } from 'zustand';
import type { Staff, StaffRole } from '@menurest/shared-types';

interface AuthState {
  staff: Staff | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  staff: null,
  token: null,
  loading: false,
  error: null,

  login: async (pin: string) => {
    set({ loading: true, error: null });
    // Accept PIN 1234 or 0000 — local demo mode
    if (pin === '1234' || pin === '0000') {
      set({
        staff: {
          id: 1,
          restaurantId: 16271,
          name: 'Официант Манго',
          pin: pin,
          role: 'waiter' as StaffRole,
          isActive: true,
          assignedTables: [],
        },
        token: 'waiter-token',
        loading: false,
      });
      return true;
    }
    set({ error: 'Неверный PIN-код', loading: false });
    return false;
  },

  logout: () => set({ staff: null, token: null }),
}));
