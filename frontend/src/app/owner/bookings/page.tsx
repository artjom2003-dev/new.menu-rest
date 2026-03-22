'use client';

import { useEffect, useState } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import { bookingApi } from '@/lib/api';

interface Booking {
  id: number;
  guestName: string;
  guestPhone?: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  comment?: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(255,180,40,0.12)', color: '#ffb428', label: 'Ожидает' },
  confirmed: { bg: 'rgba(57,255,130,0.12)', color: '#39ff82', label: 'Подтверждено' },
  completed: { bg: 'rgba(100,160,255,0.12)', color: '#64a0ff', label: 'Завершено' },
  cancelled: { bg: 'rgba(255,60,60,0.12)', color: '#ff4444', label: 'Отменено' },
};

export default function OwnerBookingsPage() {
  const { myRestaurant } = useOwner();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myRestaurant) return;
    (async () => {
      try {
        const res = await bookingApi.getRestaurantBookings(myRestaurant.id);
        setBookings(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch {
        // no bookings or endpoint not available
      } finally {
        setLoading(false);
      }
    })();
  }, [myRestaurant]);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  return (
    <div>
      <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-6">Бронирования</h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <div className="text-[36px] mb-3">📅</div>
          <p className="text-[var(--text3)] text-[14px]">Бронирований пока нет.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
            return (
              <div key={b.id} className="rounded-[14px] border p-4"
                style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="text-[15px] font-bold text-[var(--text)]">{b.guestName}</span>
                  <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="text-[13px] text-[var(--text2)]" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>📅 {new Date(b.date).toLocaleDateString('ru-RU')}</span>
                  <span>🕐 {b.time}</span>
                  <span>👥 {b.guests} гостей</span>
                  {b.guestPhone && <span>📞 {b.guestPhone}</span>}
                </div>
                {b.comment && <p className="text-[12px] text-[var(--text3)] mt-2 m-0">{b.comment}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
