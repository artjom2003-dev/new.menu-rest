'use client';

import { HeroSection } from '@/components/layout/HeroSection';
import { RestaurantGrid } from '@/components/restaurant/RestaurantGrid';
import { CtaBanner } from '@/components/layout/CtaBanner';
import { useSearchStore } from '@/stores/search.store';

export default function HomePage() {
  const hasAiResults = useSearchStore(s => s.results.length > 0 || s.recommendation.length > 0);

  return (
    <>
      <HeroSection />
      <div className={hasAiResults ? 'hidden' : ''}>
        <RestaurantGrid />
        <CtaBanner />
      </div>
    </>
  );
}
