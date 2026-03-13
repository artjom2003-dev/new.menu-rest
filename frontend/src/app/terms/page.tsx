import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Условия использования — MenuRest',
  description: 'Условия использования сервиса MenuRest.',
};

export default function TermsPage() {
  return (
    <main className="max-w-[800px] mx-auto px-5 py-16">
      <h1 className="font-serif text-[36px] font-black text-[var(--text)] mb-6">Условия использования</h1>

      <div className="space-y-6 text-[15px] text-[var(--text2)] leading-relaxed">
        <p>Дата последнего обновления: 1 марта 2026 г.</p>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">1. Общие положения</h2>
          <p>
            Настоящие Условия регулируют использование сервиса MenuRest. Регистрируясь или
            используя Сервис, вы принимаете настоящие Условия в полном объёме.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">2. Услуги Сервиса</h2>
          <p>
            MenuRest предоставляет платформу для поиска ресторанов, бронирования столиков,
            публикации отзывов и участия в программе лояльности.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">3. Обязательства пользователя</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Предоставлять достоверную информацию при регистрации</li>
            <li>Не публиковать ложные или оскорбительные отзывы</li>
            <li>Не использовать Сервис для рассылки спама или вредоносных действий</li>
            <li>Являться на забронированные визиты или отменять бронирование заранее</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">4. Ответственность</h2>
          <p>
            Сервис не несёт ответственности за качество услуг ресторанов-партнёров.
            Информация о заведениях предоставляется «как есть» и может отличаться от актуальной.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">5. Изменение условий</h2>
          <p>
            Мы оставляем за собой право изменять настоящие Условия. Актуальная версия
            всегда доступна на данной странице. Продолжая использовать Сервис после изменений,
            вы принимаете обновлённые Условия.
          </p>
        </section>
      </div>
    </main>
  );
}
