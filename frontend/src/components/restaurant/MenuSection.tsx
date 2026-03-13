'use client';

import { useState } from 'react';
import { DishCard } from './DishCard';

interface Dish {
  id: number;
  name: string;
  description?: string;
  price: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  isHealthyChoice?: boolean;
  allergens?: Array<{ slug: string; icon: string; name: string }>;
}

interface Category {
  id: number;
  name: string;
  dishes: Dish[];
}

export function MenuSection({ categories }: { categories: Category[] }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!categories.length) {
    return (
      <div className="text-center py-16 text-[var(--text3)]">
        <div className="text-5xl mb-4 opacity-30">📋</div>
        Меню пока не добавлено
      </div>
    );
  }

  const activeCategory = categories[activeTab];

  return (
    <div>
      <h2 className="font-serif text-[26px] font-bold text-[var(--text)] mb-4">Меню</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-2 text-[13px] font-medium rounded-full transition-all duration-300 font-sans border-none ${
              activeTab === i
                ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
                : 'text-[var(--text3)] bg-transparent cursor-pointer hover:text-[var(--text2)] hover:bg-[var(--card)]'
            }`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Dishes grid */}
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        {activeCategory?.dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </div>
  );
}
