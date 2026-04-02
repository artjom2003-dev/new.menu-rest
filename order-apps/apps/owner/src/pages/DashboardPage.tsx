import React from 'react';
import { Link } from 'react-router-dom';
import { useRestaurantStore } from '../stores/restaurantStore';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}15` }}>
          {icon}
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { restaurant, posts } = useRestaurantStore();

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">{'\u{1F3EA}'}</div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">{'\u0420\u0435\u0441\u0442\u043E\u0440\u0430\u043D \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D'}</h2>
        <p className="text-sm text-text-muted">{'\u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u0440\u0435\u0441\u0442\u043E\u0440\u0430\u043D\u0430 \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{restaurant.name}</h1>
          <p className="text-sm text-text-muted mt-1">
            {restaurant.address} {restaurant.city?.name ? `\u00B7 ${restaurant.city.name}` : ''}
          </p>
        </div>
        <a
          href={`https://new.menu-rest.com/restaurants/${restaurant.slug}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-surface-3 border border-border text-xs font-medium text-text-secondary hover:text-primary hover:border-primary/30 transition no-underline"
        >
          {'\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430 \u0441\u0430\u0439\u0442\u0435 \u2197'}
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={'\u2B50'} label={'\u0420\u0435\u0439\u0442\u0438\u043D\u0433'} value={restaurant.rating ? Number(restaurant.rating).toFixed(1) : '\u2014'} color="#FBBF24" />
        <StatCard icon={'\u{1F4AC}'} label={'\u041E\u0442\u0437\u044B\u0432\u043E\u0432'} value={restaurant.reviewCount || 0} color="#60A5FA" />
        <StatCard icon={'\u{1F4F8}'} label={'\u0424\u043E\u0442\u043E'} value={restaurant.photos?.length || 0} color="#A78BFA" />
        <StatCard icon={'\u{1F4B0}'} label={'\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0447\u0435\u043A'} value={restaurant.averageBill ? `${restaurant.averageBill} \u20BD` : '\u2014'} color="#34D399" />
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-text-secondary mb-4">{'\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F'}</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { to: '/edit', icon: '\u270F\uFE0F', label: '\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443' },
          { to: '/menu', icon: '\u{1F4CB}', label: '\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043C\u0435\u043D\u044E' },
          { to: '/posts', icon: '\u{1F4E3}', label: '\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044E' },
          { to: '/bookings', icon: '\u{1F4C5}', label: '\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F' },
          { to: '/analytics', icon: '\u{1F4C8}', label: '\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430' },
          { to: '/reviews', icon: '\u2B50', label: '\u041E\u0442\u0437\u044B\u0432\u044B' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-surface-3 transition no-underline"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-sm font-medium text-text-primary">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent posts */}
      {posts.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-text-secondary mb-4">{'\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438'}</h2>
          <div className="space-y-2">
            {posts.slice(0, 3).map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">{post.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{post.category} {'\u00B7'} {new Date(post.createdAt).toLocaleDateString('ru')}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  post.status === 'published' ? 'bg-green-500/10 text-green-400' :
                  post.status === 'moderation' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {post.status === 'published' ? '\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E' : post.status === 'moderation' ? '\u041D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438' : '\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
