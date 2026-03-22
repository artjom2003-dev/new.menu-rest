'use client';

import { useState } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import { ownerApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const CATEGORIES = [
  { value: 'news', label: 'Новость' },
  { value: 'promo', label: 'Акция' },
  { value: 'event', label: 'Событие' },
  { value: 'menu_update', label: 'Обновление меню' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'rgba(255,180,40,0.12)', color: '#ffb428', label: 'Черновик' },
  published: { bg: 'rgba(57,255,130,0.12)', color: '#39ff82', label: 'Опубликовано' },
  moderation: { bg: 'rgba(100,160,255,0.12)', color: '#64a0ff', label: 'На модерации' },
};

export default function OwnerPostsPage() {
  const { posts, setPosts, myRestaurant } = useOwner();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('news');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) { toast('Заполните все поля', 'error'); return; }
    setCreating(true);
    try {
      const res = await ownerApi.createPost({ title, body, category });
      setPosts(prev => [res.data, ...prev]);
      setTitle(''); setBody(''); setCategory('news'); setShowForm(false);
      toast('Публикация создана', 'success');
    } catch {
      toast('Ошибка создания', 'error');
    } finally {
      setCreating(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: '1px solid var(--card-border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 14, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="font-serif text-[22px] font-bold text-[var(--text)]">Публикации</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>
          {showForm ? 'Скрыть' : 'Новая публикация'}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="rounded-[16px] border p-5 mb-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок" style={fieldStyle} />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Текст публикации..." rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
            <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={handleCreate} disabled={creating}
              className="rounded-[12px] px-6 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer"
              style={{ background: creating ? 'var(--text3)' : 'linear-gradient(135deg, var(--accent), #ff8c42)', alignSelf: 'flex-start' }}>
              {creating ? 'Создание...' : 'Опубликовать'}
            </button>
          </div>
        </div>
      )}

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <p className="text-[var(--text3)] text-[14px]">Нет публикаций. Создайте первую!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(post => {
            const st = STATUS_COLORS[post.status] || STATUS_COLORS.draft;
            const catLabel = CATEGORIES.find(c => c.value === post.category)?.label || post.category;
            return (
              <div key={post.id} className="rounded-[14px] border p-4"
                style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="text-[15px] font-bold text-[var(--text)]">{post.title}</span>
                  <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>{catLabel}</span>
                </div>
                <p className="text-[13px] text-[var(--text2)] m-0 line-clamp-2">{post.body}</p>
                <div className="text-[11px] text-[var(--text3)] mt-2">
                  {new Date(post.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
