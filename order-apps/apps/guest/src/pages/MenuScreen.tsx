import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DishCard, CategoryTabs } from '@menurest/shared-ui';
import { useMenuStore } from '../stores/menuStore';
import { useCartStore } from '../stores/cartStore';

export function MenuScreen() {
  const { slug, tableNumber } = useParams();
  const navigate = useNavigate();
  const { restaurant, categories, activeCategory, loading, searchQuery, loadMenu, setActiveCategory, setSearchQuery, getFilteredDishes } = useMenuStore();
  const { addItem, getTotal, getCount } = useCartStore();
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { if (slug) loadMenu(slug); }, [slug]);

  const dishes = getFilteredDishes();
  const cartCount = getCount();
  const cartTotal = getTotal();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#E8491D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#A0A0B0] text-sm">Загрузка меню...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/95 backdrop-blur-lg border-b border-[#2A2A4A]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant?.logo && (
              <img src={restaurant.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
            )}
            <div>
              <h1 className="text-base font-bold text-white">{restaurant?.name || 'Ресторан'}</h1>
              <p className="text-[11px] text-[#A0A0B0]">Столик {tableNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-9 h-9 rounded-full bg-[#1E2A47] flex items-center justify-center text-[#A0A0B0] hover:text-white transition"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="px-4 pb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Найти блюдо..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-[#1E2A47] border border-[#2A2A4A] text-sm text-white placeholder-[#6C6C80] focus:border-[#E8491D] focus:outline-none"
            />
          </div>
        )}

        {/* Category tabs */}
        <div className="px-4 pb-2">
          <CategoryTabs
            categories={categories.map((c) => c.name)}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>
      </div>

      {/* Dish list */}
      <div className="px-4 pt-4 grid grid-cols-1 gap-3">
        {dishes.map((dish) => (
          <DishCard
            key={dish.id}
            id={dish.id}
            name={dish.name}
            description={dish.description}
            price={dish.price}
            weightGrams={dish.weightGrams}
            photoUrl={dish.photoUrl}
            calories={dish.calories}
            protein={dish.protein}
            fat={dish.fat}
            carbs={dish.carbs}
            allergens={dish.allergens}
            isAvailable={dish.isAvailable}
            prepTimeMin={dish.prepTimeMin}
            showStopBadge
            onAdd={(id) => {
              const d = dishes.find((x) => x.id === id);
              if (d) addItem({ id: d.id, name: d.name, price: d.price });
            }}
          />
        ))}
        {dishes.length === 0 && (
          <p className="text-center text-[#6C6C80] text-sm py-12">Ничего не найдено</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-20 left-4 right-4 flex gap-2 z-20">
        <button className="flex-1 py-2.5 rounded-xl bg-[#1E2A47] border border-[#2A2A4A] text-sm text-[#A0A0B0] font-medium hover:border-[#E8491D] hover:text-white transition">
          🔔 Позвать официанта
        </button>
        <button className="flex-1 py-2.5 rounded-xl bg-[#1E2A47] border border-[#2A2A4A] text-sm text-[#A0A0B0] font-medium hover:border-[#E8491D] hover:text-white transition">
          📋 Попросить счёт
        </button>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => navigate(`/${slug}/table/${tableNumber}/cart`)}
          className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between px-5 py-3.5 rounded-2xl bg-[#E8491D] text-white shadow-lg shadow-[#E8491D]/30 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{cartCount}</span>
            <span className="font-semibold text-sm">Корзина</span>
          </div>
          <span className="font-bold">{cartTotal} ₽</span>
        </button>
      )}
    </div>
  );
}
