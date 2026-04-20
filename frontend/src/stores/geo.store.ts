import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface GeoState {
  lat: number | null;
  lng: number | null;
  status: GeoStatus;
  requestLocation: () => Promise<GeoStatus>;
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
          return Promise.resolve('unavailable');
        }
        set({ status: 'requesting' });
        return new Promise<GeoStatus>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              set({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                status: 'granted',
              });
              resolve('granted');
            },
            (err) => {
              const status: GeoStatus = err.code === 1 ? 'denied' : 'unavailable';
              set({ status, lat: null, lng: null });
              resolve(status);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
          );
        });
      },

      clearLocation: () => set({ lat: null, lng: null, status: 'idle' }),
    }),
    {
      name: 'menurest-geo',
      partialize: (state) => ({ lat: state.lat, lng: state.lng, status: state.status === 'granted' ? 'granted' : 'idle' }),
    },
  ),
);
