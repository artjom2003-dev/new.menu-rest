'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { loyaltyApi } from '@/lib/api';

/* ───────── Types ───────── */
interface LeaderboardEntry {
  id: number;
  name: string;
  avatarUrl?: string;
  loyaltyPoints: number;
  loyaltyLevel: string;
  weeklyPoints?: number;
}

/* ───────── Constants ───────── */
const LEVELS_BASE = [
  { key: 'bronze' as const, labelKey: 'levelBronze' as const, min: 0, multiplier: 'x1', gradient: 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)', color: '#cd7f32', glow: 'rgba(205,127,50,0.3)', perkKey: 'perkBasic' as const },
  { key: 'silver' as const, labelKey: 'levelSilver' as const, min: 500, multiplier: 'x1.5', gradient: 'linear-gradient(135deg, #7a7a86 0%, #52525c 100%)', color: '#c0c0c0', glow: 'rgba(192,192,192,0.3)', perkKey: 'perkSilver' as const },
  { key: 'gold' as const, labelKey: 'levelGold' as const, min: 2000, multiplier: 'x2', gradient: 'linear-gradient(135deg, #c9981a 0%, #8a6914 100%)', color: '#ffd700', glow: 'rgba(255,215,0,0.35)', perkKey: 'perkGold' as const },
];

const EARN_WAYS_BASE = [
  { icon: '\u2B50', titleKey: 'earnFirstReview' as const, descKey: 'earnFirstReviewDesc' as const, points: 30, color: '#fbbf24' },
  { icon: '\uD83D\uDCDD', titleKey: 'earnReviews' as const, descKey: 'earnReviewsDesc' as const, points: 15, color: '#60a5fa' },
  { icon: '\uD83D\uDCC5', titleKey: 'earnBookings' as const, descKey: 'earnBookingsDesc' as const, points: 20, color: '#34d399' },
  { icon: '\uD83D\uDC65', titleKey: 'earnReferrals' as const, descKey: 'earnReferralsDesc' as const, points: 50, color: '#f472b6' },
  { icon: '\uD83D\uDED2', titleKey: 'earnOrders' as const, descKey: 'earnOrdersDesc' as const, points: 10, color: '#a78bfa' },
  { icon: '\uD83D\uDCF8', titleKey: 'earnPhotos' as const, descKey: 'earnPhotosDesc' as const, points: 5, color: '#fb923c' },
];

/* ───────── Animated Counter Hook ───────── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) return;
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + diff * eased);
      setValue(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

/* ───────── Progress Ring ───────── */
function ProgressRing({ progress, size = 120, stroke = 8, color }: { progress: number; size?: number; stroke?: number; color: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
    </svg>
  );
}

/* ───────── Countdown Hook ───────── */
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const now = Date.now();
      const diff = Math.max(targetDate.getTime() - now, 0);
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

/* ───────── Weekly Giveaway ───────── */
function WeeklyGiveaway({ userPoints, t }: { userPoints?: number; t: any }) {
  // Target: 30 days from now (static per mount)
  const [target] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(20, 0, 0, 0);
    return d;
  });
  const { days, hours, minutes, seconds } = useCountdown(target);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Tickets: 1 per 100 points, minimum 1 if has any points
  const tickets = !userPoints ? 0 : Math.max(1, Math.floor(userPoints / 100));

  return (
    <div className="loyalty-section" style={{ paddingTop: 0 }}>
      <div className="giveaway-card">
        {/* Decorative background */}
        <div className="giveaway-bg" />

        <div className="giveaway-inner">
          {/* Left: Info */}
          <div className="giveaway-info">
            <div className="giveaway-badge">{t('giveawayBadge')}</div>
            <h3 className="giveaway-title">{t('giveawayTitle')} <span className="giveaway-amount">{t('giveawayAmount')}</span></h3>
            <p className="giveaway-desc">
              {t('giveawayDesc')}
            </p>
            <div className="giveaway-how">
              <div className="giveaway-how-title">{t('giveawayHow')}</div>
              <div className="giveaway-how-row">
                <span className="giveaway-how-icon">🎟️</span>
                <span>{t('giveawayTicketRule')}</span>
              </div>
              <div className="giveaway-how-row">
                <span className="giveaway-how-icon">📈</span>
                <span>{t('giveawayKeepRule')}</span>
              </div>
              <div className="giveaway-how-row">
                <span className="giveaway-how-icon">♾️</span>
                <span>{t('giveawayNoCap')}</span>
              </div>
            </div>
            {userPoints !== undefined && tickets > 0 && (
              <div className="giveaway-your-tickets">
                <span className="giveaway-ticket-icon">🎟️</span>
                <span>{t('giveawayYourTickets', { count: tickets, tickets: tickets === 1 ? t('ticket1') : tickets < 5 ? t('ticket2') : t('ticket5') })}</span>
                <span className="giveaway-ticket-hint">{t('giveawayTicketHint')}</span>
              </div>
            )}
            {userPoints !== undefined && tickets === 0 && (
              <div className="giveaway-your-tickets" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <span>{t('giveawayEarnMore')}</span>
              </div>
            )}
          </div>

          {/* Right: Timer */}
          <div className="giveaway-timer-wrap">
            <div className="giveaway-timer-label">{t('giveawayTimer')}</div>
            <div className="giveaway-timer">
              <div className="giveaway-timer-unit">
                <div className="giveaway-timer-num">{pad(days)}</div>
                <div className="giveaway-timer-sub">{t('timerDays')}</div>
              </div>
              <div className="giveaway-timer-sep">:</div>
              <div className="giveaway-timer-unit">
                <div className="giveaway-timer-num">{pad(hours)}</div>
                <div className="giveaway-timer-sub">{t('timerHours')}</div>
              </div>
              <div className="giveaway-timer-sep">:</div>
              <div className="giveaway-timer-unit">
                <div className="giveaway-timer-num">{pad(minutes)}</div>
                <div className="giveaway-timer-sub">{t('timerMinutes')}</div>
              </div>
              <div className="giveaway-timer-sep">:</div>
              <div className="giveaway-timer-unit">
                <div className="giveaway-timer-num giveaway-timer-sec">{pad(seconds)}</div>
                <div className="giveaway-timer-sub">{t('timerSeconds')}</div>
              </div>
            </div>
            <div className="giveaway-prize-icon">🎁</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Main Page ───────── */
export default function LoyaltyPage() {
  const router = useRouter();
  const t = useTranslations('loyalty');
  const { user, isLoggedIn } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly');
  const [communityPoints, setCommunityPoints] = useState(0);
  const [communityMembers, setCommunityMembers] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const animatedPoints = useAnimatedCounter(communityPoints, 2500);
  const animatedMembers = useAnimatedCounter(communityMembers, 2000);

  useEffect(() => {
    Promise.all([
      loyaltyApi.getLeaderboard(15).then(r => setLeaderboard(r.data?.items || r.data || [])).catch(() => {}),
      loyaltyApi.getWeeklyLeaderboard(15).then(r => setWeeklyLeaderboard(r.data?.items || r.data || [])).catch(() => {}),
      loyaltyApi.getCommunityStats().then(r => {
        setCommunityPoints(r.data?.totalPoints || 0);
        setCommunityMembers(r.data?.totalMembers || 0);
      }).catch(() => {}),
    ]).finally(() => setLoaded(true));
  }, []);

  const currentLevel = LEVELS_BASE.find(l => l.key === user?.loyaltyLevel) || LEVELS_BASE[0];
  const nextLevel = LEVELS_BASE[LEVELS_BASE.indexOf(currentLevel) + 1];
  const progress = nextLevel && user
    ? Math.min(((user.loyaltyPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100, 100)
    : 100;

  const activeLeaderboard = activeTab === 'weekly' ? weeklyLeaderboard : leaderboard;

  return (
    <>
      <style>{`
        /* ── Hero ── */
        .loyalty-hero {
          position: relative; overflow: hidden; padding: 80px 20px 60px;
          background: linear-gradient(135deg, #1a0a00 0%, #2d1810 25%, #1a0a05 50%, #0d0d1a 100%);
        }
        .loyalty-hero::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at 20% 50%, rgba(255,180,50,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 500px 500px at 80% 30%, rgba(180,50,50,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 300px 300px at 50% 80%, rgba(255,215,0,0.08) 0%, transparent 70%);
          animation: heroShimmer 8s ease-in-out infinite alternate;
        }
        @keyframes heroShimmer {
          0% { opacity: 0.7; } 100% { opacity: 1; }
        }
        .loyalty-hero-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; }
        .loyalty-hero-title {
          font-family: var(--font-serif, Georgia, serif); font-size: 44px; font-weight: 700;
          color: #fff; line-height: 1.15; margin-bottom: 12px;
          background: linear-gradient(135deg, #ffd700, #ffaa33, #ff6b35);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .loyalty-hero-sub { color: rgba(255,255,255,0.6); font-size: 16px; max-width: 500px; line-height: 1.5; }
        .loyalty-hero-stats {
          display: flex; gap: 40px; margin-top: 36px; flex-wrap: wrap;
        }
        .loyalty-hero-stat {
          text-align: center;
        }
        .loyalty-hero-stat-val {
          font-size: 36px; font-weight: 800; font-variant-numeric: tabular-nums;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .loyalty-hero-stat-label { color: rgba(255,255,255,0.45); font-size: 12px; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }

        /* ── User Status Card ── */
        .loyalty-user-card {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          background: rgba(255,255,255,0.06); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;
          padding: 28px; width: 280px; text-align: center;
        }
        .loyalty-user-ring { position: relative; display: inline-block; margin-bottom: 12px; }
        .loyalty-user-ring-text {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .loyalty-user-points { font-size: 28px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; line-height: 1; }
        .loyalty-user-label { font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
        .loyalty-user-level {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 8px;
        }
        .loyalty-user-next { font-size: 12px; color: rgba(255,255,255,0.4); }
        .loyalty-user-next strong { color: rgba(255,255,255,0.7); }

        /* ── Sections ── */
        .loyalty-section {
          max-width: 1100px; margin: 0 auto; padding: 60px 20px;
        }
        .loyalty-section-title {
          font-family: var(--font-serif, Georgia, serif); font-size: 28px; font-weight: 700;
          color: var(--text); margin-bottom: 8px;
        }
        .loyalty-section-sub { color: var(--text3); font-size: 14px; margin-bottom: 32px; }

        /* ── Earn Cards ── */
        .earn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .earn-card {
          border-radius: 20px; padding: 28px 24px; border: 1px solid var(--card-border);
          background: var(--bg2); cursor: default; transition: all 0.3s ease;
          position: relative; overflow: hidden;
        }
        .earn-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .earn-card-icon {
          width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 16px;
        }
        .earn-card-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .earn-card-desc { font-size: 12px; color: var(--text3); line-height: 1.5; margin-bottom: 12px; }
        .earn-card-points {
          display: inline-flex; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700;
        }

        /* ── Tier Cards ── */
        .tier-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .tier-card {
          border-radius: 18px; padding: 22px 20px; position: relative; overflow: hidden;
          transition: all 0.4s ease; cursor: default;
        }
        .tier-card:hover { transform: translateY(-4px); }
        .tier-card-active { box-shadow: 0 0 0 2px rgba(255,255,255,0.3), 0 16px 48px rgba(0,0,0,0.25); }
        .tier-card-bg { position: absolute; inset: 0; opacity: 0.12; }
        .tier-card-content { position: relative; z-index: 1; }
        .tier-card-multiplier {
          position: absolute; top: 14px; right: 14px; padding: 3px 10px; border-radius: 10px;
          font-size: 12px; font-weight: 800; background: rgba(255,255,255,0.15); color: #fff;
          backdrop-filter: blur(8px);
        }
        .tier-card-label { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 2px; }
        .tier-card-threshold { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 10px; }
        .tier-card-perk {
          font-size: 12px; color: rgba(255,255,255,0.85); padding: 3px 0;
          display: flex; align-items: center; gap: 6px;
        }
        .tier-card-perk::before {
          content: ''; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.5);
          flex-shrink: 0;
        }

        /* ── Giveaway ── */
        .giveaway-card {
          position: relative; border-radius: 24px; overflow: hidden;
          border: 1px solid rgba(255,215,0,0.15);
          background: linear-gradient(135deg, #1a1200 0%, #1a0f05 50%, #0d0d1a 100%);
        }
        .giveaway-bg {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 500px 400px at 80% 20%, rgba(255,215,0,0.08), transparent),
            radial-gradient(ellipse 400px 300px at 20% 80%, rgba(255,92,40,0.06), transparent);
          animation: heroShimmer 6s ease-in-out infinite alternate;
        }
        .giveaway-inner {
          position: relative; z-index: 1; display: flex; gap: 40px; padding: 40px;
          align-items: center; flex-wrap: wrap;
        }
        .giveaway-info { flex: 1 1 340px; }
        .giveaway-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
          background: rgba(255,215,0,0.12); color: #ffd700;
          border: 1px solid rgba(255,215,0,0.2); margin-bottom: 16px;
        }
        .giveaway-title {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 26px; font-weight: 700; color: #fff; line-height: 1.2; margin: 0 0 12px;
        }
        .giveaway-amount {
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .giveaway-desc {
          font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; margin: 0 0 20px;
        }
        .giveaway-how { margin-bottom: 20px; }
        .giveaway-how-title {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35);
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;
        }
        .giveaway-how-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.65); padding: 5px 0;
        }
        .giveaway-how-row strong { color: #ffd700; }
        .giveaway-how-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
        .giveaway-your-tickets {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 18px; border-radius: 14px;
          font-size: 13px; color: #ffd700; background: rgba(255,215,0,0.08);
          border: 1px solid rgba(255,215,0,0.18);
        }
        .giveaway-your-tickets strong { color: #fff; font-size: 16px; margin: 0 2px; }
        .giveaway-ticket-icon { font-size: 18px; }
        .giveaway-ticket-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin-left: 4px; }

        .giveaway-timer-wrap {
          flex-shrink: 0; text-align: center; position: relative;
        }
        .giveaway-timer-label {
          font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase;
          letter-spacing: 2px; margin-bottom: 16px; font-weight: 600;
        }
        .giveaway-timer {
          display: flex; align-items: flex-start; gap: 6px;
        }
        .giveaway-timer-unit { text-align: center; }
        .giveaway-timer-num {
          width: 64px; height: 72px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 800; color: #fff;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          font-variant-numeric: tabular-nums; backdrop-filter: blur(8px);
        }
        .giveaway-timer-sec {
          color: #ffd700;
          animation: timerPulse 1s ease-in-out infinite;
        }
        @keyframes timerPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .giveaway-timer-sub {
          font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 6px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .giveaway-timer-sep {
          font-size: 28px; font-weight: 700; color: rgba(255,255,255,0.2);
          padding-top: 16px;
        }
        .giveaway-prize-icon {
          font-size: 48px; margin-top: 20px;
          animation: giftBounce 2s ease-in-out infinite;
        }
        @keyframes giftBounce {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
        @media (max-width: 768px) {
          .giveaway-inner { flex-direction: column; padding: 20px 16px; gap: 20px; }
          .giveaway-title { font-size: 20px; }
          .giveaway-desc { font-size: 12px; margin-bottom: 14px; }
          .giveaway-badge { font-size: 10px; padding: 4px 12px; margin-bottom: 12px; }
          .giveaway-how { margin-bottom: 14px; }
          .giveaway-how-row { font-size: 12px; padding: 3px 0; }
          .giveaway-timer-num { width: 44px; height: 52px; font-size: 22px; border-radius: 10px; }
          .giveaway-timer-sep { font-size: 22px; padding-top: 10px; }
          .giveaway-timer-sub { font-size: 9px; }
          .giveaway-prize-icon { font-size: 36px; margin-top: 14px; }
        }

        /* ── Spend Section ── */
        .spend-card {
          border-radius: 24px; border: 1px solid var(--card-border); background: var(--bg2);
          padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center;
        }
        .spend-exchange {
          text-align: center;
        }
        .spend-exchange-big {
          font-size: 56px; font-weight: 800; margin-bottom: 8px;
          background: linear-gradient(135deg, var(--accent), #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .spend-exchange-label { font-size: 14px; color: var(--text3); }
        .spend-rules { display: flex; flex-direction: column; gap: 16px; }
        .spend-rule {
          display: flex; align-items: center; gap: 14px; padding: 14px 18px;
          border-radius: 16px; background: var(--bg3);
        }
        .spend-rule-icon { font-size: 20px; flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
        .spend-rule-text { flex: 1; }
        .spend-rule-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .spend-rule-desc { font-size: 12px; color: var(--text3); margin-top: 2px; }

        /* ── Leaderboard ── */
        .lb-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg3); border-radius: 14px; padding: 4px; width: fit-content; }
        .lb-tab {
          padding: 10px 24px; border-radius: 10px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; background: transparent; color: var(--text3); transition: all 0.2s;
        }
        .lb-tab-active { background: var(--bg2); color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .lb-list { border-radius: 24px; border: 1px solid var(--card-border); background: var(--bg2); overflow: hidden; }
        .lb-row {
          display: flex; align-items: center; gap: 14px; padding: 14px 20px;
          border-bottom: 1px solid var(--card-border); cursor: pointer; transition: background 0.2s;
          animation: lbSlideIn 0.4s ease-out backwards;
        }
        .lb-row:hover { background: var(--bg3); }
        .lb-row:last-child { border-bottom: none; }
        .lb-rank {
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; flex-shrink: 0;
        }
        .lb-rank-1 { background: linear-gradient(135deg, #ffd700, #ffaa00); color: #1a1a00; font-size: 18px; }
        .lb-rank-2 { background: linear-gradient(135deg, #e0e0e0, #b0b0b0); color: #333; font-size: 16px; }
        .lb-rank-3 { background: linear-gradient(135deg, #cd7f32, #a0522d); color: #fff; font-size: 16px; }
        .lb-avatar {
          width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .lb-name { flex: 1; }
        .lb-name-text { font-size: 14px; font-weight: 500; color: var(--text); }
        .lb-name-level {
          display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;
          font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 600;
        }
        .lb-points { font-size: 15px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
        .lb-points-label { font-size: 10px; color: var(--text3); font-weight: 400; margin-left: 4px; }

        @keyframes lbSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ── CTA ── */
        .loyalty-cta {
          text-align: center; padding: 60px 20px 80px; max-width: 1100px; margin: 0 auto;
        }
        .loyalty-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 40px; border-radius: 16px; font-size: 16px; font-weight: 600;
          color: #fff; border: none; cursor: pointer; text-decoration: none;
          background: linear-gradient(135deg, var(--accent), #ff8c00);
          box-shadow: 0 8px 32px rgba(255,107,53,0.3);
          transition: all 0.3s ease;
        }
        .loyalty-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(255,107,53,0.4); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .loyalty-hero { padding: 36px 16px 28px; }
          .loyalty-hero-title { font-size: 24px; }
          .loyalty-hero-sub { font-size: 14px; }
          .loyalty-hero-stats { gap: 20px; margin-top: 20px; }
          .loyalty-hero-stat-val { font-size: 26px; }
          .loyalty-user-card { position: static; transform: none; width: 100%; margin-top: 20px; padding: 20px; }
          .loyalty-user-points { font-size: 22px; }
          .loyalty-section { padding: 32px 16px; }
          .loyalty-section-title { font-size: 22px; margin-bottom: 4px; }
          .loyalty-section-sub { font-size: 13px; margin-bottom: 20px; }
          .earn-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .earn-card { padding: 16px 14px; border-radius: 16px; }
          .earn-card-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 18px; margin-bottom: 10px; }
          .earn-card-title { font-size: 13px; }
          .earn-card-desc { font-size: 11px; margin-bottom: 8px; }
          .earn-card-points { font-size: 12px; padding: 3px 10px; }
          .tier-grid { grid-template-columns: 1fr; gap: 12px; }
          .tier-card { padding: 16px; border-radius: 14px; }
          .tier-card-label { font-size: 16px; }
          .spend-card { grid-template-columns: 1fr; padding: 24px 20px; gap: 20px; }
          .spend-exchange-big { font-size: 40px; }
          .spend-rule { padding: 10px 14px; }
          .lb-row { padding: 10px 14px; gap: 10px; }
          .lb-rank { width: 30px; height: 30px; font-size: 12px; border-radius: 8px; }
          .lb-avatar { width: 34px; height: 34px; border-radius: 10px; font-size: 12px; }
          .lb-name-text { font-size: 13px; }
          .lb-points { font-size: 13px; }
          .loyalty-cta { padding: 32px 16px 48px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .earn-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* ════════════ HERO ════════════ */}
      <div className="loyalty-hero">
        <div className="loyalty-hero-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h1 className="loyalty-hero-title">{t('heroTitle')}</h1>
            <p className="loyalty-hero-sub">
              {t('heroSub')}
            </p>
            <div className="loyalty-hero-stats">
              <div className="loyalty-hero-stat">
                <div className="loyalty-hero-stat-val">{animatedPoints.toLocaleString('ru-RU')}</div>
                <div className="loyalty-hero-stat-label">{t('communityPoints')}</div>
              </div>
              <div className="loyalty-hero-stat">
                <div className="loyalty-hero-stat-val">{animatedMembers.toLocaleString('ru-RU')}</div>
                <div className="loyalty-hero-stat-label">{t('members')}</div>
              </div>
            </div>
          </div>

          {isLoggedIn && user && (
            <div className="loyalty-user-card">
              <div className="loyalty-user-ring">
                <ProgressRing progress={progress} size={120} stroke={8} color={currentLevel.color} />
                <div className="loyalty-user-ring-text">
                  <div className="loyalty-user-points">{user.loyaltyPoints}</div>
                  <div className="loyalty-user-label">{t('points')}</div>
                </div>
              </div>
              <div>
                <div className="loyalty-user-level" style={{ background: `${currentLevel.color}22`, color: currentLevel.color }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentLevel.color, display: 'inline-block' }} />
                  {t(currentLevel.labelKey)}
                </div>
              </div>
              {nextLevel && (
                <div className="loyalty-user-next">
                  {t('levelBronze') && `${t(nextLevel.labelKey)}: `}<strong>{nextLevel.min - user.loyaltyPoints}</strong> {t('points')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ HOW TO EARN ════════════ */}
      <div className="loyalty-section">
        <div className="loyalty-section-title">{t('earnTitle')}</div>
        <div className="loyalty-section-sub">{t('earnSub')}</div>
        <div className="earn-grid">
          {EARN_WAYS_BASE.map((way) => (
            <div key={way.titleKey} className="earn-card">
              <div className="earn-card-icon" style={{ background: `${way.color}18` }}>
                {way.icon}
              </div>
              <div className="earn-card-title">{t(way.titleKey)}</div>
              <div className="earn-card-desc">{t(way.descKey)}</div>
              <div className="earn-card-points" style={{ background: `${way.color}15`, color: way.color }}>
                +{way.points} {t('pointsSuffix')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ TIER SHOWCASE ════════════ */}
      <div className="loyalty-section" style={{ paddingTop: 0 }}>
        <div className="loyalty-section-title">{t('tiersTitle')}</div>
        <div className="loyalty-section-sub">{t('tiersSub')}</div>
        <div className="tier-grid">
          {LEVELS_BASE.map((level) => {
            const isActive = user?.loyaltyLevel === level.key;
            return (
              <div key={level.key}
                className={`tier-card ${isActive ? 'tier-card-active' : ''}`}
                style={{
                  background: level.gradient,
                  boxShadow: isActive ? `0 0 40px ${level.glow}, 0 20px 60px rgba(0,0,0,0.2)` : '0 8px 32px rgba(0,0,0,0.15)',
                }}>
                <div className="tier-card-content">
                  <div className="tier-card-multiplier">{level.multiplier}</div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{level.key === 'gold' ? '\uD83C\uDFC6' : level.key === 'silver' ? '\uD83E\uDD48' : '\uD83E\uDD49'}</div>
                  <div className="tier-card-label">{t(level.labelKey)}</div>
                  <div className="tier-card-threshold">{t('tierFrom', { min: level.min.toLocaleString('ru-RU') })}</div>
                  <div className="tier-card-perk">{t(level.perkKey)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════ WEEKLY GIVEAWAY ════════════ */}
      <WeeklyGiveaway userPoints={user?.loyaltyPoints} t={t} />

      {/* ════════════ HOW TO SPEND ════════════ */}
      <div className="loyalty-section" style={{ paddingTop: 0 }}>
        <div className="loyalty-section-title">{t('spendTitle')}</div>
        <div className="loyalty-section-sub">{t('spendSub')}</div>
        <div className="spend-card">
          <div className="spend-exchange">
            <div className="spend-exchange-big">1 = 1\u20BD</div>
            <div className="spend-exchange-label">{t('spendExchange')}</div>
          </div>
          <div className="spend-rules">
            <div className="spend-rule">
              <div className="spend-rule-icon">{'\uD83D\uDCB3'}</div>
              <div className="spend-rule-text">
                <div className="spend-rule-title">{t('spendMinTitle')}</div>
                <div className="spend-rule-desc">{t('spendMinDesc')}</div>
              </div>
            </div>
            <div className="spend-rule">
              <div className="spend-rule-icon">{'\uD83D\uDCC9'}</div>
              <div className="spend-rule-text">
                <div className="spend-rule-title">{t('spendMaxTitle')}</div>
                <div className="spend-rule-desc">{t('spendMaxDesc')}</div>
              </div>
            </div>
            <div className="spend-rule">
              <div className="spend-rule-icon">{'\uD83C\uDFEA'}</div>
              <div className="spend-rule-text">
                <div className="spend-rule-title">{t('spendPartnerTitle')}</div>
                <div className="spend-rule-desc">{t('spendPartnerDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ LEADERBOARD ════════════ */}
      <div className="loyalty-section" style={{ paddingTop: 0 }}>
        <div className="loyalty-section-title">{t('leaderboardTitle')}</div>
        <div className="loyalty-section-sub">{t('leaderboardSub')}</div>

        <div className="lb-tabs">
          <button className={`lb-tab ${activeTab === 'weekly' ? 'lb-tab-active' : ''}`} onClick={() => setActiveTab('weekly')}>
            {t('leaderboardWeekly')}
          </button>
          <button className={`lb-tab ${activeTab === 'alltime' ? 'lb-tab-active' : ''}`} onClick={() => setActiveTab('alltime')}>
            {t('leaderboardAllTime')}
          </button>
        </div>

        <div className="lb-list">
          {activeLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)', fontSize: 14 }}>
              {t('leaderboardEmpty')}
            </div>
          ) : activeLeaderboard.map((entry, i) => {
            const lvl = LEVELS_BASE.find(l => l.key === entry.loyaltyLevel) || LEVELS_BASE[0];
            const initials = (entry.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const pts = activeTab === 'weekly' ? (entry.weeklyPoints ?? entry.loyaltyPoints) : entry.loyaltyPoints;
            const rankClass = i === 0 ? 'lb-rank-1' : i === 1 ? 'lb-rank-2' : i === 2 ? 'lb-rank-3' : '';

            return (
              <div key={entry.id} className="lb-row"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => router.push(`/profile/${entry.id}`)}>
                <div className={`lb-rank ${rankClass}`}
                  style={i >= 3 ? { background: 'var(--bg3)', color: 'var(--text3)' } : {}}>
                  {i === 0 ? '\uD83D\uDC51' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : i + 1}
                </div>
                <div className="lb-avatar" style={{ background: lvl.gradient }}>
                  {entry.avatarUrl
                    ? <img src={entry.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
                    : initials
                  }
                </div>
                <div className="lb-name">
                  <span className="lb-name-text">{entry.name || t('leaderboardDefaultName')}</span>
                  <span className="lb-name-level" style={{ background: `${lvl.color}18`, color: lvl.color }}>
                    {t(lvl.labelKey)}
                  </span>
                </div>
                <div className="lb-points">
                  {pts.toLocaleString('ru-RU')}
                  <span className="lb-points-label">{activeTab === 'weekly' ? t('leaderboardWeeklyLabel') : t('leaderboardAllTimeLabel')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════ CTA ════════════ */}
      {!isLoggedIn && (
        <div className="loyalty-cta">
          <p style={{ color: 'var(--text3)', fontSize: 16, marginBottom: 24 }}>
            {t('ctaText')}
          </p>
          <a href="/login" className="loyalty-cta-btn">
            {t('ctaButton')}
          </a>
        </div>
      )}
    </>
  );
}
