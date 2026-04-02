import { useState, useEffect } from 'react';

interface HeaderProps {
  orderCount: number;
}

export function Header({ orderCount }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-xs font-black text-white">MR</span>
        <span className="text-lg font-bold text-text-primary">
          Menu<span className="text-primary">Rest</span>
          <span className="text-text-muted font-normal ml-2 text-sm">Кухня</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Заказов:</span>
          <span className="bg-primary/15 text-primary font-bold text-sm px-2.5 py-0.5 rounded-lg">
            {orderCount}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xl font-mono font-bold text-text-primary tabular-nums">
            {time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] text-text-muted">
            {time.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
          </div>
        </div>
      </div>
    </header>
  );
}
