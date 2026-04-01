'use client';

interface Post {
  id: number;
  title: string;
  body: string;
  category?: string;
  coverUrl?: string;
  authorName?: string;
  publishedAt?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  news: { label: 'Новость', color: '#3b82f6' },
  promo: { label: 'Акция', color: '#ef4444' },
  event: { label: 'Событие', color: '#8b5cf6' },
  menu_update: { label: 'Обновление меню', color: '#f59e0b' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function RestaurantPosts({ posts }: { posts: Post[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-12 mb-4">
      <h2
        className="font-serif font-bold mb-6"
        style={{ fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--text)' }}
      >
        Новости и акции
      </h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {posts.map((post) => {
          const cat = CATEGORY_LABELS[post.category || ''] || { label: post.category, color: 'var(--text3)' };
          return (
            <article
              key={post.id}
              className="rounded-[18px] border overflow-hidden transition-all duration-300"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${cat.color}15`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {post.coverUrl && (
                <div className="h-[180px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {cat.label && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                        color: cat.color,
                        border: `1px solid color-mix(in srgb, ${cat.color} 20%, transparent)`,
                      }}
                    >
                      {cat.label}
                    </span>
                  )}
                  {post.publishedAt && (
                    <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                      {formatDate(post.publishedAt)}
                    </span>
                  )}
                </div>

                <h3
                  className="font-bold mb-2 leading-snug"
                  style={{ fontSize: '16px', color: 'var(--text)' }}
                >
                  {post.title}
                </h3>

                <p
                  className="leading-relaxed"
                  style={{
                    fontSize: '13px',
                    color: 'var(--text3)',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
