export const colors = {
  primary: '#E8491D',
  primaryHover: '#D43D15',
  primaryGlow: 'rgba(232, 73, 29, 0.3)',
  darkBg: '#1A1A2E',
  surface: '#16213E',
  surfaceLight: '#1E2A47',
  card: '#0F3460',
  text: '#EAEAEA',
  textSecondary: '#A0A0B0',
  textMuted: '#6C6C80',
  border: '#2A2A4A',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#60A5FA',
} as const;

export const orderStatusColors: Record<string, string> = {
  pending: '#FBBF24',
  confirmed: '#60A5FA',
  preparing: '#A78BFA',
  ready: '#34D399',
  served: '#6B7280',
  paid: '#10B981',
  cancelled: '#EF4444',
};

export const tableStatusColors: Record<string, string> = {
  free: '#34D399',
  occupied: '#60A5FA',
  check_requested: '#F59E0B',
};
