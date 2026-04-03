import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BudgetCalcPanel } from '@/components/budget/BudgetCalcPanel';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { ToastProvider } from '@/components/ui/Toast';
import '../styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://new.menu-rest.com'),
  alternates: { canonical: '/' },
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
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Menu-Rest — Найди идеальный ресторан' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/og-cover.png'],
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400&family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <ToastProvider>
              <Header />
              <main className="pt-[72px] max-sm:pt-[60px]">{children}</main>
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
