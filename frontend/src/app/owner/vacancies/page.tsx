'use client';

import { useState, useEffect } from 'react';
import { ownerApi } from '@/lib/api';

const JOB_CATS = ['Повар', 'Шеф-повар', 'Официант', 'Бармен', 'Менеджер', 'Хостес', 'Администратор', 'Мойщик', 'Другое'];
const EXP_OPTIONS = ['Без опыта', 'До 1 года', '1-3 года', '3+ лет'];
const SCHEDULE_OPTIONS = ['5/2', '2/2', 'Сменный', 'Гибкий', 'Полный день', 'Частичная занятость'];

interface Vacancy {
  id: number; title: string; description?: string; category?: string;
  salary?: string; contactInfo?: string; createdAt?: string; type: string;
  schedule?: string; experience?: string; applicationsCount?: number;
  status?: 'active' | 'closed';
}

interface Application {
  id: number; applicantName: string; applicantPhone: string; applicantEmail?: string;
  experience?: string; message?: string; status: 'new' | 'reviewed' | 'accepted' | 'rejected';
  createdAt?: string; ownerNote?: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  new: { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', label: 'Новый' },
  reviewed: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', label: 'Рассмотрен' },
  accepted: { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', label: 'Принят' },
  rejected: { bg: 'rgba(239,68,68,0.1)', color: '#f87171', label: 'Отклонён' },
};

export default function OwnerVacanciesSection() {
  const [myRestaurant, setMyRestaurant] = useState<{ name?: string } | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<number | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(JOB_CATS[0]);
  const [salary, setSalary] = useState('');
  const [schedule, setSchedule] = useState(SCHEDULE_OPTIONS[0]);
  const [experience, setExperience] = useState(EXP_OPTIONS[0]);
  const [requirements, setRequirements] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    ownerApi.getMyRestaurant().then(r => setMyRestaurant(r.data)).catch(() => {});
    ownerApi.getListings()
      .then(r => setVacancies((r.data || []).filter((l: Vacancy) => l.type === 'job')))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await ownerApi.createListing({
        type: 'job', title, description,
        category, salary, contactInfo,
      });
      setVacancies(prev => [{ ...res.data, schedule, experience, status: 'active', applicationsCount: 0 }, ...prev]);
      setTitle(''); setDescription(''); setSalary(''); setContactInfo('');
      setRequirements(''); setShowForm(false);
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await ownerApi.deleteListing(id);
      setVacancies(prev => prev.filter(v => v.id !== id));
      if (selectedVacancy === id) setSelectedVacancy(null);
    } catch {}
  };

  const handleClose = (id: number) => {
    setVacancies(prev => prev.map(v => v.id === id ? { ...v, status: 'closed' } : v));
  };

  const loadApplications = (vacancyId: number) => {
    setSelectedVacancy(vacancyId);
    setLoadingApps(true);
    // Demo data — replace with API call when backend is ready
    setTimeout(() => {
      setApplications([
        { id: 1, applicantName: 'Иван Петров', applicantPhone: '+7 999 123-45-67', applicantEmail: 'ivan@mail.ru', experience: 'Работал в ресторане "Континент" 2 года, су-шеф', message: 'Ищу работу повара, готов к собеседованию в любое время', status: 'new', createdAt: '2026-03-22T10:00:00' },
        { id: 2, applicantName: 'Мария Сидорова', applicantPhone: '+7 916 555-22-33', experience: '5 лет в итальянской кухне', message: 'Имею опыт работы в Fine Dining', status: 'reviewed', createdAt: '2026-03-21T14:30:00' },
        { id: 3, applicantName: 'Алексей Козлов', applicantPhone: '+7 905 777-88-99', message: 'Начинающий, но очень мотивирован', status: 'new', createdAt: '2026-03-20T09:15:00' },
      ]);
      setLoadingApps(false);
    }, 300);
  };

  const updateAppStatus = (appId: number, status: Application['status']) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const filtered = vacancies.filter(v =>
    filter === 'all' ? true : filter === 'active' ? v.status !== 'closed' : v.status === 'closed'
  );

  const stats = {
    active: vacancies.filter(v => v.status !== 'closed').length,
    total: vacancies.length,
    apps: vacancies.reduce((s, v) => s + (v.applicationsCount || 0), 0),
  };

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--text)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-0.5">Вакансии</h1>
          <p className="text-[12px] text-[var(--text3)]">Управляйте вакансиями и откликами</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSelectedVacancy(null); }}
          className="rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer transition-all"
          style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
          {showForm ? 'Скрыть' : '+ Новая вакансия'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '📋', label: 'Активные', value: stats.active, color: '#4ade80' },
          { icon: '📊', label: 'Всего', value: stats.total, color: 'var(--accent)' },
          { icon: '👤', label: 'Откликов', value: stats.apps, color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[16px]">{s.icon}</span>
              <span className="text-[11px] text-[var(--text3)]">{s.label}</span>
            </div>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-[16px] border p-5 mb-6" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
          <h3 className="text-[15px] font-bold text-[var(--text)] mb-4">Новая вакансия</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Должность *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Су-шеф" style={field} />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Категория</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={field}>
                {JOB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Зарплата</label>
              <input value={salary} onChange={e => setSalary(e.target.value)} placeholder="от 60 000 ₽" style={field} />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">График</label>
              <select value={schedule} onChange={e => setSchedule(e.target.value)} style={field}>
                {SCHEDULE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Опыт</label>
              <select value={experience} onChange={e => setExperience(e.target.value)} style={field}>
                {EXP_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Описание</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Опишите обязанности и условия..." rows={3} style={{ ...field, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Требования</label>
              <textarea value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Что должен знать и уметь кандидат..." rows={2} style={{ ...field, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-[11px] text-[var(--text3)] mb-1 block">Контакты для связи</label>
              <input value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Телефон, email или Telegram" style={field} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="mt-4 rounded-[12px] px-6 py-2.5 text-[13px] font-bold text-white border-0 cursor-pointer"
            style={{ background: creating ? 'var(--text3)' : 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>
            {creating ? 'Публикация...' : 'Опубликовать вакансию'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {([['all', 'Все'], ['active', 'Активные'], ['closed', 'Закрытые']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className="px-4 py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer border whitespace-nowrap"
            style={{
              background: filter === id ? 'rgba(255,92,40,0.1)' : 'var(--bg2)',
              color: filter === id ? 'var(--accent)' : 'var(--text3)',
              borderColor: filter === id ? 'rgba(255,92,40,0.2)' : 'var(--card-border)',
              fontFamily: 'inherit',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Two-column: vacancies list + applications panel */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Vacancy list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 ? (
            <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div className="text-[36px] mb-3">👥</div>
              <p className="text-[var(--text3)] text-[14px]">Нет вакансий. Создайте первую!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(v => (
                <div key={v.id} className="rounded-[14px] border p-4 transition-all"
                  style={{
                    borderColor: selectedVacancy === v.id ? 'var(--accent)' : 'var(--card-border)',
                    background: selectedVacancy === v.id ? 'rgba(255,92,40,0.03)' : 'var(--bg2)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="text-[15px] font-bold text-[var(--text)]">{v.title}</span>
                    {v.category && (
                      <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'rgba(100,160,255,0.12)', color: '#64a0ff' }}>{v.category}</span>
                    )}
                    <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: v.status === 'closed' ? 'rgba(107,114,128,0.1)' : 'rgba(34,197,94,0.1)',
                        color: v.status === 'closed' ? '#9ca3af' : '#4ade80',
                      }}>
                      {v.status === 'closed' ? 'Закрыта' : 'Активна'}
                    </span>
                  </div>

                  {v.description && <p className="text-[12px] text-[var(--text2)] m-0 mb-2 line-clamp-2">{v.description}</p>}

                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-[var(--text3)]">
                    {v.salary && <span>💰 {v.salary}</span>}
                    {v.schedule && <span>🕐 {v.schedule}</span>}
                    {v.experience && <span>📋 {v.experience}</span>}
                    {v.contactInfo && <span>📞 {v.contactInfo}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => loadApplications(v.id)}
                      className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold border-0 cursor-pointer transition-all flex items-center gap-1.5"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                      👤 Отклики {v.applicationsCount ? `(${v.applicationsCount})` : ''}
                    </button>
                    {v.status !== 'closed' && (
                      <button onClick={() => handleClose(v.id)}
                        className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold border-0 cursor-pointer"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                        Закрыть
                      </button>
                    )}
                    <button onClick={() => handleDelete(v.id)}
                      className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold border-0 cursor-pointer ml-auto"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                      Удалить
                    </button>
                    {v.createdAt && (
                      <span className="text-[10px] text-[var(--text3)]">{new Date(v.createdAt).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications panel */}
        {selectedVacancy && (
          <div style={{ width: 340, minWidth: 340, flexShrink: 0, position: 'sticky', top: 100 }}>
            <div className="rounded-[16px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[14px]"
                    style={{ background: 'rgba(59,130,246,0.1)' }}>👤</span>
                  Отклики
                </h3>
                <button onClick={() => setSelectedVacancy(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] border-0 cursor-pointer"
                  style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>✕</button>
              </div>

              {loadingApps ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-[28px] mb-2">📭</div>
                  <p className="text-[12px] text-[var(--text3)]">Пока нет откликов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map(app => {
                    const st = STATUS_STYLE[app.status];
                    return (
                      <div key={app.id} className="rounded-[12px] border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--bg1)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-bold text-[var(--text)]">{app.applicantName}</span>
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                            style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>

                        <div className="space-y-1 mb-2 text-[11px] text-[var(--text3)]">
                          <div>📞 {app.applicantPhone}</div>
                          {app.applicantEmail && <div>📧 {app.applicantEmail}</div>}
                          {app.experience && <div>💼 {app.experience}</div>}
                        </div>

                        {app.message && (
                          <div className="rounded-[8px] px-3 py-2 mb-2 text-[11px] text-[var(--text2)] italic leading-snug"
                            style={{ background: 'var(--bg3)' }}>
                            "{app.message}"
                          </div>
                        )}

                        <div className="flex gap-1.5">
                          {app.status !== 'accepted' && (
                            <button onClick={() => updateAppStatus(app.id, 'accepted')}
                              className="flex-1 rounded-[8px] py-1.5 text-[10px] font-bold border-0 cursor-pointer"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                              Принять
                            </button>
                          )}
                          {app.status !== 'rejected' && (
                            <button onClick={() => updateAppStatus(app.id, 'rejected')}
                              className="flex-1 rounded-[8px] py-1.5 text-[10px] font-bold border-0 cursor-pointer"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                              Отклонить
                            </button>
                          )}
                          {app.status === 'new' && (
                            <button onClick={() => updateAppStatus(app.id, 'reviewed')}
                              className="flex-1 rounded-[8px] py-1.5 text-[10px] font-bold border-0 cursor-pointer"
                              style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                              Рассмотрен
                            </button>
                          )}
                        </div>

                        {app.createdAt && (
                          <div className="text-[9px] text-[var(--text3)] mt-2 text-right">
                            {new Date(app.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
