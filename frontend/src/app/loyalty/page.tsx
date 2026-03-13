'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { loyaltyApi } from '@/lib/api';

interface LeaderboardEntry {
  id: number;
  name: string;
  loyaltyPoints: number;
  loyaltyLevel: string;
}

const LEVELS = [
  { key: 'bronze', label: 'Бронза', icon: '🥉', color: '#cd7f32', min: 0, perks: ['Накопление баллов за отзывы', 'Базовые рекомендации'] },
  { key: 'silver', label: 'Серебро', icon: '🥈', color: '#c0c0c0', min: 500, perks: ['Бонус x1.5 за отзывы', 'Приоритетное бронирование', 'Ранний доступ к акциям'] },
  { key: 'gold', label: 'Золото', icon: '🥇', color: '#ffd700', min: 2000, perks: ['Бонус x2 за отзывы', 'Бесплатная отмена бронирования', 'Персональный менеджер', 'Эксклюзивные предложения'] },
];

const EARN_WAYS = [
  { icon: '💬', title: 'Оставляйте отзывы', desc: '+50 баллов за каждый одобренный отзыв', points: 50 },
  { icon: '📅', title: 'Бронируйте столики', desc: '+30 баллов за завершённое бронирование', points: 30 },
  { icon: '⭐', title: 'Первый отзыв ресторану', desc: '+100 баллов за самый первый отзыв', points: 100 },
  { icon: '📸', title: 'Загружайте фото', desc: '+20 баллов за фото к отзыву', points: 20 },
];

export default function LoyaltyPage() {
  const { user, isLoggedIn } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    loyaltyApi.getLeaderboard(10)
      .then(r => setLeaderboard(r.data?.items || r.data || []))
      .catch(() => {});
  }, []);

  const currentLevel = LEVELS.find(l => l.key === user?.loyaltyLevel) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const progress = nextLevel && user
    ? Math.min(((user.loyaltyPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100, 100)
    : 100;

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      <h1 className="font-serif text-[36px] font-bold text-[var(--text)] mb-3">Программа лояльности</h1>
      <p className="text-[15px] text-[var(--text3)] mb-10 max-w-[600px]">
        Получайте баллы за активность, повышайте уровень и открывайте эксклюзивные привилегии
      </p>

      {/* User status */}
      {isLoggedIn && user && (
        <div className="rounded-[20px] border p-8 mb-10" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[32px]"
              style={{ background: `${currentLevel.color}22`, border: `2px solid ${currentLevel.color}44` }}>
              {currentLevel.icon}
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-[var(--text3)] mb-1">Ваш уровень</div>
              <div className="text-[24px] font-bold" style={{ color: currentLevel.color }}>{currentLevel.label}</div>
            </div>
            <div className="text-right">
              <div className="text-[32px] font-bold text-[var(--text)] font-mono">{user.loyaltyPoints}</div>
              <div className="text-[12px] text-[var(--text3)]">баллов</div>
            </div>
          </div>

          {nextLevel && (
            <>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg3)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: nextLevel.color }} />
              </div>
              <div className="text-[12px] text-[var(--text3)]">
                До уровня {nextLevel.icon} {nextLevel.label}: ещё <span className="font-semibold text-[var(--text2)]">{nextLevel.min - user.loyaltyPoints}</span> баллов
              </div>
            </>
          )}
        </div>
      )}

      {/* Levels */}
      <h2 className="text-[20px] font-semibold text-[var(--text)] mb-5">Уровни</h2>
      <div className="grid grid-cols-3 gap-4 mb-12 max-sm:grid-cols-1">
        {LEVELS.map(level => (
          <div key={level.key} className="rounded-[18px] border p-6"
            style={{
              background: user?.loyaltyLevel === level.key ? `${level.color}0a` : 'var(--bg2)',
              borderColor: user?.loyaltyLevel === level.key ? `${level.color}44` : 'var(--card-border)',
            }}>
            <div className="text-[36px] mb-3">{level.icon}</div>
            <h3 className="text-[18px] font-bold mb-1" style={{ color: level.color }}>{level.label}</h3>
            <div className="text-[12px] text-[var(--text3)] mb-4">от {level.min} баллов</div>
            <ul className="space-y-2">
              {level.perks.map(perk => (
                <li key={perk} className="text-[13px] text-[var(--text2)] flex items-start gap-2">
                  <span className="text-[var(--accent)] mt-0.5">•</span> {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* How to earn */}
      <h2 className="text-[20px] font-semibold text-[var(--text)] mb-5">Как заработать баллы</h2>
      <div className="grid grid-cols-2 gap-4 mb-12 max-sm:grid-cols-1">
        {EARN_WAYS.map(way => (
          <div key={way.title} className="rounded-[16px] border p-5 flex items-start gap-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            <span className="text-[28px]">{way.icon}</span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[var(--text)] mb-1">{way.title}</div>
              <div className="text-[12px] text-[var(--text3)]">{way.desc}</div>
            </div>
            <span className="text-[14px] font-bold text-[var(--accent)] whitespace-nowrap">+{way.points}</span>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <h2 className="text-[20px] font-semibold text-[var(--text)] mb-5">Лидеры</h2>
      <div className="rounded-[20px] border overflow-hidden" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-[var(--text3)] text-[14px]">
            Пока нет участников
          </div>
        ) : leaderboard.map((entry, i) => {
          const lvl = LEVELS.find(l => l.key === entry.loyaltyLevel) || LEVELS[0];
          return (
            <div key={entry.id} className="flex items-center gap-4 px-6 py-4 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="w-8 text-center text-[16px] font-bold" style={{
                color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text3)',
              }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}`}
              </span>
              <div className="flex-1">
                <span className="text-[14px] font-medium text-[var(--text)]">
                  {entry.name || 'Гурман'}
                </span>
                <span className="ml-2 text-[11px]" style={{ color: lvl.color }}>{lvl.icon} {lvl.label}</span>
              </div>
              <span className="text-[14px] font-bold text-[var(--text)] font-mono">
                {entry.loyaltyPoints.toLocaleString('ru-RU')}
              </span>
            </div>
          );
        })}
      </div>

      {!isLoggedIn && (
        <div className="text-center mt-10">
          <a href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold text-white no-underline transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            Войти и начать копить баллы
          </a>
        </div>
      )}
    </div>
  );
}
