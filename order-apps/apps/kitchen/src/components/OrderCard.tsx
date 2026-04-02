import { useState, useEffect, useMemo } from 'react';
import { OrderItemStatus } from '@menurest/shared-types';
import type { KdsOrder } from '../stores/kdsStore';
import { useKdsStore } from '../stores/kdsStore';

interface OrderCardProps {
  order: KdsOrder;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTimerColor(minutes: number): string {
  if (minutes >= 30) return 'from-red-600 to-red-500';
  if (minutes >= 15) return 'from-amber-600 to-amber-500';
  return 'from-surface-3 to-surface-2';
}

function getTimerBorder(minutes: number): string {
  if (minutes >= 30) return 'border-red-500/40 animate-pulse-border';
  if (minutes >= 15) return 'border-amber-500/30';
  return 'border-border';
}

export function OrderCard({ order }: OrderCardProps) {
  const { markItemPreparing, markItemReady, markAllReady } = useKdsStore();
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - order.receivedAt) / 1000));

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - order.receivedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [order.receivedAt]);

  const minutes = Math.floor(elapsed / 60);
  const timerColor = getTimerColor(minutes);
  const timerBorder = getTimerBorder(minutes);

  const activeItems = useMemo(
    () => order.items.filter((i) => i.status !== OrderItemStatus.CANCELLED),
    [order.items],
  );
  const readyCount = activeItems.filter((i) => i.status === OrderItemStatus.READY).length;
  const allReady = activeItems.length > 0 && readyCount === activeItems.length;

  return (
    <div className={`bg-surface rounded-2xl border ${timerBorder} overflow-hidden flex flex-col animate-fade-in`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${timerColor} px-4 py-3 flex items-center justify-between`}>
        <div>
          <span className="text-white font-bold text-lg">Стол {order.tableNumber}</span>
          <span className="text-white/60 text-xs ml-3">#{order.id}</span>
        </div>
        <div className="text-right">
          <div className="text-white font-mono font-bold text-xl tabular-nums">{formatTimer(elapsed)}</div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-1.5 overflow-y-auto max-h-[400px] scrollbar-hide">
        {activeItems.map((item) => {
          const isReady = item.status === OrderItemStatus.READY;
          const isPreparing = item.status === OrderItemStatus.PREPARING;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isReady
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : isPreparing
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-surface-2 border border-transparent hover:border-border'
              }`}
            >
              <span className="text-lg font-bold text-text-primary w-8 text-center">
                {item.quantity}x
              </span>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isReady ? 'text-emerald-400 line-through' : 'text-text-primary'}`}>
                  {item.dishName}
                </p>
                {item.comment && (
                  <p className="text-[11px] text-amber-400 mt-0.5 truncate">💬 {item.comment}</p>
                )}
              </div>

              {isReady ? (
                <span className="text-emerald-400 text-lg">✓</span>
              ) : isPreparing ? (
                <button
                  onClick={() => markItemReady(order.id, item.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition active:scale-95"
                >
                  Готово
                </button>
              ) : (
                <button
                  onClick={() => markItemPreparing(order.id, item.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-secondary text-xs font-medium hover:bg-amber-500 hover:text-white transition active:scale-95"
                >
                  В работу
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-1">
        {order.comment && (
          <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 mb-2">
            💬 {order.comment}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            {readyCount}/{activeItems.length} готово
            {order.source === 'qr' && <span className="ml-2 text-primary">QR</span>}
          </div>

          {!allReady && (
            <button
              onClick={() => markAllReady(order.id)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition active:scale-95"
            >
              Всё готово
            </button>
          )}
          {allReady && (
            <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold">
              ✓ Отдан
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
