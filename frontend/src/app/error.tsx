'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
      <h1 className="font-serif text-[48px] font-black text-[var(--text)] mb-2">Ошибка</h1>
      <p className="text-[14px] text-[var(--text3)] mb-6">
        {error.message || 'Что-то пошло не так. Попробуйте ещё раз.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer transition-all"
        style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
        Попробовать снова
      </button>
    </main>
  );
}
