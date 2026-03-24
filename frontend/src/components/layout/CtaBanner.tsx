'use client';

import { useTranslations } from 'next-intl';

export function CtaBanner() {
  const t = useTranslations('cta');

  return (
    <div className="max-w-[1400px] mx-auto px-10 mb-14">
      <div className="rounded-[24px] px-12 py-14 flex items-center justify-between gap-9 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #D44A20)',
          boxShadow: '0 24px 80px var(--accent-glow)',
        }}>
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 360, height: 360,
            background: 'rgba(255,255,255,0.06)' }} />
        <div className="relative z-10">
          <h2 className="font-serif text-[36px] font-black text-white leading-[1.1]"
            dangerouslySetInnerHTML={{ __html: t('title').replace('\n', '<br/>') }} />
          <p className="text-[15px] text-white/75 mt-3 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t('desc').replace('\n', '<br/>') }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <button
            className="px-10 py-4 text-[15px] font-bold rounded-full transition-all duration-300"
            style={{ background: 'white', color: 'var(--accent)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px var(--lime-glow)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}>
            {t('button')}
          </button>
          <span className="text-[12px] text-white/60 font-medium tracking-wide">
            {t('free')}
          </span>
        </div>
      </div>
    </div>
  );
}
