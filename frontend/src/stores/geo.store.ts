import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GeoState {
  lat: number | null;
  lng: number | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  requestLocation: () => void;
  clearLocation: () => void;
}

export const useGeoStore = create<GeoState>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      status: 'idle',

      requestLocation: () => {
        if (!navigator.geolocation) {
          set({ status: 'unavailable' });
          return;
        }
        set({ status: 'requesting' });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            set({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              status: 'granted',
            });
          },
          (err) => {
            set({
              status: err.code === 1 ? 'denied' : 'unavailable',
              lat: null,
              lng: null,
            });
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      },

      clearLocation: () => set({ lat: null, lng: null, status: 'idle' }),
    }),
    {
      name: 'menurest-geo',
      partialize: (state) => ({ lat: state.lat, lng: state.lng, status: state.status === 'granted' ? 'granted' : 'idle' }),
    },
  ),
);
