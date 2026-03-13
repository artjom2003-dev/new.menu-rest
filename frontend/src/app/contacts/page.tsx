import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты — MenuRest',
  description: 'Свяжитесь с командой MenuRest — email, телефон, социальные сети.',
};

export default function ContactsPage() {
  return (
    <main className="max-w-[800px] mx-auto px-5 py-16">
      <h1 className="font-serif text-[36px] font-black text-[var(--text)] mb-2">Контакты</h1>
      <p className="text-[15px] text-[var(--text3)] mb-10">Мы всегда на связи</p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-2">Email</h3>
          <a href="mailto:support@menu-rest.ru" className="text-[15px] text-[var(--accent)]">
            support@menu-rest.ru
          </a>
        </div>

        <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-2">Телефон</h3>
          <a href="tel:+74951234567" className="text-[15px] text-[var(--accent)]">
            +7 (495) 123-45-67
          </a>
        </div>

        <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-2">Адрес</h3>
          <p className="text-[15px] text-[var(--text2)]">
            Москва, ул. Примерная, д. 1
          </p>
        </div>

        <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-2">Режим работы</h3>
          <p className="text-[15px] text-[var(--text2)]">
            Пн–Пт: 10:00–19:00
          </p>
        </div>
      </div>
    </main>
  );
}
