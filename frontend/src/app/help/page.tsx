import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Помощь — MenuRest',
  description: 'Ответы на частые вопросы и помощь по работе с MenuRest.',
};

const faq = [
  {
    q: 'Как забронировать столик?',
    a: 'Откройте страницу ресторана, выберите дату, время и количество гостей в форме бронирования, затем нажмите «Забронировать».',
  },
  {
    q: 'Как работает AI-поиск?',
    a: 'Введите запрос на естественном языке, например «романтический ужин с видом на Москву-реку» — наш AI подберёт подходящие рестораны.',
  },
  {
    q: 'Как копить бонусы?',
    a: 'Зарегистрируйтесь, оставляйте отзывы и бронируйте столики — бонусы начисляются автоматически.',
  },
  {
    q: 'Можно ли отменить бронирование?',
    a: 'Да, вы можете отменить бронирование в разделе «Профиль» → «Бронирования» до начала визита.',
  },
  {
    q: 'Как оставить отзыв?',
    a: 'Перейдите на страницу ресторана и прокрутите до раздела «Отзывы». Нужно быть авторизованным.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Напишите нам на email support@menu-rest.ru или через форму на странице «Контакты».',
  },
];

export default function HelpPage() {
  return (
    <main className="max-w-[800px] mx-auto px-5 py-16">
      <h1 className="font-serif text-[36px] font-black text-[var(--text)] mb-2">Помощь</h1>
      <p className="text-[15px] text-[var(--text3)] mb-10">Ответы на частые вопросы</p>

      <div className="space-y-6">
        {faq.map((item, i) => (
          <div key={i} className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[16px] font-bold text-[var(--text)] mb-2">{item.q}</h3>
            <p className="text-[14px] text-[var(--text2)] leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
