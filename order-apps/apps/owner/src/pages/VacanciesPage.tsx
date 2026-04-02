import React, { useState, useEffect, useCallback } from 'react';
import { ownerApi } from '../lib/api';
import { useRestaurantStore } from '../stores/restaurantStore';

/* ── constants ── */

const JOB_CATEGORIES = ['Повар', 'Официант', 'Бармен', 'Хостес', 'Менеджер', 'Уборка', 'Доставка', 'Другое'];
const SUPPLIER_CATEGORIES = ['Продукты', 'Напитки', 'Оборудование', 'Расходники', 'Мебель', 'Другое'];

const MOCK_APPLICANTS = [
  { id: 1, name: 'Иван Петров', phone: '+7 912 345-67-89', date: '2026-03-28', status: 'new' },
  { id: 2, name: 'Мария Сидорова', phone: '+7 903 456-78-90', date: '2026-03-29', status: 'reviewed' },
  { id: 3, name: 'Алексей Козлов', phone: '+7 916 567-89-01', date: '2026-03-30', status: 'new' },
];

type ListingType = 'job' | 'supplier';
type ListingStatus = 'active' | 'closed';

interface Listing {
  id: number;
  title: string;
  description: string;
  category: string;
  type: ListingType;
  status: ListingStatus;
  salaryMin?: number;
  salaryMax?: number;
  contact?: string;
  createdAt: string;
}

/* ── Toast ── */

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
      type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>{message}</div>
  );
}

/* ── Main ── */

export function VacanciesPage() {
  const { restaurant } = useRestaurantStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Data
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & filters
  const [activeTab, setActiveTab] = useState<ListingType>('job');
  const [filterStatus, setFilterStatus] = useState<ListingStatus | 'all'>('all');

  // Modal form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<ListingType>('job');
  const [formSalaryMin, setFormSalaryMin] = useState('');
  const [formSalaryMax, setFormSalaryMax] = useState('');
  const [formContact, setFormContact] = useState('');
  const [saving, setSaving] = useState(false);

  // Applicants panel
  const [applicantsForId, setApplicantsForId] = useState<number | null>(null);

  const loadListings = useCallback(async () => {
    try {
      const res = await ownerApi.getListings();
      setListings(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  if (!restaurant) return <p className="text-text-muted py-12 text-center">Загрузка...</p>;

  const categories = activeTab === 'job' ? JOB_CATEGORIES : SUPPLIER_CATEGORIES;

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormCategory(''); setFormType(activeTab);
    setFormSalaryMin(''); setFormSalaryMax(''); setFormContact('');
    setEditingId(null); setShowModal(false);
  };

  const openCreate = () => {
    resetForm();
    setFormType(activeTab);
    setFormCategory(categories[0]);
    setShowModal(true);
  };

  const openEdit = (l: Listing) => {
    setEditingId(l.id);
    setFormTitle(l.title);
    setFormDesc(l.description);
    setFormCategory(l.category);
    setFormType(l.type);
    setFormSalaryMin(l.salaryMin ? String(l.salaryMin) : '');
    setFormSalaryMax(l.salaryMax ? String(l.salaryMax) : '');
    setFormContact(l.contact || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { showToast('Введите название', 'error'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await ownerApi.deleteListing(editingId);
      }
      await ownerApi.createListing({
        title: formTitle,
        description: formDesc,
        category: formCategory || categories[0],
        type: formType,
        salaryMin: formSalaryMin ? Number(formSalaryMin) : undefined,
        salaryMax: formSalaryMax ? Number(formSalaryMax) : undefined,
        contact: formContact || undefined,
      });
      await loadListings();
      resetForm();
      showToast(editingId ? 'Объявление обновлено' : 'Объявление создано', 'success');
    } catch { showToast('Ошибка сохранения', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Удалить "${title}"?`)) return;
    try {
      await ownerApi.deleteListing(id);
      await loadListings();
      showToast('Удалено', 'success');
    } catch { showToast('Ошибка удаления', 'error'); }
  };

  const filtered = listings
    .filter(l => l.type === activeTab)
    .filter(l => filterStatus === 'all' || l.status === filterStatus);

  const tabCounts = {
    job: listings.filter(l => l.type === 'job').length,
    supplier: listings.filter(l => l.type === 'supplier').length,
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Объявления</h1>
          <p className="text-xs text-text-muted mt-1">{listings.length} объявлений</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition">
          + Новое объявление
        </button>
      </div>

      {/* Tabs: job / supplier */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'job' as ListingType, label: 'Вакансии', icon: '👤', count: tabCounts.job },
          { key: 'supplier' as ListingType, label: 'Для поставщиков', icon: '📦', count: tabCounts.supplier },
        ]).map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setFilterStatus('all'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-surface-3 text-text-muted hover:text-text-primary'
            }`}>
            <span>{tab.icon}</span>
            {tab.label}
            <span className="opacity-60 text-xs">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'all' as const, label: 'Все' },
          { key: 'active' as const, label: 'Активные' },
          { key: 'closed' as const, label: 'Закрытые' },
        ]).map(f => (
          <button key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filterStatus === f.key
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-3 text-text-muted hover:text-text-primary'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-text-muted text-sm text-center py-12">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">{activeTab === 'job' ? '👤' : '📦'}</div>
          <p className="text-text-muted text-sm">
            {activeTab === 'job' ? 'Нет вакансий. Создайте первую!' : 'Нет объявлений для поставщиков.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(listing => {
            const isActive = listing.status === 'active' || !listing.status;
            return (
              <div key={listing.id} className="bg-card rounded-xl border border-border p-4 group hover:border-primary/20 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: activeTab === 'job' ? 'rgba(96,165,250,0.12)' : 'rgba(251,191,36,0.12)',
                          color: activeTab === 'job' ? '#60A5FA' : '#FBBF24',
                        }}>
                        {listing.category || (activeTab === 'job' ? 'Вакансия' : 'Поставщик')}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isActive ? 'rgba(52,211,153,0.12)' : 'rgba(161,161,170,0.12)',
                          color: isActive ? '#34D399' : '#A1A1AA',
                        }}>
                        {isActive ? 'Активно' : 'Закрыто'}
                      </span>
                      {(listing.salaryMin || listing.salaryMax) && (
                        <span className="text-[10px] text-text-muted">
                          {listing.salaryMin && listing.salaryMax
                            ? `${listing.salaryMin.toLocaleString()} - ${listing.salaryMax.toLocaleString()} ₽`
                            : listing.salaryMin
                              ? `от ${listing.salaryMin.toLocaleString()} ₽`
                              : `до ${listing.salaryMax!.toLocaleString()} ₽`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">{listing.title}</h3>
                    {listing.description && (
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{listing.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {listing.contact && (
                        <p className="text-[11px] text-text-muted">Контакт: {listing.contact}</p>
                      )}
                      <p className="text-[11px] text-text-muted">
                        {new Date(listing.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button
                      onClick={() => setApplicantsForId(applicantsForId === listing.id ? null : listing.id)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-blue-400 hover:bg-blue-500/10 transition"
                      title="Отклики">
                      📋
                    </button>
                    <button
                      onClick={() => openEdit(listing)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-primary hover:bg-primary/10 transition"
                      title="Редактировать">
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id, listing.title)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Удалить">
                      🗑
                    </button>
                  </div>
                </div>

                {/* Applicants panel */}
                {applicantsForId === listing.id && (
                  <div className="mt-3 pt-3 border-t border-border animate-slide-up">
                    <p className="text-xs font-semibold text-text-primary mb-2">Отклики ({MOCK_APPLICANTS.length})</p>
                    <div className="space-y-2">
                      {MOCK_APPLICANTS.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary">{a.name}</p>
                            <p className="text-[11px] text-text-muted">{a.phone}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: a.status === 'new' ? 'rgba(96,165,250,0.12)' : 'rgba(161,161,170,0.12)',
                                color: a.status === 'new' ? '#60A5FA' : '#A1A1AA',
                              }}>
                              {a.status === 'new' ? 'Новый' : 'Просмотрен'}
                            </span>
                            <span className="text-[10px] text-text-muted">{a.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 italic">Демо-данные. Реальные отклики появятся после запуска модуля.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <h2 className="text-base font-semibold text-text-primary mb-5">
              {editingId ? 'Редактирование объявления' : 'Новое объявление'}
            </h2>
            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Тип</label>
                <div className="flex gap-2">
                  <button onClick={() => { setFormType('job'); setFormCategory(JOB_CATEGORIES[0]); }}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition border ${
                      formType === 'job' ? 'bg-primary text-white border-primary' : 'bg-surface-3 text-text-muted border-border hover:border-primary/30'
                    }`}>
                    👤 Вакансия
                  </button>
                  <button onClick={() => { setFormType('supplier'); setFormCategory(SUPPLIER_CATEGORIES[0]); }}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition border ${
                      formType === 'supplier' ? 'bg-primary text-white border-primary' : 'bg-surface-3 text-text-muted border-border hover:border-primary/30'
                    }`}>
                    📦 Для поставщиков
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Название</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={formType === 'job' ? 'Повар-универсал' : 'Закупка продуктов'}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Описание</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Подробности..." rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none resize-none" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Категория</label>
                <div className="flex flex-wrap gap-2">
                  {(formType === 'job' ? JOB_CATEGORIES : SUPPLIER_CATEGORIES).map(cat => (
                    <button key={cat}
                      onClick={() => setFormCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                        formCategory === cat
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-3 text-text-muted border-border hover:border-primary/30'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Salary/budget range */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {formType === 'job' ? 'Зарплата (₽)' : 'Бюджет (₽)'}
                </label>
                <div className="flex gap-2">
                  <input value={formSalaryMin} onChange={e => setFormSalaryMin(e.target.value.replace(/\D/g, ''))}
                    placeholder="от" type="text"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
                  <input value={formSalaryMax} onChange={e => setFormSalaryMax(e.target.value.replace(/\D/g, ''))}
                    placeholder="до" type="text"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
                </div>
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Контактная информация</label>
                <input value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="Телефон, email или имя"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
                  {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
                </button>
                <button onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium hover:text-text-primary transition">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
