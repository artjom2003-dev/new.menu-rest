import { create } from 'zustand';
import type { Table } from '@menurest/shared-types';
import { tablesApi } from '../lib/api';

interface FloorState {
  tables: Table[];
  activeZone: string | null;
  viewMode: 'grid' | 'list';
  loading: boolean;

  loadTables: () => Promise<void>;
  setActiveZone: (zone: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  getFilteredTables: () => Table[];
}

export const useFloorStore = create<FloorState>((set, get) => ({
  tables: [],
  activeZone: null,
  viewMode: 'grid',
  loading: false,

  loadTables: async () => {
    set({ loading: true });
    try {
      const data = await tablesApi.getByRestaurant();
      set({ tables: data || [], loading: false });
    } catch {
      set({ tables: [], loading: false });
    }
  },

  setActiveZone: (zone) => set({ activeZone: zone }),
  setViewMode: (mode) => set({ viewMode: mode }),

  getFilteredTables: () => {
    const { tables, activeZone } = get();
    if (!activeZone) return tables;
    return tables.filter((t) => t.zone === activeZone);
  },
}));
