'use client';

import { AISearchBar } from '@/components/search/AISearchBar';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="flex items-center px-10 max-md:px-4 max-sm:px-3 pt-16 pb-8 relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute rounded-full pointer-events-none animate-orb-float"
        style={{
          width: 600, height: 600,
          background: 'var(--orb-accent)',
          filter: 'blur(80px)',
          top: -200, left: -100,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none animate-orb-float"
        style={{
          width: 500, height: 500,
          background: 'var(--orb-teal)',
          filter: 'blur(80px)',
          bottom: -150, right: -50,
          animationDelay: '-4s',
        }}
      />

      <div className="max-w-[1400px] mx-auto w-full relative z-10">
        {/* Title */}
        <div className="font-serif font-black leading-[0.92] tracking-[-0.04em] text-[var(--text)] mb-7 animate-fade-up"
          style={{ animationDelay: '0.1s' }}>
          <span className="block w-full text-justify max-sm:text-left"
            style={{ fontSize: 'clamp(32px,7.5vw,105px)' }}>
            {t('line1')}
          </span>
          <span
            className="block w-full text-justify max-sm:text-left animate-shimmer"
            style={{
              fontSize: 'clamp(32px,7.5vw,105px)',
              background: 'linear-gradient(135deg,var(--accent),var(--accent2),var(--gold))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
            }}>
            {t('line2')}
          </span>
          <span className="block w-full text-justify max-sm:text-left hero-line3"
            style={{ fontSize: 'clamp(24px,5.5vw,80px)' }}>
            {t('line3')}
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[17px] max-sm:text-[14px] text-[var(--text2)] leading-[1.75] mb-9 animate-fade-up"
          style={{ animationDelay: '0.2s' }}>
          {t('subtitle')}
        </p>

        {/* Search */}
        <div id="ai-search" className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <AISearchBar />
        </div>

      </div>
    </section>
  );
}
