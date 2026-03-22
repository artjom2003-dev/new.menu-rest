'use client';

import { useState, useEffect } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import { ownerApi } from '@/lib/api';

const CATS: Record<string, string[]> = {
  job: ['Повар', 'Официант', 'Бармен', 'Менеджер', 'Хостес', 'Мойщик', 'Другое'],
  supplier: ['Продукты', 'Напитки', 'Оборудование', 'Мебель', 'Посуда', 'Другое'],
};

interface Listing { id: number; type: string; title: string; description?: string; category?: string; salary?: string; contactInfo?: string; createdAt?: string }

export default function OwnerListingsPage() {
  const { myRestaurant } = useOwner();
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'job' | 'supplier'>('job');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [salary, setSalary] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { ownerApi.getListings().then(r => setListings(r.data)).catch(() => {}); }, []);
  useEffect(() => { setCategory(CATS[type][0]); }, [type]);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await ownerApi.createListing({ type, title, description, category, salary, contactInfo });
      setListings(prev => [res.data, ...prev]);
      setTitle(''); setDescription(''); setSalary(''); setContactInfo(''); setShowForm(false);
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    try { await ownerApi.deleteListing(id); setListings(prev => prev.filter(l => l.id !== id)); } catch { /* ignore */ }
  };

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none',
  };
  const btnGrad: React.CSSProperties = { background: 'linear-gradient(135deg, var(--accent), #ff8c42)' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="font-serif text-[22px] font-bold text-[var(--text)]">Объявления</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer" style={btnGrad}>
          {showForm ? 'Скрыть' : 'Новое объявление'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-[16px] border p-5 mb-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['job', 'supplier'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className="rounded-[10px] px-4 py-2 text-[13px] font-bold border-0 cursor-pointer"
                style={{ background: type === t ? 'linear-gradient(135deg, var(--accent), #ff8c42)' : 'var(--bg3)', color: type === t ? '#fff' : 'var(--text3)' }}>
                {t === 'job' ? 'Вакансия' : 'Поставщик'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок" style={field} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание..." rows={3} style={{ ...field, resize: 'vertical' }} />
            <select value={category} onChange={e => setCategory(e.target.value)} style={field}>
              {CATS[type].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={salary} onChange={e => setSalary(e.target.value)} placeholder={type === 'job' ? 'Зарплата (напр. от 60 000 ₽)' : 'Бюджет'} style={field} />
            <input value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Контактная информация" style={field} />
            <button onClick={handleCreate} disabled={creating}
              className="rounded-[12px] px-6 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer"
              style={{ background: creating ? 'var(--text3)' : 'linear-gradient(135deg, var(--accent), #ff8c42)', alignSelf: 'flex-start' }}>
              {creating ? 'Создание...' : 'Опубликовать'}
            </button>
          </div>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <p className="text-[var(--text3)] text-[14px]">Нет объявлений. Создайте первое!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listings.map(l => (
            <div key={l.id} className="rounded-[14px] border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="text-[15px] font-bold text-[var(--text)]">{l.title}</span>
                <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: l.type === 'job' ? 'rgba(100,160,255,0.12)' : 'rgba(57,255,130,0.12)', color: l.type === 'job' ? '#64a0ff' : '#39ff82' }}>
                  {l.type === 'job' ? 'Вакансия' : 'Поставщик'}
                </span>
                {l.category && <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>{l.category}</span>}
                <button onClick={() => handleDelete(l.id)}
                  className="ml-auto rounded-[8px] px-2 py-1 text-[11px] border-0 cursor-pointer"
                  style={{ background: 'rgba(255,60,60,0.1)', color: '#ff5c5c' }}>Удалить</button>
              </div>
              {l.description && <p className="text-[13px] text-[var(--text2)] m-0 line-clamp-2">{l.description}</p>}
              <div className="flex gap-4 mt-2 text-[11px] text-[var(--text3)]">
                {l.salary && <span>{l.salary}</span>}
                {l.contactInfo && <span>{l.contactInfo}</span>}
                {l.createdAt && <span>{new Date(l.createdAt).toLocaleDateString('ru-RU')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
