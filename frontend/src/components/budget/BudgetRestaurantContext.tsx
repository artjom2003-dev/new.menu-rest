'use client';

import { useEffect } from 'react';
import { useBudgetStore, MenuCategory } from '@/stores/budget.store';

export function BudgetRestaurantContext({
  name, slug, menu,
}: {
  name: string;
  slug: string;
  menu: MenuCategory[];
}) {
  const setRestaurant = useBudgetStore((s) => s.setRestaurant);
  const setMenu = useBudgetStore((s) => s.setMenu);

  useEffect(() => {
    setRestaurant(name, slug);
    setMenu(menu);
    return () => {
      setRestaurant(null, null);
      setMenu([]);
    };
  }, [name, slug, menu, setRestaurant, setMenu]);

  return null;
}
