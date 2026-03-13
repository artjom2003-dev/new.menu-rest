import type { Metadata } from 'next';
import { HeroSection } from '@/components/layout/HeroSection';
import { RestaurantGrid } from '@/components/restaurant/RestaurantGrid';
import { CtaBanner } from '@/components/layout/CtaBanner';

export const metadata: Metadata = {
  title: 'Menu-Rest — Найди идеальный ресторан',
  description:
    'Умный поиск ресторанов по блюдам, аллергенам и бюджету. AI-поиск, КБЖУ, онлайн-бронирование.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <RestaurantGrid />
      <CtaBanner />
    </>
  );
}
