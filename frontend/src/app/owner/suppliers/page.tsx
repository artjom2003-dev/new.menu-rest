'use client';

import { useState, useEffect } from 'react';
import { ownerApi } from '@/lib/api';

type Tab = 'catalog' | 'inquiries' | 'orders' | 'compare';

const SUPPLIER_CATS = [
  { id: 'all', label: 'Все', icon: '📦' },
  { id: 'produce', label: 'Овощи и фрукты', icon: '🥬' },
  { id: 'meat', label: 'Мясо', icon: '🥩' },
  { id: 'fish', label: 'Рыба и морепродукты', icon: '🐟' },
  { id: 'dairy', label: 'Молочка', icon: '🧀' },
  { id: 'beverages', label: 'Напитки', icon: '🍷' },
  { id: 'bakery', label: 'Выпечка и мука', icon: '🍞' },
  { id: 'spices', label: 'Специи и соусы', icon: '🌶️' },
  { id: 'equipment', label: 'Оборудование', icon: '🔧' },
  { id: 'cleaning', label: 'Уборка и хим.', icon: '🧹' },
  { id: 'packaging', label: 'Упаковка', icon: '📦' },
  { id: 'textile', label: 'Текстиль', icon: '🧵' },
];

interface Supplier {
  id: number; name: string; slug: string; category: string;
  description: string; logoEmoji: string; rating: number; reviewCount: number;
  deliveryTerms: string; minOrder: number; city: string;
  isVerified: boolean; phone?: string; email?: string;
  products: { name: string; unit: string; price: number; inStock: boolean }[];
}

interface Inquiry {
  id: number; supplierName: string; subject: string; message: string;
  status: 'pending' | 'answered' | 'closed'; replyText?: string;
  createdAt: string; repliedAt?: string;
}

interface Order {
  id: number; supplierName: string; items: { name: string; qty: number; unit: string; price: number }[];
  totalAmount: number; status: 'draft' | 'sent' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryDate?: string; createdAt: string;
}

// Demo supplier data
const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: 1, name: 'АгроФреш', slug: 'agrofresh', category: 'produce', logoEmoji: '🥬',
    description: 'Свежие овощи и фрукты от фермеров. Ежедневная доставка по Москве и МО. Работаем с ресторанами от 2015 года.',
    rating: 4.7, reviewCount: 42, deliveryTerms: 'Доставка ежедневно с 6:00, бесплатно от 15 000 ₽', minOrder: 5000,
    city: 'Москва', isVerified: true, phone: '+7 495 123-45-67', email: 'info@agrofresh.ru',
    products: [
      { name: 'Томаты черри', unit: 'кг', price: 450, inStock: true },
      { name: 'Авокадо Хасс', unit: 'шт', price: 120, inStock: true },
      { name: 'Руккола', unit: 'кг', price: 680, inStock: true },
      { name: 'Лимоны', unit: 'кг', price: 180, inStock: false },
    ],
  },
  {
    id: 2, name: 'МясоПрофи', slug: 'myasoprofi', category: 'meat', logoEmoji: '🥩',
    description: 'Охлаждённое мясо и полуфабрикаты для ресторанов. Мраморная говядина, фермерская свинина, птица.',
    rating: 4.5, reviewCount: 28, deliveryTerms: 'Доставка Пн/Ср/Пт, рефрижератор', minOrder: 10000,
    city: 'Москва', isVerified: true, phone: '+7 495 222-33-44',
    products: [
      { name: 'Рибай стейк', unit: 'кг', price: 2800, inStock: true },
      { name: 'Филе миньон', unit: 'кг', price: 3400, inStock: true },
      { name: 'Куриная грудка', unit: 'кг', price: 380, inStock: true },
      { name: 'Свиная вырезка', unit: 'кг', price: 680, inStock: true },
    ],
  },
  {
    id: 3, name: 'Океан-Трейд', slug: 'ocean-trade', category: 'fish', logoEmoji: '🐟',
    description: 'Свежая рыба и морепродукты. Прямые поставки с Мурманска и Дальнего Востока.',
    rating: 4.3, reviewCount: 19, deliveryTerms: 'Доставка Вт/Чт, термобоксы', minOrder: 15000,
    city: 'Москва', isVerified: false, phone: '+7 495 333-44-55',
    products: [
      { name: 'Лосось (филе)', unit: 'кг', price: 1600, inStock: true },
      { name: 'Креветки тигровые', unit: 'кг', price: 2200, inStock: true },
      { name: 'Тунец (стейк)', unit: 'кг', price: 2800, inStock: false },
    ],
  },
  {
    id: 4, name: 'ВиноГрад', slug: 'vinograd', category: 'beverages', logoEmoji: '🍷',
    description: 'Вина, крепкий алкоголь, безалкогольные напитки для HoReCa. Лицензия, все документы.',
    rating: 4.8, reviewCount: 56, deliveryTerms: 'Доставка 1-2 дня, бесплатно от 30 000 ₽', minOrder: 20000,
    city: 'Москва', isVerified: true, email: 'orders@vinograd.biz',
    products: [
      { name: 'Пино Гриджо (Италия)', unit: 'бут', price: 890, inStock: true },
      { name: 'Каберне Совиньон (Чили)', unit: 'бут', price: 720, inStock: true },
      { name: 'Просекко', unit: 'бут', price: 1100, inStock: true },
    ],
  },
  {
    id: 5, name: 'ЧистоПро', slug: 'chistopro', category: 'cleaning', logoEmoji: '🧹',
    description: 'Профессиональная химия для ресторанов. Моющие средства, дезинфекция, расходники.',
    rating: 4.2, reviewCount: 14, deliveryTerms: 'Доставка 2-3 дня', minOrder: 3000,
    city: 'Москва', isVerified: false,
    products: [
      { name: 'Средство для кухни (5л)', unit: 'шт', price: 650, inStock: true },
      { name: 'Дезинфектор (1л)', unit: 'шт', price: 320, inStock: true },
    ],
  },
  {
    id: 6, name: 'ДэйриЛайн', slug: 'dairyline', category: 'dairy', logoEmoji: '🧀',
    description: 'Молочная продукция для ресторанов: сыры, сливки, масло. Фермерское и импорт.',
    rating: 4.6, reviewCount: 31, deliveryTerms: 'Ежедневно, рефрижератор', minOrder: 8000,
    city: 'Москва', isVerified: true,
    products: [
      { name: 'Моцарелла (буррата)', unit: 'кг', price: 1400, inStock: true },
      { name: 'Пармезан 24 мес', unit: 'кг', price: 2600, inStock: true },
      { name: 'Сливки 33%', unit: 'л', price: 280, inStock: true },
      { name: 'Масло сливочное 82.5%', unit: 'кг', price: 780, inStock: true },
    ],
  },
  {
    id: 7, name: 'ТехноКухня', slug: 'technokitchen', category: 'equipment', logoEmoji: '🔧',
    description: 'Профессиональное оборудование для ресторанов. Продажа, лизинг, сервис.',
    rating: 4.4, reviewCount: 22, deliveryTerms: 'Индивидуально, монтаж включён', minOrder: 50000,
    city: 'Москва', isVerified: true, phone: '+7 495 777-88-99',
    products: [
      { name: 'Конвектомат Rational', unit: 'шт', price: 650000, inStock: true },
      { name: 'Шоковая заморозка', unit: 'шт', price: 280000, inStock: true },
      { name: 'Су-вид', unit: 'шт', price: 45000, inStock: true },
    ],
  },
  {
    id: 8, name: 'СпецияМир', slug: 'speciamir', category: 'spices', logoEmoji: '🌶️',
    description: 'Специи, соусы, масла со всего мира. Собственная обжарка и помол.',
    rating: 4.9, reviewCount: 67, deliveryTerms: 'Доставка 1-2 дня, от 2 000 ₽ бесплатно', minOrder: 2000,
    city: 'Москва', isVerified: true,
    products: [
      { name: 'Шафран (Иран)', unit: 'г', price: 85, inStock: true },
      { name: 'Трюфельное масло', unit: 'бут', price: 1200, inStock: true },
      { name: 'Соус Шрирача (5л)', unit: 'шт', price: 890, inStock: true },
    ],
  },
];

const DEMO_INQUIRIES: Inquiry[] = [
  { id: 1, supplierName: 'АгроФреш', subject: 'Еженедельная поставка зелени', message: 'Добрый день! Интересует регулярная поставка: руккола 5кг, шпинат 3кг, базилик 2кг еженедельно.', status: 'answered', replyText: 'Здравствуйте! Можем организовать поставку по вторникам и пятницам. Скидка 10% при объёме от 15кг/нед. Давайте обсудим детали по телефону?', createdAt: '2026-03-20T10:00:00', repliedAt: '2026-03-20T14:30:00' },
  { id: 2, supplierName: 'МясоПрофи', subject: 'Прайс на мраморную говядину', message: 'Запрос актуального прайса на мраморную говядину (Рибай, Стриплойн, Т-бон). Объём около 50кг/мес.', status: 'pending', createdAt: '2026-03-22T09:00:00' },
];

const DEMO_ORDERS: Order[] = [
  {
    id: 1, supplierName: 'АгроФреш',
    items: [{ name: 'Томаты черри', qty: 5, unit: 'кг', price: 450 }, { name: 'Руккола', qty: 3, unit: 'кг', price: 680 }, { name: 'Авокадо Хасс', qty: 20, unit: 'шт', price: 120 }],
    totalAmount: 6690, status: 'delivered', deliveryDate: '2026-03-21', createdAt: '2026-03-19T08:00:00',
  },
  {
    id: 2, supplierName: 'ДэйриЛайн',
    items: [{ name: 'Моцарелла', qty: 3, unit: 'кг', price: 1400 }, { name: 'Пармезан 24 мес', qty: 2, unit: 'кг', price: 2600 }],
    totalAmount: 9400, status: 'shipped', deliveryDate: '2026-03-24', createdAt: '2026-03-22T11:00:00',
  },
  {
    id: 3, supplierName: 'МясоПрофи',
    items: [{ name: 'Рибай стейк', qty: 10, unit: 'кг', price: 2800 }],
    totalAmount: 28000, status: 'confirmed', deliveryDate: '2026-03-25', createdAt: '2026-03-23T07:00:00',
  },
];

const ORDER_STATUS: Record<string, { color: string; label: string; step: number }> = {
  draft: { color: '#9ca3af', label: 'Черновик', step: 0 },
  sent: { color: '#fbbf24', label: 'Отправлен', step: 1 },
  confirmed: { color: '#60a5fa', label: 'Подтверждён', step: 2 },
  shipped: { color: '#a78bfa', label: 'В доставке', step: 3 },
  delivered: { color: '#4ade80', label: 'Доставлен', step: 4 },
  cancelled: { color: '#f87171', label: 'Отменён', step: -1 },
};

const INQ_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: '#fbbf24', label: 'Ожидает ответа' },
  answered: { color: '#4ade80', label: 'Ответ получен' },
  closed: { color: '#9ca3af', label: 'Закрыт' },
};

export default function OwnerSuppliersSection() {
  const [myRestaurant, setMyRestaurant] = useState<{ name?: string } | null>(null);
  const [tab, setTab] = useState<Tab>('catalog');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [compareList, setCompareList] = useState<number[]>([]);

  // Inquiry form
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquirySubject, setInquirySubject] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');

  useEffect(() => {
    ownerApi.getMyRestaurant().then(r => setMyRestaurant(r.data)).catch(() => {});
  }, []);

  if (!myRestaurant) return null;

  const filteredSuppliers = DEMO_SUPPLIERS.filter(s => {
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleCompare = (id: number) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const comparedSuppliers = DEMO_SUPPLIERS.filter(s => compareList.includes(s.id));

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--text)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return (
      <span className="text-[12px]">
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
        <span className="text-[11px] font-bold ml-1" style={{ color: 'var(--text)' }}>{rating}</span>
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-0.5">Поставщики</h1>
          <p className="text-[12px] text-[var(--text3)]">B2B-платформа: каталог, запросы, заказы и сравнение</p>
        </div>
        {compareList.length > 0 && (
          <button onClick={() => setTab('compare')}
            className="rounded-[12px] px-4 py-2 text-[12px] font-bold border-0 cursor-pointer"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
            Сравнить ({compareList.length})
          </button>
        )}
      </div>

      {/* Demo banner */}
      <div className="rounded-[12px] px-4 py-2.5 mb-5 flex items-center gap-2 text-[12px]"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <span className="text-[15px]">⚠️</span>
        <span style={{ color: '#e6a800' }}><b>Демо-режим.</b> Поставщики показаны для примера. Реальный каталог подключается по запросу.</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {([
          ['catalog', '📦 Каталог'],
          ['inquiries', '💬 Мои запросы'],
          ['orders', '📋 Заказы'],
          ['compare', '⚖️ Сравнение'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer border whitespace-nowrap"
            style={{
              background: tab === id ? 'rgba(255,92,40,0.1)' : 'var(--bg2)',
              color: tab === id ? 'var(--accent)' : 'var(--text3)',
              borderColor: tab === id ? 'rgba(255,92,40,0.2)' : 'var(--card-border)',
              fontFamily: 'inherit',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ CATALOG TAB ═══ */}
      {tab === 'catalog' && (
        <div>
          {/* Search + Categories */}
          <div className="mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск поставщиков..." style={{ ...field, marginBottom: 10 }} />
            <div className="flex gap-1 flex-wrap">
              {SUPPLIER_CATS.map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer border transition-all whitespace-nowrap"
                  style={{
                    background: catFilter === c.id ? 'rgba(255,92,40,0.1)' : 'var(--bg2)',
                    color: catFilter === c.id ? 'var(--accent)' : 'var(--text3)',
                    borderColor: catFilter === c.id ? 'rgba(255,92,40,0.2)' : 'var(--card-border)',
                    fontFamily: 'inherit',
                  }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column: list + detail */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Supplier cards */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {filteredSuppliers.map(s => (
                  <div key={s.id} className="rounded-[14px] border p-4 transition-all cursor-pointer group"
                    style={{
                      borderColor: selectedSupplier?.id === s.id ? 'var(--accent)' : 'var(--card-border)',
                      background: selectedSupplier?.id === s.id ? 'rgba(255,92,40,0.03)' : 'var(--bg2)',
                    }}
                    onClick={() => setSelectedSupplier(s)}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] shrink-0"
                        style={{ background: 'var(--bg3)' }}>{s.logoEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[var(--text)] truncate">{s.name}</span>
                          {s.isVerified && (
                            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>✓</span>
                          )}
                        </div>
                        <div style={{ color: '#fbbf24' }}>{renderStars(s.rating)}
                          <span className="text-[10px] text-[var(--text3)] ml-1">({s.reviewCount})</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--text3)] m-0 mb-2 line-clamp-2 leading-snug">{s.description}</p>

                    <div className="flex flex-wrap gap-2 mb-2 text-[10px] text-[var(--text3)]">
                      <span>🚚 {s.deliveryTerms.split(',')[0]}</span>
                      <span>💰 от {s.minOrder.toLocaleString()} ₽</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setSelectedSupplier(s); }}
                        className="flex-1 rounded-[10px] py-1.5 text-[11px] font-semibold border-0 cursor-pointer"
                        style={{ background: 'rgba(255,92,40,0.08)', color: 'var(--accent)' }}>
                        Подробнее
                      </button>
                      <button onClick={e => { e.stopPropagation(); toggleCompare(s.id); }}
                        className="rounded-[10px] py-1.5 px-2.5 text-[11px] font-semibold border-0 cursor-pointer"
                        style={{
                          background: compareList.includes(s.id) ? 'rgba(139,92,246,0.15)' : 'var(--bg3)',
                          color: compareList.includes(s.id) ? '#a78bfa' : 'var(--text3)',
                        }}>
                        ⚖️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSuppliers.length === 0 && (
                <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                  <div className="text-[36px] mb-3">🔍</div>
                  <p className="text-[var(--text3)] text-[14px]">Поставщики не найдены</p>
                </div>
              )}
            </div>

            {/* Supplier detail panel */}
            {selectedSupplier && (
              <div style={{ width: 340, minWidth: 340, flexShrink: 0, position: 'sticky', top: 100 }}>
                <div className="rounded-[16px] border overflow-hidden" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  {/* Header */}
                  <div className="px-5 pt-5 pb-3" style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.06), rgba(139,92,246,0.06))' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px]"
                          style={{ background: 'var(--bg3)' }}>{selectedSupplier.logoEmoji}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-[var(--text)]">{selectedSupplier.name}</span>
                            {selectedSupplier.isVerified && (
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>Проверен</span>
                            )}
                          </div>
                          <div style={{ color: '#fbbf24' }}>{renderStars(selectedSupplier.rating)}
                            <span className="text-[10px] text-[var(--text3)] ml-1">({selectedSupplier.reviewCount} отзывов)</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setSelectedSupplier(null)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] border-0 cursor-pointer"
                        style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>✕</button>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] leading-snug m-0">{selectedSupplier.description}</p>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Contacts */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Контакты</div>
                      {selectedSupplier.phone && <div className="text-[var(--text2)]">📞 {selectedSupplier.phone}</div>}
                      {selectedSupplier.email && <div className="text-[var(--text2)]">📧 {selectedSupplier.email}</div>}
                      <div className="text-[var(--text2)]">📍 {selectedSupplier.city}</div>
                    </div>

                    {/* Terms */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Условия</div>
                      <div className="text-[var(--text2)]">🚚 {selectedSupplier.deliveryTerms}</div>
                      <div className="text-[var(--text2)]">💰 Мин. заказ: {selectedSupplier.minOrder.toLocaleString()} ₽</div>
                    </div>

                    {/* Products */}
                    <div>
                      <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2">Каталог товаров</div>
                      <div className="space-y-1.5">
                        {selectedSupplier.products.map(p => (
                          <div key={p.name} className="flex items-center justify-between rounded-[8px] px-3 py-2"
                            style={{ background: 'var(--bg1)', border: '1px solid var(--card-border)' }}>
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] text-[var(--text)]">{p.name}</span>
                              {!p.inStock && <span className="text-[9px] ml-1.5" style={{ color: '#f87171' }}>нет в наличии</span>}
                            </div>
                            <span className="text-[12px] font-bold shrink-0 ml-2" style={{ color: 'var(--accent)' }}>
                              {p.price.toLocaleString()} ₽/{p.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowInquiryForm(true); }}
                        className="flex-1 rounded-[12px] py-2.5 text-[12px] font-bold text-white border-0 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>
                        Написать запрос
                      </button>
                      <button onClick={() => toggleCompare(selectedSupplier.id)}
                        className="rounded-[12px] py-2.5 px-4 text-[12px] font-bold border-0 cursor-pointer"
                        style={{
                          background: compareList.includes(selectedSupplier.id) ? 'rgba(139,92,246,0.15)' : 'var(--bg3)',
                          color: compareList.includes(selectedSupplier.id) ? '#a78bfa' : 'var(--text3)',
                        }}>
                        ⚖️ Сравнить
                      </button>
                    </div>

                    {/* Inquiry form */}
                    {showInquiryForm && (
                      <div className="rounded-[12px] p-3 space-y-2" style={{ background: 'var(--bg1)', border: '1px solid var(--card-border)' }}>
                        <input value={inquirySubject} onChange={e => setInquirySubject(e.target.value)}
                          placeholder="Тема запроса" style={{ ...field, fontSize: 12, padding: '8px 12px' }} />
                        <textarea value={inquiryMessage} onChange={e => setInquiryMessage(e.target.value)}
                          placeholder="Ваш запрос..." rows={3} style={{ ...field, fontSize: 12, padding: '8px 12px', resize: 'vertical' }} />
                        <div className="flex gap-2">
                          <button onClick={() => { setShowInquiryForm(false); setInquirySubject(''); setInquiryMessage(''); }}
                            className="flex-1 rounded-[10px] py-2 text-[11px] font-semibold border-0 cursor-pointer"
                            style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>Отмена</button>
                          <button onClick={() => { setShowInquiryForm(false); setInquirySubject(''); setInquiryMessage(''); }}
                            className="flex-1 rounded-[10px] py-2 text-[11px] font-bold text-white border-0 cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>Отправить</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ INQUIRIES TAB ═══ */}
      {tab === 'inquiries' && (
        <div style={{ maxWidth: 700 }}>
          {DEMO_INQUIRIES.length === 0 ? (
            <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div className="text-[36px] mb-3">💬</div>
              <p className="text-[var(--text3)] text-[14px]">Нет запросов. Найдите поставщика в каталоге и отправьте первый запрос.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DEMO_INQUIRIES.map(inq => {
                const st = INQ_STATUS[inq.status];
                return (
                  <div key={inq.id} className="rounded-[14px] border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--text)]">{inq.supplierName}</span>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                          style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text3)]">
                        {new Date(inq.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--text2)] mb-1">{inq.subject}</div>
                    <p className="text-[12px] text-[var(--text3)] m-0 mb-2 leading-snug">{inq.message}</p>

                    {inq.replyText && (
                      <div className="rounded-[10px] px-3 py-2.5 mt-2" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <div className="text-[10px] font-bold mb-1" style={{ color: '#4ade80' }}>Ответ поставщика:</div>
                        <p className="text-[12px] text-[var(--text2)] m-0 leading-snug">{inq.replyText}</p>
                        {inq.repliedAt && (
                          <div className="text-[9px] text-[var(--text3)] mt-1">
                            {new Date(inq.repliedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ ORDERS TAB ═══ */}
      {tab === 'orders' && (
        <div style={{ maxWidth: 700 }}>
          {DEMO_ORDERS.length === 0 ? (
            <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div className="text-[36px] mb-3">📋</div>
              <p className="text-[var(--text3)] text-[14px]">Нет заказов.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DEMO_ORDERS.map(order => {
                const st = ORDER_STATUS[order.status];
                return (
                  <div key={order.id} className="rounded-[14px] border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--text)]">{order.supplierName}</span>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                          style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                      </div>
                      <span className="text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
                        {order.totalAmount.toLocaleString()} ₽
                      </span>
                    </div>

                    {/* Progress bar */}
                    {st.step >= 0 && (
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4].map(step => (
                          <div key={step} className="flex-1 rounded-full" style={{
                            height: 4,
                            background: step <= st.step ? st.color : 'var(--bg3)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-1 mb-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text2)]">{item.name} x{item.qty} {item.unit}</span>
                          <span className="text-[var(--text)] font-semibold">{(item.qty * item.price).toLocaleString()} ₽</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--text3)] mt-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <span>Создан: {new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
                      {order.deliveryDate && <span>Доставка: {new Date(order.deliveryDate).toLocaleDateString('ru-RU')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPARE TAB ═══ */}
      {tab === 'compare' && (
        <div>
          {comparedSuppliers.length === 0 ? (
            <div className="rounded-[16px] border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <div className="text-[36px] mb-3">⚖️</div>
              <p className="text-[var(--text3)] text-[14px]">Добавьте поставщиков для сравнения (до 3) из каталога</p>
              <button onClick={() => setTab('catalog')}
                className="mt-3 rounded-[10px] px-4 py-2 text-[12px] font-semibold border-0 cursor-pointer"
                style={{ background: 'rgba(255,92,40,0.1)', color: 'var(--accent)' }}>
                Перейти в каталог
              </button>
            </div>
          ) : (
            <div className="rounded-[16px] border overflow-hidden" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="text-[11px] text-[var(--text3)] text-left font-semibold p-3" style={{ borderBottom: '1px solid var(--card-border)', width: 140 }}>Параметр</th>
                    {comparedSuppliers.map(s => (
                      <th key={s.id} className="p-3 text-center" style={{ borderBottom: '1px solid var(--card-border)', borderLeft: '1px solid var(--card-border)' }}>
                        <div className="text-[20px] mb-1">{s.logoEmoji}</div>
                        <div className="text-[13px] font-bold text-[var(--text)]">{s.name}</div>
                        <button onClick={() => toggleCompare(s.id)} className="text-[9px] border-0 cursor-pointer mt-1"
                          style={{ background: 'none', color: '#f87171' }}>Убрать</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Рейтинг', key: 'rating', render: (s: Supplier) => <><span style={{ color: '#fbbf24' }}>★</span> {s.rating} ({s.reviewCount})</> },
                    { label: 'Мин. заказ', key: 'minOrder', render: (s: Supplier) => `${s.minOrder.toLocaleString()} ₽` },
                    { label: 'Доставка', key: 'delivery', render: (s: Supplier) => s.deliveryTerms },
                    { label: 'Проверен', key: 'verified', render: (s: Supplier) => s.isVerified ? <span style={{ color: '#4ade80' }}>✓ Да</span> : <span style={{ color: '#9ca3af' }}>Нет</span> },
                    { label: 'Город', key: 'city', render: (s: Supplier) => s.city },
                    { label: 'Товаров', key: 'products', render: (s: Supplier) => `${s.products.length} позиций` },
                  ].map(row => (
                    <tr key={row.key}>
                      <td className="text-[11px] text-[var(--text3)] font-semibold p-3" style={{ borderBottom: '1px solid var(--card-border)' }}>{row.label}</td>
                      {comparedSuppliers.map(s => (
                        <td key={s.id} className="text-[12px] text-[var(--text)] text-center p-3"
                          style={{ borderBottom: '1px solid var(--card-border)', borderLeft: '1px solid var(--card-border)' }}>
                          {row.render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
