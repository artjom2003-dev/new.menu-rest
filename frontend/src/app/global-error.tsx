'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '8px' }}>Ошибка</h1>
          <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '24px' }}>
            {error.message || 'Что-то пошло не так. Попробуйте ещё раз.'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '12px 24px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#7c5cfc', border: 'none', cursor: 'pointer' }}>
            Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
