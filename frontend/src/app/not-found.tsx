import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
      <h1 className="font-serif text-[72px] font-black text-[var(--accent)] mb-2">404</h1>
      <p className="text-[18px] text-[var(--text)] mb-2">Страница не найдена</p>
      <p className="text-[14px] text-[var(--text3)] mb-8">
        Возможно, она была удалена или вы перешли по неверной ссылке
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[14px] font-semibold text-white border-none transition-all"
        style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
        На главную
      </Link>
    </main>
  );
}
