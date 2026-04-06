'use client';

import { useState } from 'react';
import { BookingForm } from './BookingForm';

interface RestaurantActionsProps {
  restaurantId: number;
  restaurantName: string;
}

export function RestaurantActions({ restaurantId, restaurantName }: RestaurantActionsProps) {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <div className="mt-8 flex gap-3">
        <button onClick={() => setBookingOpen(true)}
          className="px-8 max-sm:px-5 py-3.5 rounded-full text-[14px] max-sm:text-[13px] font-semibold text-white border-none cursor-pointer transition-all w-full sm:w-auto"
          style={{ background: 'var(--accent)', boxShadow: '0 0 25px var(--accent-glow)' }}>
          📅 Забронировать столик
        </button>
      </div>

      <BookingForm
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </>
  );
}
