'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArticleCover } from '@/components/blog/ArticleCover';

/* ── Types ── */
interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  category: string | null;
  status: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/* ── Tabs ── */
type Tab = 'articles' | 'events' | 'promos' | 'news';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'articles', label: 'Статьи', icon: '📝', desc: 'Полезные материалы для гурманов и рестораторов' },
  { id: 'events', label: 'События', icon: '🎭', desc: 'Гастрофестивали, дегустации, мастер-классы и вечера' },
  { id: 'promos', label: 'Акции', icon: '🔥', desc: 'Спецпредложения и скидки от ресторанов' },
  { id: 'news', label: 'Новости', icon: '📢', desc: 'Открытия, обновления меню и новинки индустрии' },
];

/* ── Static content for each tab ── */
const STATIC_CONTENT: Record<Tab, Article[]> = {
  articles: [
    {
      id: 2001,
      slug: 'kak-vybrat-restoran-dlya-svidaniya',
      title: 'Как выбрать ресторан для свидания: 7 правил, о которых молчат',
      excerpt: 'Атмосфера, уровень шума, расположение столиков — рассказываем, на что обращать внимание, чтобы вечер прошёл идеально.',
      coverUrl: null,
      publishedAt: '2026-03-10T12:00:00Z',
      category: 'gourmets',
      status: 'published',
    },
    {
      id: 2002,
      slug: 'kak-uvelichit-zapolnyaemost-zala',
      title: 'Как увеличить заполняемость зала на 30% без дополнительной рекламы',
      excerpt: 'Онлайн-бронирование, правильное оформление карточки, работа с отзывами — конкретные шаги для ресторанов.',
      coverUrl: null,
      publishedAt: '2026-03-08T10:00:00Z',
      category: 'restaurants',
      status: 'published',
    },
  ],
  events: [
    {
      id: 3001,
      slug: 'gastrofest-vesna-2026',
      title: 'Гастрофест «Весна на тарелке» — 20+ ресторанов с сезонным меню',
      excerpt: '15–30 апреля лучшие рестораны города представят блюда из весенних сезонных продуктов по специальным ценам. Участие бесплатное.',
      coverUrl: null,
      publishedAt: '2026-03-11T09:00:00Z',
      category: 'events',
      status: 'published',
    },
  ],
  promos: [
    {
      id: 4001,
      slug: 'promo-biznes-lanch-skidka',
      title: 'Бизнес-ланч со скидкой 20% — подборка ресторанов-партнёров',
      excerpt: 'Каждый будний день с 12:00 до 15:00 рестораны-партнёры Menu-Rest предлагают скидку на бизнес-ланч. Бронируйте столик онлайн.',
      coverUrl: null,
      publishedAt: '2026-03-09T08:00:00Z',
      category: 'promos',
      status: 'published',
    },
  ],
  news: [
    {
      id: 5001,
      slug: 'menu-rest-ai-poisk-zapuschen',
      title: 'Menu-Rest.AI — запущен умный поиск ресторанов на естественном языке',
      excerpt: 'Теперь можно искать рестораны так: «тихое место с верандой, японская кухня, до 2500 на двоих» — и AI подберёт лучшие варианты.',
      coverUrl: null,
      publishedAt: '2026-03-11T14:00:00Z',
      category: 'news',
      status: 'published',
    },
  ],
};

/* ── Cover colors for tabs ── */
const COVER_STYLES: Record<string, { bg: string; emoji: string; gradient: string }> = {
  gourmets:    { bg: 'rgba(255,92,40,0.12)', emoji: '🍷', gradient: 'linear-gradient(135deg, rgba(255,92,40,0.2), rgba(255,140,80,0.1))' },
  restaurants: { bg: 'rgba(57,255,209,0.1)',  emoji: '🏪', gradient: 'linear-gradient(135deg, rgba(57,255,209,0.15), rgba(57,200,180,0.08))' },
  events:      { bg: 'rgba(160,120,255,0.12)', emoji: '🎭', gradient: 'linear-gradient(135deg, rgba(160,120,255,0.2), rgba(120,80,220,0.1))' },
  promos:      { bg: 'rgba(255,200,40,0.12)',  emoji: '🔥', gradient: 'linear-gradient(135deg, rgba(255,200,40,0.2), rgba(255,160,40,0.1))' },
  news:        { bg: 'rgba(80,160,255,0.12)',  emoji: '📢', gradient: 'linear-gradient(135deg, rgba(80,160,255,0.2), rgba(40,120,255,0.1))' },
};

const BADGE_LABELS: Record<string, string> = {
  gourmets: 'Гурманам',
  restaurants: 'Ресторанам',
  events: 'Событие',
  promos: 'Акция',
  news: 'Новость',
};

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  gourmets:    { bg: 'rgba(255,92,40,0.85)', color: '#fff' },
  restaurants: { bg: 'rgba(57,255,209,0.85)', color: '#000' },
  events:      { bg: 'rgba(160,120,255,0.85)', color: '#fff' },
  promos:      { bg: 'rgba(255,200,40,0.9)', color: '#000' },
  news:        { bg: 'rgba(80,160,255,0.85)', color: '#fff' },
};

/* ── Helpers ── */
function formatDate(date: string | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Inner component (uses useSearchParams) ── */
function BlogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'articles';

  const [apiArticles, setApiArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t.id === tabParam) ? tabParam : 'articles');
  const [articleSub, setArticleSub] = useState<'all' | 'gourmets' | 'restaurants'>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/articles?page=${page}&limit=9`)
      .then((r) => r.json())
      .then((data) => {
        setApiArticles(data.items || []);
        setMeta(data.meta || null);
      })
      .catch(() => setApiArticles([]))
      .finally(() => setLoading(false));
  }, [page]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setArticleSub('all');
    router.push(`/blog?tab=${newTab}`, { scroll: false });
  };

  // Merge API + static for current tab
  const staticForTab = STATIC_CONTENT[tab] || [];
  let allItems = [...apiArticles.filter((a) => {
    if (tab === 'articles') return !a.category || a.category === 'gourmets' || a.category === 'restaurants';
    return a.category === tab;
  })];
  for (const sa of staticForTab) {
    if (!allItems.find((a) => a.slug === sa.slug)) allItems.push(sa);
  }

  // Apply sub-filter for articles tab
  if (tab === 'articles' && articleSub !== 'all') {
    allItems = allItems.filter((a) => a.category === articleSub);
  }

  const tabInfo = TABS.find((t) => t.id === tab)!;

  return (
    <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 py-12">
      <h1 className="font-serif text-[42px] font-bold text-[var(--text)] mb-2">Журнал</h1>
      <p className="text-[14px] text-[var(--text3)] mb-8">
        Статьи, события, акции и новости ресторанного мира
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
            style={{
              background: tab === t.id ? 'var(--accent)' : 'var(--glass)',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              borderColor: tab === t.id ? 'var(--accent)' : 'var(--glass-border)',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <p className="text-[13px] text-[var(--text3)] mb-6">{tabInfo.desc}</p>

      {/* Sub-tabs for Articles */}
      {tab === 'articles' && (
        <div className="flex gap-1.5 mb-10">
          {([
            { id: 'all' as const, label: 'Все статьи' },
            { id: 'gourmets' as const, label: '🍷 Гурманам' },
            { id: 'restaurants' as const, label: '🏪 Ресторанам' },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => setArticleSub(s.id)}
              className="px-4 py-2 rounded-full text-[12px] font-medium border cursor-pointer transition-all"
              style={{
                background: articleSub === s.id ? 'var(--bg3)' : 'transparent',
                color: articleSub === s.id ? 'var(--text)' : 'var(--text3)',
                borderColor: articleSub === s.id ? 'var(--card-border)' : 'transparent',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[340px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">{tabInfo.icon}</div>
          <p className="text-[18px] text-[var(--text2)] font-semibold mb-2">Пока пусто</p>
          <p className="text-[13px] text-[var(--text3)]">Скоро здесь появятся {tabInfo.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {allItems.map((article) => {
            const cat = article.category || 'gourmets';
            const cover = COVER_STYLES[cat] || COVER_STYLES.gourmets;
            const badge = BADGE_COLORS[cat] || BADGE_COLORS.gourmets;
            const badgeLabel = BADGE_LABELS[cat] || cat;

            return (
              <Link key={article.id} href={`/blog/${article.slug}`} className="no-underline">
                <article
                  className="rounded-[20px] border overflow-hidden transition-all duration-[400ms] cursor-pointer h-full flex flex-col"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}>
                  {/* Cover */}
                  <div className="h-[200px] relative">
                    {article.coverUrl ? (
                      <img src={article.coverUrl} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <ArticleCover slug={article.slug} title={article.title} className="w-full h-full" />
                    )}
                    <span
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="text-[16px] font-semibold text-[var(--text)] mb-2 line-clamp-2">{article.title}</h2>
                    {article.excerpt && (
                      <p className="text-[13px] text-[var(--text3)] mb-3 line-clamp-3 flex-1">{article.excerpt}</p>
                    )}
                    <span className="text-[11px] text-[var(--text3)]">{formatDate(article.publishedAt)}</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex justify-center gap-2 mt-10 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-full text-[13px] font-semibold border cursor-pointer transition-all disabled:opacity-30 disabled:cursor-default"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
            ←
          </button>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="w-10 h-10 rounded-full text-[13px] font-semibold border cursor-pointer transition-all disabled:opacity-30 disabled:cursor-default"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 py-12">
        <div className="h-10 w-48 rounded bg-[var(--bg3)] animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[340px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))}
        </div>
      </div>
    }>
      <BlogPageInner />
    </Suspense>
  );
}
