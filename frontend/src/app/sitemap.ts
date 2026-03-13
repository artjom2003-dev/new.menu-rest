import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://new.menu-rest.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/restaurants`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Dynamic restaurant pages
  let restaurantPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/restaurants?limit=1000&status=published`);
    if (res.ok) {
      const data = await res.json();
      restaurantPages = (data.items || []).map((r: { slug: string; updatedAt: string }) => ({
        url: `${baseUrl}/restaurants/${r.slug}`,
        lastModified: new Date(r.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch { /* ignore */ }

  // City pages
  let cityPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/cities`);
    if (res.ok) {
      const cities = await res.json();
      cityPages = cities.map((c: { slug: string }) => ({
        url: `${baseUrl}/city/${c.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch { /* ignore */ }

  // Blog pages
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/articles?limit=500&status=published`);
    if (res.ok) {
      const data = await res.json();
      blogPages = (data.items || []).map((a: { slug: string; updatedAt: string }) => ({
        url: `${baseUrl}/blog/${a.slug}`,
        lastModified: new Date(a.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }
  } catch { /* ignore */ }

  return [...staticPages, ...restaurantPages, ...cityPages, ...blogPages];
}
