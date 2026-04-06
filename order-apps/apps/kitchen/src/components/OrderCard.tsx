import { useState, useEffect, useMemo } from 'react';
import { OrderItemStatus } from '@menurest/shared-types';
import type { KdsOrder } from '../stores/kdsStore';

interface OrderCardProps {
  order: KdsOrder;
  showReadyButton?: boolean;
  onMarkReady?: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTimerColor(minutes: number): string {
  if (minutes >= 30) return 'from-red-900/60 to-red-800/40';
  if (minutes >= 15) return 'from-amber-900/50 to-amber-800/30';
  return 'from-surface-3 to-surface-2';
}

function getTimerBorder(minutes: number): string {
  if (minutes >= 30) return 'border-red-500/20';
  if (minutes >= 15) return 'border-amber-500/15';
  return 'border-border';
}

export function OrderCard({ order, showReadyButton, onMarkReady }: OrderCardProps) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - order.receivedAt) / 1000));

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - order.receivedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [order.receivedAt]);

  const minutes = Math.floor(elapsed / 60);
  const timerColor = getTimerColor(minutes);
  const timerBorder = getTimerBorder(minutes);

  const activeItems = useMemo(
    () => order.items.filter((i) => i.status !== OrderItemStatus.CANCELLED), [order.items],
  );
  const readyCount = activeItems.filter((i) => i.status === OrderItemStatus.READY).length;
  const allReady = activeItems.length > 0 && readyCount === activeItems.length;

  return (
    <div className={`bg-surface rounded-2xl border ${timerBorder} overflow-hidden animate-fade-in`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${timerColor} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">Стол {order.tableNumber}</span>
          <span className="text-white/50 text-[10px]">#{order.id}</span>
          {order.source === 'qr' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 text-white/70">QR</span>}
        </div>
        <span className="text-white font-mono font-bold text-sm tabular-nums">{formatTimer(elapsed)}</span>
      </div>

      {/* Items — compact list */}
      <div className="p-2 space-y-1">
        {activeItems.map((item) => {
          const isReady = item.status === OrderItemStatus.READY;
          return (
            <div key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${isReady ? 'bg-emerald-500/8' : 'bg-surface-2'}`}>
              <span className={`text-xs font-bold w-6 text-center ${isReady ? 'text-emerald-400' : 'text-text-primary'}`}>
                {item.quantity}x
              </span>
              <span className={`text-xs flex-1 truncate ${isReady ? 'text-emerald-400/70 line-through' : 'text-text-primary'}`}>
                {item.dishName}
              </span>
              {item.comment && <span className="text-[9px] text-amber-400">💬</span>}
              {isReady && <span className="text-emerald-400 text-xs">✓</span>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-2 pb-2">
        {order.comment && (
          <p className="text-[10px] text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1 mb-1.5 truncate">💬 {order.comment}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">{readyCount}/{activeItems.length}</span>
          {showReadyButton && !allReady && onMarkReady && (
            <button onClick={onMarkReady}
              className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-400 transition active:scale-95">
              ✅ Готово
            </button>
          )}
          {allReady && (
            <span className="text-[10px] text-emerald-400 font-medium">Отдан</span>
          )}
        </div>
      </div>
    </div>
  );
}
