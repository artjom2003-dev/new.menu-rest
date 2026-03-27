import type { Metadata } from 'next';
import Link from 'next/link';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';

async function getCityRestaurants(citySlug: string) {
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL}/api/restaurants?city=${citySlug}&limit=24&sortBy=rating`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return { items: [], meta: null };
    return res.json();
  } catch { return { items: [], meta: null }; }
}

async function getCityInfo(citySlug: string) {
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/cities`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const cities = await res.json();
    return cities.find((c: { slug: string }) => c.slug === citySlug) || null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = await getCityInfo(params.city);
  const name = city?.name || params.city;
  return {
    title: `Рестораны ${name} — лучшие заведения с меню и отзывами`,
    description: `Найдите лучшие рестораны ${name}: меню с ценами, КБЖУ, аллергены, отзывы, онлайн-бронирование. AI-поиск Menu-Rest.`,
  };
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const [data, city] = await Promise.all([
    getCityRestaurants(params.city),
    getCityInfo(params.city),
  ]);

  const cityName = city?.name || params.city;
  const restaurants = data.items || [];

  const adaptRestaurant = (r: Record<string, unknown>) => ({
    slug: r.slug as string,
    name: r.name as string,
    cuisines: (r.cuisines as Array<{ name: string }>) || [],
    locations: r.city ? [{ city: { name: (r.city as { name: string }).name } }] : [],
    ratingAggregate: r.rating as number,
    reviewCount: r.reviewCount as number,
    priceLevel: r.priceLevel as number | undefined,
    photos: ((r.photos as Array<{ url: string; is_cover: boolean }>) || []).map(p => ({ url: p.url, isCover: p.is_cover })),
    features: (r.features as Array<{ slug: string; name: string }>) || [],
  });

  return (
    <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[12px] text-[var(--text3)] mb-6">
        <Link href="/" className="no-underline text-[var(--text3)] hover:text-[var(--accent)]">Главная</Link>
        <span>/</span>
        <span className="text-[var(--text2)]">Рестораны {cityName}</span>
      </nav>

      <h1 className="font-serif text-[42px] font-bold text-[var(--text)] mb-2">Рестораны {cityName}</h1>
      <p className="text-[14px] text-[var(--text3)] mb-10">
        {data.meta?.total ? `${data.meta.total} заведений` : 'Лучшие рестораны города'}
      </p>

      {restaurants.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏙️</div>
          <p className="text-[18px] text-[var(--text2)] font-semibold mb-2">Ресторанов пока нет</p>
          <Link href="/restaurants" className="text-[13px] text-[var(--accent)]">Смотреть все рестораны →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {restaurants.map((r: Record<string, unknown>) => (
            <RestaurantCard key={r.slug as string} restaurant={adaptRestaurant(r)} />
          ))}
        </div>
      )}

      {/* SEO text */}
      <div className="mt-16 pt-8 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <h2 className="text-[20px] font-semibold text-[var(--text)] mb-3">О ресторанах {cityName}</h2>
        <p className="text-[14px] text-[var(--text3)] leading-[1.8]">
          На Menu-Rest вы найдёте лучшие рестораны {cityName} с подробным меню, ценами, информацией о КБЖУ и аллергенах.
          Используйте AI-поиск для подбора идеального заведения — просто опишите, что хотите, и мы найдём подходящие варианты.
          Бронируйте столики онлайн и копите бонусные баллы.
        </p>
      </div>
    </div>
  );
}
