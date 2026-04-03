import { MetadataRoute } from 'next';

const BASE = 'https://new.menu-rest.com';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
const PER_SITEMAP = 10000;

export async function generateSitemaps() {
  let total = 1;
  try {
    const res = await fetch(`${BACKEND}/api/restaurants?limit=1&status=published`);
    if (res.ok) {
      const data = await res.json();
      total = data.meta?.total || 1;
    }
  } catch { /* fallback to 1 */ }

  const count = Math.ceil(total / PER_SITEMAP) + 1; // +1 for static/cities/blog
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // id=0: static pages + cities + blog
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
      { url: `${BASE}/restaurants`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
      { url: `${BASE}/loyalty`, changeFrequency: 'weekly', priority: 0.6 },
      { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.4 },
      { url: `${BASE}/contacts`, changeFrequency: 'monthly', priority: 0.4 },
      { url: `${BASE}/for-business`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${BASE}/features`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    ];

    let cityPages: MetadataRoute.Sitemap = [];
    try {
      const res = await fetch(`${BACKEND}/api/cities`);
      if (res.ok) {
        const cities = await res.json();
        cityPages = cities.map((c: { slug: string }) => ({
          url: `${BASE}/city/${c.slug}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    } catch { /* ignore */ }

    let blogPages: MetadataRoute.Sitemap = [];
    try {
      const res = await fetch(`${BACKEND}/api/articles?limit=500&status=published`);
      if (res.ok) {
        const data = await res.json();
        blogPages = (data.items || []).map((a: { slug: string }) => ({
          url: `${BASE}/blog/${a.slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
      }
    } catch { /* ignore */ }

    return [...staticPages, ...cityPages, ...blogPages];
  }

  // id >= 1: restaurant pages in batches of PER_SITEMAP
  const page = id;
  try {
    const res = await fetch(`${BACKEND}/api/restaurants?limit=${PER_SITEMAP}&page=${page}&status=published&sortBy=name`);
    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((r: { slug: string; publishedAt?: string }) => ({
        url: `${BASE}/restaurants/${r.slug}`,
        lastModified: r.publishedAt ? new Date(r.publishedAt) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch { /* ignore */ }

  return [];
}
