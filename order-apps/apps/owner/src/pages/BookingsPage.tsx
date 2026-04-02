import React, { useState, useEffect } from 'react';
import { bookingApi } from '../lib/api';
import { useRestaurantStore } from '../stores/restaurantStore';

interface Booking {
  id: number;
  bookingDate: string;
  bookingTime: string;
  guestsCount: number;
  contactName: string;
  contactPhone: string;
  comment?: string;
  status: string;
  createdAt: string;
}

const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидает', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  confirmed: { label: 'Подтверждено', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  cancelled: { label: 'Отклонено', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  completed: { label: 'Завершено', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  no_show: { label: 'Не пришли', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
};

const TABS = [
  { key: 'pending', label: 'Ожидают', icon: '⏳' },
  { key: 'confirmed', label: 'Подтверждённые', icon: '✅' },
  { key: 'cancelled', label: 'Отклонённые', icon: '❌' },
  { key: 'completed', label: 'Завершённые', icon: '✔️' },
  { key: 'all', label: 'Все', icon: '📋' },
];

export function BookingsPage() {
  const { restaurant } = useRestaurantStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);
    bookingApi.getRestaurantBookings(restaurant.id)
      .then(res => setBookings(res.data?.items || res.data || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [restaurant]);

  const reload = () => {
    if (!restaurant) return;
    bookingApi.getRestaurantBookings(restaurant.id)
      .then(res => setBookings(res.data?.items || res.data || []))
      .catch(() => {});
  };

  const changeStatus = async (id: number, newStatus: string) => {
    try {
      await bookingApi.updateStatus(id, newStatus);
      // Update local state directly from server response
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      setActiveTab(newStatus);
      setToast(`Бронь #${id}: ${STATUSES[newStatus]?.label || newStatus}`);
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast(`Ошибка: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setToast(''), 5000);
    }
  };

  if (!restaurant) return <p className="text-text-muted py-12 text-center">Загрузка...</p>;

  const filtered = activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium bg-surface-3 border border-border text-text-primary animate-slide-up">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-text-primary mb-1">Бронирования</h1>
      <p className="text-xs text-text-muted mb-5">{bookings.length} всего · {pendingCount} ожидают</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => {
          const count = tab.key === 'all' ? bookings.length : bookings.filter(b => b.status === tab.key).length;
          const hasPending = tab.key === 'pending' && pendingCount > 0;
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === tab.key ? 'bg-primary text-white' : 'bg-surface-3 text-text-muted hover:text-text-primary'
              }`}>
              {tab.icon} {tab.label}
              {count > 0 && <span className="opacity-70">({count})</span>}
              {hasPending && activeTab !== 'pending' && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-text-muted text-sm">Нет бронирований</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(b => {
            const st = STATUSES[b.status] || STATUSES.pending;
            return (
              <div key={b.id} className="bg-card rounded-xl border border-border p-4">
                {/* Info row */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 text-center flex-shrink-0">
                    <div className="text-lg font-black text-text-primary">{new Date(b.bookingDate).getDate()}</div>
                    <div className="text-[10px] text-text-muted">{new Date(b.bookingDate).toLocaleDateString('ru', { month: 'short' })}</div>
                    <div className="text-xs font-bold text-primary">{b.bookingTime?.slice(0, 5)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">{b.contactName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div className="text-[11px] text-text-muted">👥 {b.guestsCount} гостей · 📞 {b.contactPhone}</div>
                    {b.comment && <div className="text-[11px] text-text-secondary mt-1">💬 {b.comment}</div>}
                  </div>
                </div>

                {/* Action buttons */}
                {b.status === 'pending' && (
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button
                      onMouseDown={(e) => { e.preventDefault(); changeStatus(b.id, 'confirmed'); }}
                      style={{ background: '#34D399', color: '#fff' }}
                      className="px-5 py-2 rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition select-none">
                      ✓ Подтвердить
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); changeStatus(b.id, 'cancelled'); }}
                      style={{ background: '#EF4444', color: '#fff' }}
                      className="px-5 py-2 rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition select-none">
                      ✕ Отклонить
                    </button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => changeStatus(b.id, 'completed')}
                      style={{ background: 'rgba(107,114,128,0.2)', color: '#9CA3AF' }}
                      className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition">
                      Завершить
                    </button>
                    <button
                      onClick={() => changeStatus(b.id, 'no_show')}
                      style={{ background: 'rgba(249,115,22,0.2)', color: '#F97316' }}
                      className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 transition">
                      Не пришли
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
