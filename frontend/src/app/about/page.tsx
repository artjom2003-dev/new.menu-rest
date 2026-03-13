import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О нас — MenuRest',
  description: 'MenuRest — агрегатор ресторанов с AI-поиском, бронированием и программой лояльности.',
};

export default function AboutPage() {
  return (
    <main className="max-w-[800px] mx-auto px-5 py-16">
      <h1 className="font-serif text-[36px] font-black text-[var(--text)] mb-6">О нас</h1>

      <section className="space-y-4 text-[15px] text-[var(--text2)] leading-relaxed">
        <p>
          <strong className="text-[var(--text)]">MenuRest</strong> — современная платформа для поиска ресторанов,
          бронирования столиков и управления программой лояльности. Мы помогаем гостям находить идеальные
          заведения с помощью AI-поиска, а ресторанам — привлекать новых клиентов.
        </p>

        <h2 className="font-serif text-[22px] font-bold text-[var(--text)] pt-4">Что мы предлагаем</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Умный AI-поиск — опишите, что хотите, и мы найдём подходящий ресторан</li>
          <li>Онлайн-бронирование столиков с мгновенным подтверждением</li>
          <li>Честные отзывы с оценками кухни, обслуживания, атмосферы и соотношения цена/качество</li>
          <li>Программа лояльности с бонусами за каждый визит</li>
          <li>Подробные меню с ценами и фотографиями блюд</li>
        </ul>

        <h2 className="font-serif text-[22px] font-bold text-[var(--text)] pt-4">Наша миссия</h2>
        <p>
          Сделать выбор ресторана простым и приятным. Мы верим, что каждый поход в ресторан
          должен быть особенным — и начинается это с правильного выбора.
        </p>
      </section>
    </main>
  );
}
