import { create } from 'zustand';

export interface ParsedTag {
  type: 'loc' | 'cuisine' | 'diet' | 'budget' | 'vibe' | 'occasion' | 'venue';
  icon: string;
  label: string;
  value?: string;
}

export interface SearchFilters {
  city?: string;
  cuisine?: string[];
  diet?: string[];
  venue?: string[];
  occasion?: string[];
  vibe?: string[];
  priceMin?: number;
  priceMax?: number;
  near?: { lat: number; lng: number };
}

interface SearchState {
  query: string;
  parsedTags: ParsedTag[];
  filters: SearchFilters;
  isLoading: boolean;
  results: unknown[];

  setQuery: (q: string) => void;
  setParsedTags: (tags: ParsedTag[]) => void;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  setLoading: (v: boolean) => void;
  setResults: (r: unknown[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  parsedTags: [],
  filters: {},
  isLoading: false,
  results: [],

  setQuery: (query) => set({ query }),
  setParsedTags: (parsedTags) => set({ parsedTags }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: {} }),
  setLoading: (isLoading) => set({ isLoading }),
  setResults: (results) => set({ results }),
}));
