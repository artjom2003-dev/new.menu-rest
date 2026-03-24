import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BudgetCalcPanel } from '@/components/budget/BudgetCalcPanel';
import { ChatWidget } from '@/components/chat/ChatWidget';
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
  icons: {
    icon: '/icon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <ToastProvider>
              <Header />
              <main className="pt-[72px]">{children}</main>
              <BudgetCalcPanel />
              <ChatWidget />
              <Footer />
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
