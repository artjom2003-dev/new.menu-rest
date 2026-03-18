import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Для бизнеса — Menu-Rest',
  description: 'Разместите ресторан на Menu-Rest: карточка заведения, онлайн-бронирование, аналитика, отзывы и AI-продвижение. Бесплатный старт.',
};

export default function ForBusinessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
