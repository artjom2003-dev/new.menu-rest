import { useCallback } from 'react';

export function useVibration() {
  const vibrate = useCallback((pattern: number | number[] = 200) => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }, []);

  return { vibrate };
}
