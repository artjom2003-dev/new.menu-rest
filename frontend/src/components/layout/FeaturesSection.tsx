'use client';

import { useState } from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  glow: string;
}

const features: Feature[] = [
  {
    icon: '🤖',
    title: 'AI-поиск',
    description: 'Опишите, что хотите — «уютное место с пастой на двоих до 3000₽» — и получите подборку за секунду',
    color: 'var(--accent)',
    glow: 'var(--accent-glow)',
  },
  {
    icon: '🍽️',
    title: 'Меню с КБЖУ',
    description: 'Калории, белки, жиры и углеводы для каждого блюда. Считайте рацион прямо при выборе ресторана',
    color: 'var(--lime)',
    glow: 'var(--lime-glow)',
  },
  {
    icon: '⚠️',
    title: 'Фильтр аллергенов',
    description: 'Укажите аллергены в профиле — мы предупредим о них в меню и подскажем безопасные блюда',
    color: '#FF6B6B',
    glow: 'rgba(255,107,107,0.3)',
  },
  {
    icon: '💰',
    title: 'Калькулятор бюджета',
    description: 'Соберите заказ на компанию, добавьте чаевые — узнайте точную сумму до похода в ресторан',
    color: 'var(--gold)',
    glow: 'rgba(255,215,0,0.3)',
  },
  {
    icon: '📅',
    title: 'Онлайн-бронирование',
    description: 'Выберите дату, время и количество гостей — забронируйте столик без звонков',
    color: 'var(--teal)',
    glow: 'var(--teal-glow)',
  },
  {
    icon: '⭐',
    title: 'Честные отзывы',
    description: 'Четыре отдельных оценки — кухня, обслуживание, атмосфера и соотношение цена/качество',
    color: 'var(--accent)',
    glow: 'var(--accent-glow)',
  },
  {
    icon: '❤️',
    title: 'Избранное',
    description: 'Сохраняйте понравившиеся рестораны в личную коллекцию, чтобы вернуться к ним позже',
    color: '#FF6B9D',
    glow: 'rgba(255,107,157,0.3)',
  },
  {
    icon: '🎁',
    title: 'Программа лояльности',
    description: 'Копите баллы за бронирования и отзывы — поднимайтесь в рейтинге и получайте бонусы',
    color: 'var(--lime)',
    glow: 'var(--lime-glow)',
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-[20px] p-6 border transition-all duration-300 cursor-default"
      style={{
        background: 'var(--card)',
        borderColor: hovered ? feature.color : 'var(--card-border)',
        transform: hovered ? 'translateY(-4px)' : '',
        boxShadow: hovered ? `0 8px 32px ${feature.glow}` : '',
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] mb-4 transition-transform duration-300"
        style={{
          background: `${feature.color}15`,
          transform: hovered ? 'scale(1.1)' : '',
        }}
      >
        {feature.icon}
      </div>

      {/* Content */}
      <h3 className="text-[16px] font-bold text-[var(--text)] mb-2">
        {feature.title}
      </h3>
      <p className="text-[13px] text-[var(--text3)] leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="font-serif text-[36px] font-bold text-[var(--text)] mb-3">
          Всё для идеального выбора
        </h2>
        <p className="text-[15px] text-[var(--text3)] max-w-[520px] mx-auto leading-relaxed">
          Не просто каталог ресторанов — умные инструменты, которые помогут найти, выбрать и забронировать
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
