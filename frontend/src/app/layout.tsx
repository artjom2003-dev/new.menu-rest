import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BudgetCalcPanel } from '@/components/budget/BudgetCalcPanel';
import { ToastProvider } from '@/components/ui/Toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://new.menu-rest.com'),
  title: {
    default: 'Menu-Rest — Найди идеальный ресторан',
    template: '%s | Menu-Rest',
  },
  description:
    'Умный поиск ресторанов по блюдам, аллергенам и бюджету. AI-поиск, КБЖУ, онлайн-бронирование.',
  keywords: ['рестораны', 'меню', 'аллергены', 'бронирование', 'доставка'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Menu-Rest',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ToastProvider>
            <Header />
            <main className="pt-[72px]">{children}</main>
            <BudgetCalcPanel />
            <Footer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
