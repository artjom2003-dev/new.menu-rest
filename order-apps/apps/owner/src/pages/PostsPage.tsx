import React, { useState, useEffect } from 'react';
import { ownerApi } from '../lib/api';
import { useRestaurantStore } from '../stores/restaurantStore';

const CATEGORIES = [
  { value: 'news', label: 'Новость', icon: '📰', color: '#60A5FA' },
  { value: 'promo', label: 'Акция', icon: '🏷️', color: '#34D399' },
  { value: 'event', label: 'Событие', icon: '🎉', color: '#A78BFA' },
  { value: 'menu_update', label: 'Обновление меню', icon: '🍽️', color: '#FBBF24' },
  { value: 'article', label: 'Статья', icon: '📝', color: '#F472B6' },
];

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', label: 'Черновик' },
  published: { bg: 'rgba(52,211,153,0.12)', color: '#34D399', label: 'Опубликовано' },
  moderation: { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA', label: 'На модерации' },
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
      type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>{message}</div>
  );
}

export function PostsPage() {
  const { posts, loadPosts, restaurant } = useRestaurantStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('news');
  const [creating, setCreating] = useState(false);

  // Edit mode
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  // Filter
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  if (!restaurant) return <p className="text-text-muted py-12 text-center">Загрузка...</p>;

  const resetForm = () => {
    setTitle('');
    setBody('');
    setCategory('news');
    setEditingPostId(null);
    setShowForm(false);
  };

  const startEdit = (post: { id: number; title: string; body: string; category: string }) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setCategory(post.category);
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) { showToast('Заполните заголовок и текст', 'error'); return; }
    setCreating(true);
    try {
      // If editing, delete old post first then create new
      if (editingPostId) {
        await ownerApi.deletePost(editingPostId);
      }
      await ownerApi.createPost({ title, body, category });
      await loadPosts();
      resetForm();
      showToast(editingPostId ? 'Публикация обновлена' : 'Публикация создана', 'success');
    } catch { showToast('Ошибка сохранения', 'error'); }
    setCreating(false);
  };

  const handleDelete = async (id: number, postTitle: string) => {
    if (!confirm(`Удалить публикацию "${postTitle}"?`)) return;
    try {
      await ownerApi.deletePost(id);
      await loadPosts();
      showToast('Публикация удалена', 'success');
    } catch { showToast('Ошибка удаления', 'error'); }
  };

  const filtered = filterCategory
    ? posts.filter(p => p.category === filterCategory)
    : posts;

  const countByCategory = (cat: string) => posts.filter(p => p.category === cat).length;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Публикации</h1>
          <p className="text-xs text-text-muted mt-1">{posts.length} публикаций</p>
        </div>
        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition">
          {showForm ? 'Скрыть' : '+ Новая публикация'}
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            !filterCategory ? 'bg-primary text-white' : 'bg-surface-3 text-text-muted hover:text-text-primary'
          }`}>
          Все ({posts.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = countByCategory(cat.value);
          return (
            <button key={cat.value}
              onClick={() => setFilterCategory(filterCategory === cat.value ? null : cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                filterCategory === cat.value
                  ? 'text-white'
                  : 'bg-surface-3 text-text-muted hover:text-text-primary'
              }`}
              style={filterCategory === cat.value ? { background: cat.color } : {}}>
              <span>{cat.icon}</span>
              {cat.label}
              {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 animate-slide-up">
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            {editingPostId ? 'Редактирование публикации' : 'Новая публикация'}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Заголовок</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок публикации"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
            </div>
            <div className="relative">
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Обложка</label>
              <div className="h-32 rounded-xl bg-surface-2 border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/30 transition">
                <div className="text-center">
                  <span className="text-2xl opacity-30">📷</span>
                  <p className="text-[10px] text-text-muted mt-1">Загрузить обложку (скоро)</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Текст</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Текст публикации..." rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Тип</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 border ${
                      category === cat.value
                        ? 'text-white border-transparent'
                        : 'bg-surface-3 text-text-muted border-border hover:border-primary/30'
                    }`}
                    style={category === cat.value ? { background: cat.color, borderColor: cat.color } : {}}>
                    <span className="text-sm">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreate} disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
                {creating ? 'Сохранение...' : editingPostId ? 'Сохранить' : 'Опубликовать'}
              </button>
              <button onClick={resetForm}
                className="px-5 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium hover:text-text-primary transition">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📣</div>
          <p className="text-text-muted text-sm">
            {filterCategory ? 'Нет публикаций в этой категории' : 'Нет публикаций. Создайте первую!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(post => {
            const st = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            const cat = CATEGORIES.find(c => c.value === post.category);
            return (
              <div key={post.id} className="bg-card rounded-xl border border-border p-4 group hover:border-primary/20 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {cat && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: `${cat.color}18`, color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">{post.title}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{post.body}</p>
                    <p className="text-[11px] text-text-muted mt-2">
                      {new Date(post.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button
                      onClick={() => startEdit(post)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-primary hover:bg-primary/10 transition"
                      title="Редактировать">
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Удалить">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
