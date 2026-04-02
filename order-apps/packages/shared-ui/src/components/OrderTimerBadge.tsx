import React, { useState, useEffect } from 'react';

export interface OrderTimerBadgeProps {
  createdAt: string;
}

export function OrderTimerBadge({ createdAt }: OrderTimerBadgeProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = `${mins}:${String(secs).padStart(2, '0')}`;

  const color = mins < 15 ? '#34D399' : mins < 30 ? '#FBBF24' : '#EF4444';
  const bg = mins < 15 ? 'rgba(52,211,153,0.12)' : mins < 30 ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
      style={{ color, backgroundColor: bg }}
    >
      ⏱ {display}
    </span>
  );
}
