import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RestaurantHero } from '@/components/restaurant/RestaurantHero';
import { RestaurantInfoCard } from '@/components/restaurant/RestaurantInfoCard';
import { MenuSection } from '@/components/restaurant/MenuSection';
import { ReviewSection } from '@/components/restaurant/ReviewSection';
import { RestaurantActions } from '@/components/restaurant/RestaurantActions';
import { BudgetRestaurantContext } from '@/components/budget/BudgetRestaurantContext';
import { WishlistUsersSection } from '@/components/restaurant/WishlistUsersSection';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3001';

async function getRestaurant(slug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/restaurants/${slug}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getMenu(restaurantId: number) {
  try {
    const res = await fetch(
      `${API_BASE}/api/restaurants/${restaurantId}/menu`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) return { title: 'Ресторан не найден' };

  const city = restaurant.city?.name || '';
  const cuisine = restaurant.cuisines?.map((c: { name: string }) => c.name).join(', ') || '';

  return {
    title: `${restaurant.name} — меню, отзывы, бронирование`,
    description:
      restaurant.description ||
      `${restaurant.name} — ${cuisine} в ${city}. Рейтинг ${restaurant.rating}, средний чек ${restaurant.averageBill} ₽.`,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description,
      images: restaurant.photos?.find((p: { is_cover: boolean; url: string }) => p.is_cover)?.url
        ? [restaurant.photos.find((p: { is_cover: boolean; url: string }) => p.is_cover).url]
        : [],
    },
  };
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) notFound();

  const rawMenu = await getMenu(restaurant.id);

  // Adapt API shape: { category, dishes: [{ dish: {...}, price }] }
  // into MenuSection shape: { id, name, dishes: [{ id, name, price, ... }] }
  const menu = (rawMenu || []).map((cat: Record<string, unknown>, i: number) => ({
    id: i,
    name: (cat.name || cat.category || 'Без категории') as string,
    dishes: ((cat.dishes || []) as Array<Record<string, unknown>>).map((item) => {
      const dish = (item.dish || {}) as Record<string, unknown>;
      return {
        id: dish.id || item.id || 0,
        name: dish.name || item.name || 'Без названия',
        description: dish.description || item.description,
        composition: dish.composition,
        price: Number(item.price || dish.price || 0),
        calories: dish.calories ? Number(dish.calories) : undefined,
        protein: dish.protein ? Number(dish.protein) : undefined,
        fat: dish.fat ? Number(dish.fat) : undefined,
        carbs: dish.carbs ? Number(dish.carbs) : undefined,
        weightGrams: dish.weightGrams ? Number(dish.weightGrams) : undefined,
        volumeMl: dish.volumeMl ? Number(dish.volumeMl) : undefined,
        imageUrl: dish.imageUrl,
        isHealthyChoice: dish.isHealthyChoice || false,
        allergens: (dish.allergens as Array<{ slug: string; icon: string; name: string }>) || [],
      };
    }),
  }));

  return (
    <div className="overflow-x-hidden">
      <BudgetRestaurantContext name={restaurant.name} slug={params.slug} menu={menu} />
      <RestaurantHero restaurant={restaurant} />
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-24">
        <RestaurantInfoCard restaurant={restaurant} />
        <WishlistUsersSection restaurantId={restaurant.id} />
        <MenuSection categories={menu} isVerified={!!restaurant.isVerified} phone={restaurant.phone} />
        <ReviewSection restaurantId={restaurant.id} />
      </div>
    </div>
  );
}
