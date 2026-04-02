import { useRef, useCallback } from 'react';

export function useSound() {
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const whooshRef = useRef<HTMLAudioElement | null>(null);

  const playBell = useCallback(() => {
    if (!bellRef.current) bellRef.current = new Audio('/bell.wav');
    bellRef.current.currentTime = 0;
    bellRef.current.play().catch(() => {});
  }, []);

  const playWhoosh = useCallback(() => {
    if (!whooshRef.current) whooshRef.current = new Audio('/whoosh.mp3');
    whooshRef.current.currentTime = 0;
    whooshRef.current.play().catch(() => {});
  }, []);

  return { playBell, playWhoosh };
}
