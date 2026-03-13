'use client';

export function CtaBanner() {
  return (
    <div className="max-w-[1400px] mx-auto px-10 mb-20">
      <div className="rounded-[24px] px-12 py-14 flex items-center justify-between gap-9 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #D44A20)',
          boxShadow: '0 24px 80px rgba(255,92,40,0.2)',
        }}>
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 360, height: 360,
            background: 'rgba(255,255,255,0.06)' }} />
        <div className="relative z-10">
          <h2 className="font-serif text-[36px] font-black text-white leading-[1.1]">
            Ваш ресторан<br />ещё не здесь?
          </h2>
          <p className="text-[15px] text-white/75 mt-2">Создайте меню с КБЖУ бесплатно</p>
        </div>
        <button
          className="relative z-10 px-10 py-4 text-[15px] font-bold rounded-full transition-all duration-300"
          style={{ background: 'var(--lime)', color: 'var(--bg)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px var(--lime-glow)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '';
            (e.currentTarget as HTMLElement).style.transform = '';
          }}>
          Подключить ресторан
        </button>
      </div>
    </div>
  );
}
