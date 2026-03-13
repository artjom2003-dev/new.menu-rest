import type { Metadata } from 'next';
import Link from 'next/link';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';

async function getData(citySlug: string, cuisineSlug: string) {
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL}/api/restaurants?city=${citySlug}&cuisine=${cuisineSlug}&limit=24&sortBy=rating`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return { items: [], meta: null };
    return res.json();
  } catch { return { items: [], meta: null }; }
}

async function getRefData() {
  try {
    const [citiesRes, cuisinesRes] = await Promise.all([
      fetch(`${process.env.BACKEND_URL}/api/cities`, { next: { revalidate: 3600 } }),
      fetch(`${process.env.BACKEND_URL}/api/cuisines`, { next: { revalidate: 3600 } }),
    ]);
    const cities = citiesRes.ok ? await citiesRes.json() : [];
    const cuisines = cuisinesRes.ok ? await cuisinesRes.json() : [];
    return { cities, cuisines };
  } catch { return { cities: [], cuisines: [] }; }
}

export async function generateMetadata({ params }: { params: { city: string; cuisine: string } }): Promise<Metadata> {
  const { cities, cuisines } = await getRefData();
  const city = cities.find((c: { slug: string }) => c.slug === params.city);
  const cuisine = cuisines.find((c: { slug: string }) => c.slug === params.cuisine);
  const cityName = city?.name || params.city;
  const cuisineName = cuisine?.name || params.cuisine;

  return {
    title: `${cuisineName} кухня в ${cityName} — рестораны с меню и отзывами`,
    description: `Лучшие рестораны ${cuisineName.toLowerCase()} кухни в ${cityName}. Меню с ценами, КБЖУ, аллергены, бронирование онлайн.`,
  };
}

export default async function CityCuisinePage({ params }: { params: { city: string; cuisine: string } }) {
  const [data, refData] = await Promise.all([getData(params.city, params.cuisine), getRefData()]);
  const city = refData.cities.find((c: { slug: string }) => c.slug === params.city);
  const cuisine = refData.cuisines.find((c: { slug: string }) => c.slug === params.cuisine);
  const cityName = city?.name || params.city;
  const cuisineName = cuisine?.name || params.cuisine;
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
    <div className="max-w-[1400px] mx-auto px-10 py-12">
      <nav className="flex items-center gap-2 text-[12px] text-[var(--text3)] mb-6">
        <Link href="/" className="no-underline text-[var(--text3)] hover:text-[var(--accent)]">Главная</Link>
        <span>/</span>
        <Link href={`/city/${params.city}`} className="no-underline text-[var(--text3)] hover:text-[var(--accent)]">{cityName}</Link>
        <span>/</span>
        <span className="text-[var(--text2)]">{cuisineName} кухня</span>
      </nav>

      <h1 className="font-serif text-[36px] font-bold text-[var(--text)] mb-2">
        {cuisineName} кухня в {cityName}
      </h1>
      <p className="text-[14px] text-[var(--text3)] mb-10">
        {data.meta?.total ? `${data.meta.total} заведений` : 'Рестораны с этой кухней'}
      </p>

      {restaurants.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-[18px] text-[var(--text2)] font-semibold mb-2">Ресторанов не найдено</p>
          <Link href={`/city/${params.city}`} className="text-[13px] text-[var(--accent)]">Все рестораны {cityName} →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {restaurants.map((r: Record<string, unknown>) => (
            <RestaurantCard key={r.slug as string} restaurant={adaptRestaurant(r)} />
          ))}
        </div>
      )}
    </div>
  );
}
