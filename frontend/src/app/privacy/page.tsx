import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — MenuRest',
  description: 'Политика обработки персональных данных сервиса MenuRest.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-[800px] mx-auto px-5 py-16">
      <h1 className="font-serif text-[36px] font-black text-[var(--text)] mb-6">Политика конфиденциальности</h1>

      <div className="space-y-6 text-[15px] text-[var(--text2)] leading-relaxed">
        <p>Дата последнего обновления: 1 марта 2026 г.</p>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">1. Общие положения</h2>
          <p>
            Настоящая Политика определяет порядок обработки и защиты персональных данных
            пользователей сервиса MenuRest (далее — «Сервис»). Используя Сервис, вы соглашаетесь
            с условиями данной Политики.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">2. Какие данные мы собираем</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Имя и адрес электронной почты при регистрации</li>
            <li>Данные профиля из социальных сетей (VK, Telegram) при OAuth-авторизации</li>
            <li>История бронирований и отзывов</li>
            <li>Техническая информация (IP-адрес, тип браузера, cookies)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">3. Цели обработки</h2>
          <p>
            Мы используем данные для предоставления услуг Сервиса, персонализации рекомендаций,
            начисления бонусов программы лояльности и улучшения качества обслуживания.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">4. Защита данных</h2>
          <p>
            Мы применяем организационные и технические меры для защиты персональных данных
            от несанкционированного доступа, изменения, раскрытия или уничтожения.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[20px] font-bold text-[var(--text)] mb-2">5. Права пользователя</h2>
          <p>
            Вы имеете право запросить доступ к своим данным, их исправление или удаление,
            обратившись по адресу <a href="mailto:support@menu-rest.ru" className="text-[var(--accent)]">support@menu-rest.ru</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
