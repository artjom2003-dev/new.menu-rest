'use client';

import { AISearchBar } from '@/components/search/AISearchBar';

export function HeroSection() {
  return (
    <section className="flex items-center px-10 py-16 relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute rounded-full pointer-events-none animate-orb-float"
        style={{
          width: 600, height: 600,
          background: 'rgba(255,92,40,0.08)',
          filter: 'blur(80px)',
          top: -200, left: -100,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none animate-orb-float"
        style={{
          width: 500, height: 500,
          background: 'rgba(57,255,209,0.05)',
          filter: 'blur(80px)',
          bottom: -150, right: -50,
          animationDelay: '-4s',
        }}
      />

      <div className="max-w-[1400px] mx-auto w-full relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border animate-fade-up"
          style={{ background: 'var(--glass)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(10px)' }}>
          <span className="w-2 h-2 rounded-full bg-[var(--lime)] animate-pulse-dot" />
          <span className="text-xs font-medium text-[var(--text2)]">Умный поиск по блюдам</span>
        </div>

        {/* Title */}
        <div className="font-serif font-black leading-[0.92] tracking-[-0.04em] text-[var(--text)] mb-7 animate-fade-up"
          style={{ animationDelay: '0.1s' }}>
          <span className="block w-full text-justify"
            style={{ fontSize: 'clamp(52px,7.5vw,105px)' }}>
            Найди свое
          </span>
          <span
            className="block w-full text-justify animate-shimmer"
            style={{
              fontSize: 'clamp(52px,7.5vw,105px)',
              background: 'linear-gradient(135deg,var(--accent),var(--accent2),var(--lime))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
            }}>
            идеальное место
          </span>
          <span className="block w-full text-justify text-[var(--text3)]"
            style={{ fontSize: 'clamp(40px,5.5vw,80px)' }}>
            за минуту
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[17px] text-[var(--text2)] leading-[1.75] mb-9 animate-fade-up"
          style={{ animationDelay: '0.2s' }}>
          Ищи по блюдам, фильтруй аллергены, считай КБЖУ и&nbsp;бюджет — всё в&nbsp;одном сервисе.
        </p>

        {/* Search */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <AISearchBar />
        </div>

      </div>
    </section>
  );
}
