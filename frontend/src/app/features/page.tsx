'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── SVG shapes per feature ─────────────────────────────── */

function ShapeAI({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="60" cy="40" r="6" fill={color} opacity="0.9" />
      <circle cx="35" cy="55" r="5" fill={color} opacity="0.7" />
      <circle cx="85" cy="55" r="5" fill={color} opacity="0.7" />
      <circle cx="40" cy="80" r="4" fill={color} opacity="0.5" />
      <circle cx="80" cy="80" r="4" fill={color} opacity="0.5" />
      <circle cx="60" cy="70" r="5" fill={color} opacity="0.8" />
      <line x1="60" y1="40" x2="35" y2="55" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="40" x2="85" y2="55" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="35" y1="55" x2="60" y2="70" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="85" y1="55" x2="60" y2="70" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="70" x2="40" y2="80" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="70" x2="80" y2="80" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <path d="M95 25l3 8 3-8 3 8-3 8-3-8z" fill={color} opacity="0.6" />
      <path d="M20 30l2 5 2-5 2 5-2 5-2-5z" fill={color} opacity="0.4" />
    </svg>
  );
}

function ShapeMenu({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <ellipse cx="60" cy="65" rx="38" ry="12" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
      <ellipse cx="60" cy="60" rx="30" ry="25" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <rect x="30" y="20" width="8" height="22" rx="4" fill={color} opacity="0.7" />
      <rect x="44" y="14" width="8" height="28" rx="4" fill={color} opacity="0.5" />
      <rect x="58" y="18" width="8" height="24" rx="4" fill={color} opacity="0.6" />
      <rect x="72" y="22" width="8" height="20" rx="4" fill={color} opacity="0.4" />
      <text x="31" y="34" fill="var(--bg)" fontSize="6" fontWeight="700">K</text>
      <text x="46" y="32" fill="var(--bg)" fontSize="6" fontWeight="700">Б</text>
      <text x="60" y="34" fill="var(--bg)" fontSize="6" fontWeight="700">Ж</text>
      <text x="74" y="36" fill="var(--bg)" fontSize="6" fontWeight="700">У</text>
    </svg>
  );
}

function ShapeAllergen({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <path d="M60 18 L90 35 L90 65 Q90 95 60 108 Q30 95 30 65 L30 35 Z" fill="none" stroke={color} strokeWidth="2.5" opacity="0.5" />
      <path d="M60 28 L82 40 L82 62 Q82 86 60 96 Q38 86 38 62 L38 40 Z" fill={color} opacity="0.1" />
      <path d="M48 62 L56 72 L76 48" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function ShapeBudget({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <ellipse cx="45" cy="80" rx="22" ry="8" fill={color} opacity="0.2" />
      <ellipse cx="45" cy="72" rx="22" ry="8" fill={color} opacity="0.3" />
      <ellipse cx="45" cy="64" rx="22" ry="8" fill={color} opacity="0.4" />
      <rect x="23" y="64" width="44" height="16" fill={color} opacity="0.15" />
      <rect x="65" y="25" width="32" height="42" rx="6" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
      <rect x="70" y="30" width="22" height="10" rx="2" fill={color} opacity="0.3" />
      <circle cx="74" cy="50" r="2.5" fill={color} opacity="0.5" />
      <circle cx="81" cy="50" r="2.5" fill={color} opacity="0.5" />
      <circle cx="88" cy="50" r="2.5" fill={color} opacity="0.5" />
      <circle cx="74" cy="58" r="2.5" fill={color} opacity="0.5" />
      <circle cx="81" cy="58" r="2.5" fill={color} opacity="0.5" />
      <circle cx="88" cy="58" r="2.5" fill={color} opacity="0.5" />
      <text x="38" y="72" fill={color} fontSize="18" fontWeight="800" textAnchor="middle" opacity="0.7">₽</text>
    </svg>
  );
}

function ShapeBooking({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <rect x="22" y="30" width="76" height="68" rx="10" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
      <rect x="22" y="30" width="76" height="20" rx="10" fill={color} opacity="0.2" />
      <line x1="40" y1="22" x2="40" y2="38" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <line x1="80" y1="22" x2="80" y2="38" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {[60, 72, 84].map(y => [36, 50, 64, 78].map(x => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={color} opacity="0.3" />
      )))}
      <circle cx="64" cy="72" r="8" fill={color} opacity="0.6" />
      <circle cx="88" cy="88" r="12" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
      <line x1="88" y1="88" x2="88" y2="81" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="88" y1="88" x2="94" y2="88" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function ShapeReviews({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {[0, 1, 2, 3].map(i => {
        const y = 28 + i * 22;
        const fillCount = [5, 4, 5, 3][i];
        return (
          <g key={i}>
            {[0, 1, 2, 3, 4].map(j => (
              <path key={j} d={`M${30 + j * 14} ${y}l3.5 7 7.5 1-5.5 5 1.3 7.5-6.8-3.5-6.8 3.5 1.3-7.5-5.5-5 7.5-1z`}
                fill={j < fillCount ? color : 'none'} stroke={color} strokeWidth="1"
                opacity={j < fillCount ? 0.7 : 0.2} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function ShapeFavorites({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <path d="M60 95 Q20 65 20 42 Q20 22 40 22 Q52 22 60 35 Q68 22 80 22 Q100 22 100 42 Q100 65 60 95Z" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      <path d="M48 40 L48 75 L60 65 L72 75 L72 40 Z" fill={color} opacity="0.5" />
      <path d="M25 30 Q22 24 28 24 Q32 24 30 30 Q28 24 25 30Z" fill={color} opacity="0.4" />
      <path d="M90 50 Q87 44 93 44 Q97 44 95 50 Q93 44 90 50Z" fill={color} opacity="0.3" />
    </svg>
  );
}

function ShapeLoyalty({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <path d="M42 35 L78 35 L74 70 Q74 80 60 82 Q46 80 46 70 Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="52" y="82" width="16" height="8" fill={color} opacity="0.3" />
      <rect x="45" y="90" width="30" height="6" rx="3" fill={color} opacity="0.4" />
      <path d="M42 40 Q25 40 25 55 Q25 65 42 65" fill="none" stroke={color} strokeWidth="2" opacity="0.4" />
      <path d="M78 40 Q95 40 95 55 Q95 65 78 65" fill="none" stroke={color} strokeWidth="2" opacity="0.4" />
      <path d="M60 45l4 8 9 1.3-6.5 6.3 1.5 9-8-4.2-8 4.2 1.5-9-6.5-6.3 9-1.3z" fill={color} opacity="0.6" />
      <circle cx="30" cy="28" r="2" fill={color} opacity="0.5" />
      <circle cx="92" cy="30" r="1.5" fill={color} opacity="0.4" />
    </svg>
  );
}

/* ─── 3 new shapes ─────────────────────────────────────── */

function ShapeRestaurants({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Buildings / skyline */}
      <rect x="12" y="50" width="18" height="45" rx="3" fill={color} opacity="0.3" />
      <rect x="15" y="55" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="22" y="55" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="15" y="63" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="22" y="63" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="35" y="35" width="22" height="60" rx="3" fill={color} opacity="0.4" />
      <rect x="39" y="40" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="48" y="40" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="39" y="50" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="48" y="50" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="39" y="60" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="48" y="60" width="5" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="43" y="75" width="8" height="20" rx="2" fill={color} opacity="0.5" />
      <rect x="62" y="42" width="18" height="53" rx="3" fill={color} opacity="0.35" />
      <rect x="65" y="47" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="72" y="47" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="65" y="56" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="72" y="56" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="85" y="55" width="22" height="40" rx="3" fill={color} opacity="0.25" />
      <rect x="89" y="60" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="98" y="60" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="89" y="69" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="98" y="69" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      {/* Counter badge */}
      <circle cx="95" cy="25" r="16" fill={color} opacity="0.2" />
      <text x="95" y="29" fill={color} fontSize="11" fontWeight="800" textAnchor="middle" opacity="0.8">123K</text>
    </svg>
  );
}

function ShapeCities({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Map with pins */}
      <rect x="15" y="20" width="90" height="75" rx="12" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Roads */}
      <path d="M15 55 Q45 45 60 55 Q75 65 105 50" fill="none" stroke={color} strokeWidth="1.5" opacity="0.2" strokeDasharray="4 3" />
      <path d="M30 20 Q35 50 40 95" fill="none" stroke={color} strokeWidth="1" opacity="0.15" strokeDasharray="3 3" />
      <path d="M75 20 Q70 55 80 95" fill="none" stroke={color} strokeWidth="1" opacity="0.15" strokeDasharray="3 3" />
      {/* City pins */}
      <circle cx="35" cy="40" r="4" fill={color} opacity="0.8" />
      <line x1="35" y1="44" x2="35" y2="52" stroke={color} strokeWidth="2" opacity="0.6" />
      <circle cx="60" cy="50" r="5" fill={color} opacity="0.9" />
      <line x1="60" y1="55" x2="60" y2="65" stroke={color} strokeWidth="2.5" opacity="0.7" />
      <circle cx="80" cy="35" r="3.5" fill={color} opacity="0.7" />
      <line x1="80" y1="38.5" x2="80" y2="45" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="70" r="3" fill={color} opacity="0.6" />
      <line x1="50" y1="73" x2="50" y2="78" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <circle cx="90" cy="60" r="3" fill={color} opacity="0.5" />
      <line x1="90" y1="63" x2="90" y2="68" stroke={color} strokeWidth="1.5" opacity="0.4" />
      {/* Badge */}
      <circle cx="95" cy="22" r="14" fill={color} opacity="0.2" />
      <text x="95" y="26" fill={color} fontSize="10" fontWeight="800" textAnchor="middle" opacity="0.8">221</text>
    </svg>
  );
}

function ShapeLanguages({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Globe */}
      <circle cx="60" cy="58" r="38" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <ellipse cx="60" cy="58" rx="18" ry="38" fill="none" stroke={color} strokeWidth="1.5" opacity="0.25" />
      <line x1="22" y1="58" x2="98" y2="58" stroke={color} strokeWidth="1.5" opacity="0.2" />
      <line x1="28" y1="40" x2="92" y2="40" stroke={color} strokeWidth="1" opacity="0.15" />
      <line x1="28" y1="76" x2="92" y2="76" stroke={color} strokeWidth="1" opacity="0.15" />
      {/* Language labels floating */}
      <rect x="8" y="15" width="24" height="14" rx="7" fill={color} opacity="0.2" />
      <text x="20" y="25" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.7">RU</text>
      <rect x="75" y="10" width="24" height="14" rx="7" fill={color} opacity="0.2" />
      <text x="87" y="20" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.7">EN</text>
      <rect x="88" y="45" width="24" height="14" rx="7" fill={color} opacity="0.15" />
      <text x="100" y="55" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.6">中</text>
      <rect x="5" y="65" width="22" height="14" rx="7" fill={color} opacity="0.15" />
      <text x="16" y="75" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.6">ES</text>
      <rect x="85" y="78" width="24" height="14" rx="7" fill={color} opacity="0.12" />
      <text x="97" y="88" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.5">FR</text>
      <rect x="38" y="100" width="22" height="14" rx="7" fill={color} opacity="0.12" />
      <text x="49" y="110" fill={color} fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.5">DE</text>
    </svg>
  );
}

/* ─── Mood types ──────────────────────────────────────────── */

type Mood = 'sad' | 'curious' | 'interested' | 'booking' | 'happy';

function getMood(index: number, goingRight: boolean): Mood {
  if (!goingRight) return 'happy';
  if (index === 0) return 'sad';
  if (index === 1) return 'curious';
  if (index >= 3 && index <= 6) return 'interested';
  if (index === 7) return 'booking';
  return 'happy';
}

/* ─── Walking person SVG (large, expressive) ─────────────── */

function WalkingPerson({ frame, facingRight, mood }: { frame: number; facingRight: boolean; mood: Mood }) {
  // Smooth sine-based walk cycle
  const t = Math.sin((frame % 80) * 0.16);  // continuous sine wave -1..1
  const t2 = Math.sin((frame % 80) * 0.16 + Math.PI); // opposite phase

  // Leg foot positions: small natural stride
  const leftFootX = 50 + t * 14;
  const rightFootX = 50 + t2 * 14;
  // Knee bends slightly
  const leftKneeX = 46 + t * 8;
  const rightKneeX = 54 + t2 * 8;
  const leftKneeY = 148 - Math.abs(t) * 4;
  const rightKneeY = 148 - Math.abs(t2) * 4;
  // Foot Y — lifted slightly when forward
  const leftFootY = 178 - (t > 0 ? t * 3 : 0);
  const rightFootY = 178 - (t2 > 0 ? t2 * 3 : 0);
  // Arms swing opposite to legs
  const leftArmEndX = 30 + t2 * 12;
  const rightArmEndX = 70 + t * 12;
  const leftArmEndY = 108 + Math.abs(t2) * 3;
  const rightArmEndY = 108 + Math.abs(t) * 3;

  const hasPhone = mood === 'curious' || mood === 'interested' || mood === 'booking';
  const c = 'var(--text)';

  return (
    <svg viewBox="0 0 100 200" className="w-full h-full" style={{ transform: facingRight ? 'none' : 'scaleX(-1)' }}>

      {/* === HEAD (large, centered at 50,38) === */}
      {/* Hair */}
      <ellipse cx="50" cy="24" rx="17" ry="11" fill={c} opacity="0.7" />
      {/* Head circle */}
      <circle cx="50" cy="36" r="18" fill="var(--bg2)" stroke={c} strokeWidth="2.5" />

      {/* === FACE — large and readable === */}
      {mood === 'sad' && (<>
        {/* Droopy eyes */}
        <ellipse cx="42" cy="34" rx="3" ry="3.5" fill={c} opacity="0.6" />
        <ellipse cx="58" cy="34" rx="3" ry="3.5" fill={c} opacity="0.6" />
        {/* Pupils looking down */}
        <circle cx="42" cy="36" r="1.5" fill={c} opacity="0.9" />
        <circle cx="58" cy="36" r="1.5" fill={c} opacity="0.9" />
        {/* Sad eyebrows ╲ ╱ */}
        <line x1="36" y1="27" x2="44" y2="29" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="64" y1="27" x2="56" y2="29" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* Frown */}
        <path d="M41 46 Q50 42 59 46" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        {/* Tear drop */}
        <ellipse cx="63" cy="39" rx="1.5" ry="2.5" fill="#6BA3FF" opacity="0.4" />
      </>)}

      {mood === 'curious' && (<>
        {/* Big surprised eyes */}
        <ellipse cx="42" cy="34" rx="4" ry="4.5" fill="white" opacity="0.15" />
        <ellipse cx="58" cy="34" rx="4" ry="4.5" fill="white" opacity="0.15" />
        <circle cx="42" cy="34" r="3" fill={c} opacity="0.7" />
        <circle cx="58" cy="34" r="3" fill={c} opacity="0.7" />
        <circle cx="43" cy="33" r="1" fill="white" opacity="0.3" />
        <circle cx="59" cy="33" r="1" fill="white" opacity="0.3" />
        {/* Raised eyebrows */}
        <line x1="37" y1="26" x2="46" y2="26" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <line x1="63" y1="26" x2="54" y2="26" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        {/* O mouth */}
        <ellipse cx="50" cy="45" rx="3.5" ry="4" fill="none" stroke={c} strokeWidth="2" opacity="0.5" />
        {/* "!" mark */}
        <text x="72" y="24" fill="var(--accent)" fontSize="14" fontWeight="900" opacity="0.6">!</text>
      </>)}

      {mood === 'interested' && (<>
        {/* Normal eyes */}
        <circle cx="42" cy="34" r="3" fill={c} opacity="0.6" />
        <circle cx="58" cy="34" r="3" fill={c} opacity="0.6" />
        <circle cx="43" cy="33" r="1" fill="white" opacity="0.2" />
        <circle cx="59" cy="33" r="1" fill="white" opacity="0.2" />
        {/* Gentle smile */}
        <path d="M42 44 Q50 50 58 44" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </>)}

      {mood === 'booking' && (<>
        {/* Focused eyes */}
        <circle cx="42" cy="34" r="3.5" fill={c} opacity="0.65" />
        <circle cx="58" cy="34" r="3.5" fill={c} opacity="0.65" />
        <circle cx="43" cy="33" r="1.2" fill="white" opacity="0.25" />
        <circle cx="59" cy="33" r="1.2" fill="white" opacity="0.25" />
        {/* Wide smile */}
        <path d="M40 44 Q50 52 60 44" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        {/* Sparkle */}
        <path d="M74 18 l3 7 3-7 3 7-3 7-3-7z" fill="#39FFD1" opacity="0.7" />
        <path d="M26 20 l2 5 2-5 2 5-2 5-2-5z" fill="#FFD700" opacity="0.5" />
      </>)}

      {mood === 'happy' && (<>
        {/* Happy closed eyes — arcs */}
        <path d="M36 33 Q42 28 48 33" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M52 33 Q58 28 64 33" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        {/* Big grin */}
        <path d="M38 43 Q50 55 62 43" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        {/* Teeth hint */}
        <line x1="44" y1="46" x2="56" y2="46" stroke={c} strokeWidth="1" opacity="0.15" />
        {/* Blush */}
        <circle cx="34" cy="40" r="4" fill="#FF6B6B" opacity="0.12" />
        <circle cx="66" cy="40" r="4" fill="#FF6B6B" opacity="0.12" />
        {/* Sparkles */}
        <path d="M22 12 l3 7 3-7 3 7-3 7-3-7z" fill="#BAFF39" opacity="0.6" />
        <path d="M72 8 l2.5 6 2.5-6 2.5 6-2.5 6-2.5-6z" fill="#FFD700" opacity="0.5" />
        <path d="M80 28 l2 4 2-4 2 4-2 4-2-4z" fill="#FF5C28" opacity="0.4" />
        {/* Musical notes */}
        <text x="18" y="30" fill="#BAFF39" fontSize="10" opacity="0.4">♪</text>
        <text x="78" y="18" fill="#FFD700" fontSize="8" opacity="0.3">♫</text>
      </>)}

      {/* === BODY === */}
      {/* Neck */}
      <line x1="50" y1="54" x2="50" y2="62" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {/* Torso */}
      <path d="M36 64 L50 62 L64 64 L61 120 L39 120 Z" fill={c} opacity="0.1" stroke={c} strokeWidth="2" strokeLinejoin="round" />

      {/* === ARMS === */}
      {hasPhone ? (<>
        {/* Left arm — bent, holding phone */}
        <line x1="36" y1="70" x2="28" y2="85" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <line x1="28" y1="85" x2="30" y2="72" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        {/* Phone — large */}
        <rect x="6" y="50" width="30" height="48" rx="5" fill="var(--bg2)" stroke="var(--accent)" strokeWidth="2.5" />
        {/* Screen */}
        <rect x="10" y="56" width="22" height="32" rx="2.5" fill="var(--accent)" opacity="0.15" />
        {/* Screen glow pulse */}
        <rect x="10" y="56" width="22" height="32" rx="2.5" fill="var(--accent)" opacity="0.08">
          <animate attributeName="opacity" values="0.05;0.2;0.05" dur="1.5s" repeatCount="indefinite" />
        </rect>
        {/* Logo on screen */}
        <text x="21" y="71" textAnchor="middle" fill="var(--text)" fontSize="8" fontWeight="700" opacity="0.8">menu</text>
        <text x="21" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9.5" fontWeight="900" opacity="1">rest</text>
        {/* Home button */}
        <circle cx="21" cy="94" r="2" fill="var(--accent)" opacity="0.25" />

        {/* Right arm swings */}
        <line x1="64" y1="70" x2={rightArmEndX} y2={rightArmEndY}
          stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      </>) : (<>
        {/* Both arms swing */}
        <line x1="36" y1="70" x2={leftArmEndX} y2={leftArmEndY}
          stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <line x1="64" y1="70" x2={rightArmEndX} y2={rightArmEndY}
          stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      </>)}

      {/* === LEGS (sine-based, smooth) === */}
      {/* Left leg: hip → knee → foot */}
      <line x1="44" y1="120" x2={leftKneeX} y2={leftKneeY}
        stroke={c} strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <line x1={leftKneeX} y1={leftKneeY} x2={leftFootX} y2={leftFootY}
        stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      {/* Right leg */}
      <line x1="56" y1="120" x2={rightKneeX} y2={rightKneeY}
        stroke={c} strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <line x1={rightKneeX} y1={rightKneeY} x2={rightFootX} y2={rightFootY}
        stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.5" />

      {/* Shoes */}
      <ellipse cx={leftFootX + (facingRight ? 4 : -4)} cy={leftFootY + 2} rx="8" ry="4" fill={c} opacity="0.45" />
      <ellipse cx={rightFootX + (facingRight ? 4 : -4)} cy={rightFootY + 2} rx="8" ry="4" fill={c} opacity="0.45" />
    </svg>
  );
}

/* ─── Scene decorations ──────────────────────────────────── */

function SceneDecorations({ personX }: { personX: number }) {
  return (
    <>
      {/* ── Restaurants at the right end (large) ── */}
      <div className="absolute" style={{ right: '-2%', bottom: 62, width: 320, opacity: 0.6 }}>
        <svg viewBox="0 0 220 140" className="w-full h-full">
          {/* Pizzeria */}
          <rect x="5" y="30" width="55" height="110" rx="4" fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.15" />
          <rect x="5" y="30" width="55" height="18" rx="4" fill="var(--accent)" opacity="0.15" />
          {/* Striped awning */}
          <path d="M3 30 L7 22 L17 30 L27 22 L37 30 L47 22 L57 30 L62 22" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.4" />
          {/* Windows */}
          <rect x="12" y="55" width="12" height="14" rx="2" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="32" y="55" width="12" height="14" rx="2" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.25" />
          {/* Door */}
          <rect x="20" y="100" width="18" height="40" rx="3" fill="var(--accent)" opacity="0.25" />
          <circle cx="35" cy="120" r="1.5" fill="var(--accent)" opacity="0.5" />
          {/* Pizza sign */}
          <circle cx="30" cy="15" r="12" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.4" />
          <text x="30" y="19" textAnchor="middle" fontSize="13" opacity="0.7">🍕</text>

          {/* Sushi bar */}
          <rect x="75" y="40" width="50" height="100" rx="4" fill="var(--teal)" fillOpacity="0.15" stroke="var(--teal)" strokeWidth="1" strokeOpacity="0.15" />
          <rect x="75" y="40" width="50" height="16" rx="4" fill="var(--teal)" opacity="0.12" />
          {/* Noren curtain */}
          <rect x="82" y="56" width="8" height="20" rx="1" fill="var(--teal)" opacity="0.12" />
          <rect x="93" y="56" width="8" height="20" rx="1" fill="var(--teal)" opacity="0.12" />
          <rect x="104" y="56" width="8" height="20" rx="1" fill="var(--teal)" opacity="0.12" />
          {/* Window */}
          <rect x="82" y="82" width="36" height="16" rx="3" fill="var(--teal)" fillOpacity="0.1" stroke="var(--teal)" strokeWidth="1" strokeOpacity="0.2" />
          {/* Door */}
          <rect x="90" y="108" width="16" height="32" rx="3" fill="var(--teal)" opacity="0.2" />
          {/* Sushi sign */}
          <circle cx="100" cy="30" r="11" fill="var(--teal)" fillOpacity="0.12" stroke="var(--teal)" strokeWidth="1.5" strokeOpacity="0.35" />
          <text x="100" y="34" textAnchor="middle" fontSize="12" opacity="0.7">🍣</text>

          {/* Cafe */}
          <rect x="145" y="50" width="65" height="90" rx="4" fill="var(--lime)" fillOpacity="0.12" stroke="var(--lime)" strokeWidth="1" strokeOpacity="0.12" />
          <rect x="145" y="50" width="65" height="14" rx="4" fill="var(--lime)" opacity="0.1" />
          {/* Awning */}
          <path d="M143 50 L148 43 L158 50 L168 43 L178 50 L188 43 L198 50 L208 43 L212 50" fill="none" stroke="var(--lime)" strokeWidth="1.5" opacity="0.3" />
          {/* Tables outside */}
          <circle cx="155" cy="120" r="5" fill="none" stroke="var(--lime)" strokeWidth="1" opacity="0.25" />
          <line x1="155" y1="125" x2="155" y2="140" stroke="var(--lime)" strokeWidth="1" opacity="0.2" />
          <circle cx="175" cy="118" r="5" fill="none" stroke="var(--lime)" strokeWidth="1" opacity="0.2" />
          <line x1="175" y1="123" x2="175" y2="140" stroke="var(--lime)" strokeWidth="1" opacity="0.15" />
          {/* Windows */}
          <rect x="152" y="70" width="14" height="12" rx="2" fill="var(--lime)" fillOpacity="0.1" stroke="var(--lime)" strokeWidth="1" strokeOpacity="0.2" />
          <rect x="172" y="70" width="14" height="12" rx="2" fill="var(--lime)" fillOpacity="0.1" stroke="var(--lime)" strokeWidth="1" strokeOpacity="0.2" />
          {/* Door */}
          <rect x="190" y="95" width="14" height="45" rx="3" fill="var(--lime)" opacity="0.18" />
          {/* Coffee sign */}
          <circle cx="177" cy="40" r="10" fill="var(--lime)" fillOpacity="0.1" stroke="var(--lime)" strokeWidth="1.5" strokeOpacity="0.3" />
          <text x="177" y="44" textAnchor="middle" fontSize="11" opacity="0.7">☕</text>

          {/* Smoke from cafe */}
          <path d="M168 35 Q172 28 168 20 Q165 14 170 8" fill="none" stroke="var(--lime)" strokeWidth="1" opacity="0.12" />
        </svg>
      </div>

      {/* Sad cloud at the left start */}
      <div className="absolute" style={{
        left: '1%', top: -10, width: 160, opacity: personX < 30 ? 0.5 : 0.06,
        transition: 'opacity 1.2s',
      }}>
        <svg viewBox="0 0 160 100" className="w-full h-full">
          {/* Cloud body */}
          <ellipse cx="80" cy="45" rx="55" ry="28" fill="var(--text)" opacity="0.12" />
          <ellipse cx="55" cy="36" rx="35" ry="24" fill="var(--text)" opacity="0.1" />
          <ellipse cx="105" cy="34" rx="32" ry="22" fill="var(--text)" opacity="0.1" />
          <ellipse cx="80" cy="28" rx="25" ry="18" fill="var(--text)" opacity="0.08" />
          {/* Rain drops — animated */}
          {[30, 50, 70, 90, 110, 65, 95].map((x, i) => (
            <line key={i} x1={x} y1={68 + (i % 3) * 4} x2={x - 3} y2={82 + (i % 3) * 4}
              stroke="#6BA3FF" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
          ))}
          {/* Dark underside */}
          <ellipse cx="80" cy="55" rx="50" ry="12" fill="var(--text)" opacity="0.06" />
        </svg>
      </div>

      {/* Happy sun at the right end */}
      <div className="absolute" style={{
        right: '2%', top: -20, width: 140, opacity: personX > 60 ? 0.6 : 0.04,
        transition: 'opacity 1.2s',
      }}>
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Glow */}
          <circle cx="60" cy="60" r="45" fill="#FFD700" opacity="0.06" />
          <circle cx="60" cy="60" r="30" fill="#FFD700" opacity="0.1" />
          {/* Sun body */}
          <circle cx="60" cy="60" r="20" fill="#FFD700" opacity="0.35" />
          <circle cx="60" cy="60" r="14" fill="#FFD700" opacity="0.5" />
          {/* Face */}
          <path d="M52 56 Q55 54 58 56" fill="none" stroke="#B8960A" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M62 56 Q65 54 68 56" fill="none" stroke="#B8960A" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M53 65 Q60 72 67 65" fill="none" stroke="#B8960A" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          {/* Rays */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
            <line key={angle}
              x1={60 + 24 * Math.cos(angle * Math.PI / 180)}
              y1={60 + 24 * Math.sin(angle * Math.PI / 180)}
              x2={60 + 38 * Math.cos(angle * Math.PI / 180)}
              y2={60 + 38 * Math.sin(angle * Math.PI / 180)}
              stroke="#FFD700" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          ))}
        </svg>
      </div>
    </>
  );
}

/* ─── Data ────────────────────────────────────────────────── */

const shapeComponents = [
  ShapeRestaurants, ShapeCities, ShapeLanguages,
  ShapeAI, ShapeMenu, ShapeAllergen, ShapeBudget,
  ShapeBooking, ShapeReviews, ShapeFavorites, ShapeLoyalty,
];

function useIsLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const check = () => setLight(document.documentElement.classList.contains('light'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return light;
}

const featuresDark = [
  { color: '#FF5C28', glow: 'rgba(255,92,40,0.3)' },
  { color: '#39FFD1', glow: 'rgba(57,255,209,0.3)' },
  { color: '#C4A1FF', glow: 'rgba(196,161,255,0.3)' },
  { color: '#FF5C28', glow: 'rgba(255,92,40,0.3)' },
  { color: '#BAFF39', glow: 'rgba(186,255,57,0.3)' },
  { color: '#FF6B6B', glow: 'rgba(255,107,107,0.3)' },
  { color: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  { color: '#39FFD1', glow: 'rgba(57,255,209,0.3)' },
  { color: '#FF5C28', glow: 'rgba(255,92,40,0.3)' },
  { color: '#FF6B9D', glow: 'rgba(255,107,157,0.3)' },
  { color: '#BAFF39', glow: 'rgba(186,255,57,0.3)' },
];

const featuresLight = [
  { color: '#D94520', glow: 'rgba(217,69,32,0.25)' },
  { color: '#0E8C7A', glow: 'rgba(14,140,122,0.2)' },
  { color: '#7B4FCC', glow: 'rgba(123,79,204,0.2)' },
  { color: '#D94520', glow: 'rgba(217,69,32,0.25)' },
  { color: '#4A8C10', glow: 'rgba(74,140,16,0.2)' },
  { color: '#CC3333', glow: 'rgba(204,51,51,0.2)' },
  { color: '#B8920E', glow: 'rgba(184,146,14,0.25)' },
  { color: '#0E8C7A', glow: 'rgba(14,140,122,0.2)' },
  { color: '#D94520', glow: 'rgba(217,69,32,0.25)' },
  { color: '#CC3366', glow: 'rgba(204,51,102,0.2)' },
  { color: '#4A8C10', glow: 'rgba(74,140,16,0.2)' },
];

const featuresBase = [
  {
    title: '123 000 ресторанов',
    subtitle: 'Крупнейшая база заведений',
    detail: 'От уютных кафе до роскошных ресторанов — выбирайте из огромного каталога с подробными карточками, фото и меню',
  },
  {
    title: '221 город',
    subtitle: 'Вся Россия на одной карте',
    detail: 'Москва, Петербург, Казань, Сочи и ещё 217 городов. Находите лучшие рестораны в любом уголке страны',
  },
  {
    title: '8 языков',
    subtitle: 'Понятно каждому гостю',
    detail: 'Русский, английский, китайский, испанский, французский, немецкий, арабский и турецкий — для местных и туристов',
  },
  {
    title: 'AI-поиск',
    subtitle: 'Ищите на естественном языке',
    detail: 'Опишите, что хотите — «уютное место с пастой на двоих до 3000₽» — и получите подборку за секунду',
  },
  {
    title: 'Меню с КБЖУ',
    subtitle: 'Считайте рацион при выборе',
    detail: 'Калории, белки, жиры и углеводы для каждого блюда. Следите за питанием, не отказываясь от ресторанов',
  },
  {
    title: 'Фильтр аллергенов',
    subtitle: 'Безопасный выбор блюд',
    detail: 'Укажите аллергены в профиле — мы пометим опасные блюда и подскажем безопасные альтернативы',
  },
  {
    title: 'Калькулятор бюджета',
    subtitle: 'Знайте сумму заранее',
    detail: 'Соберите заказ на компанию, добавьте чаевые — узнайте точную сумму до похода в ресторан',
  },
  {
    title: 'Онлайн-бронирование',
    subtitle: 'Столик без звонков',
    detail: 'Выберите дату, время и количество гостей — забронируйте столик в пару кликов',
  },
  {
    title: 'Честные отзывы',
    subtitle: 'Четыре оценки вместо одной',
    detail: 'Кухня, обслуживание, атмосфера, цена/качество — оцениваются отдельно',
  },
  {
    title: 'Избранное',
    subtitle: 'Ваша личная коллекция',
    detail: 'Сохраняйте понравившиеся рестораны одним кликом и возвращайтесь к ним в любой момент',
  },
  {
    title: 'Программа лояльности',
    subtitle: 'Бонусы за активность',
    detail: 'Копите баллы за бронирования и отзывы — поднимайтесь в рейтинге и получайте привилегии',
  },
];

const TOTAL = featuresBase.length;
// Duration of one full cycle: walk right through all features, then walk left back
const STEP_DURATION = 3500; // ms per feature

/* ─── Main page ───────────────────────────────────────────── */

export default function FeaturesPage() {
  const isLight = useIsLight();
  const features = featuresBase.map((f, i) => ({
    ...f,
    ...(isLight ? featuresLight[i] : featuresDark[i]),
  }));

  const [active, setActive] = useState(0);
  const [walkFrame, setWalkFrame] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [goingRight, setGoingRight] = useState(true);

  const goNext = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setActive(prev => {
        const next = goingRight ? prev + 1 : prev - 1;
        // Reached the end — flip direction
        if (next >= TOTAL) {
          setGoingRight(false);
          return TOTAL - 1;
        }
        if (next < 0) {
          setGoingRight(true);
          return 0;
        }
        return next;
      });
      setTransitioning(false);
    }, 400);
  }, [goingRight]);

  // Auto-cycle
  useEffect(() => {
    const interval = setInterval(goNext, STEP_DURATION);
    return () => clearInterval(interval);
  }, [goNext]);

  // Walk animation
  useEffect(() => {
    const walk = setInterval(() => setWalkFrame(f => f + 1), 80);
    return () => clearInterval(walk);
  }, []);

  const feat = features[active];
  const Shape = shapeComponents[active];
  const mood = getMood(active, goingRight);
  const showCard = mood !== 'sad'; // hide features while sad

  // Person walks from 8% to 88% based on active index
  const personX = 8 + (active / (TOTAL - 1)) * 80; // percentage
  // Card appears on the side with more space
  const cardOnLeft = personX > 50;

  return (
    <>
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-10 pt-12 pb-6 relative">
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 500, height: 500, background: 'rgba(255,92,40,0.06)', filter: 'blur(80px)', top: -150, right: -100 }} />
        <div className="relative z-10 text-center max-w-[680px] mx-auto">
          <h1 className="font-serif text-[48px] font-black text-[var(--text)] leading-[1.05] mb-4">
            Возможности{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), var(--lime))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>MenuRest</span>
          </h1>
          <p className="text-[17px] text-[var(--text2)] leading-relaxed">
            Не просто каталог ресторанов — умные инструменты для идеального выбора
          </p>
        </div>
      </section>

      {/* ── Animated showcase ── */}
      <section className="max-w-[1100px] mx-auto px-10 py-10 relative" style={{ minHeight: 560 }}>

        {/* Scene decorations — restaurants, clouds, sun */}
        <SceneDecorations personX={personX} />

        {/* Ground line */}
        <div className="absolute left-[6%] right-[6%] h-px" style={{ bottom: 60, background: 'var(--card-border)' }} />

        {/* Footstep dots */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{ width: 4, height: 4, background: 'var(--text)', opacity: 0.08, bottom: 58, left: `${8 + i * 5.3}%` }} />
        ))}

        {/* Walking person — moves horizontally */}
        <div
          className="absolute -translate-x-1/2"
          style={{
            left: `${personX}%`,
            width: 90, height: 180,
            bottom: 55,
            filter: `drop-shadow(0 0 20px ${feat.glow})`,
            transition: 'left 1.4s cubic-bezier(0.25, 0.1, 0.25, 1), filter 0.8s',
          }}
        >
          <WalkingPerson frame={walkFrame} facingRight={goingRight} mood={getMood(active, goingRight)} />
        </div>

        {/* Glow under person */}
        <div className="absolute rounded-full -translate-x-1/2"
          style={{
            left: `${personX}%`, width: 90, height: 20, bottom: 48,
            background: feat.color, opacity: 0.12, filter: 'blur(12px)',
            transition: 'left 1.4s cubic-bezier(0.25, 0.1, 0.25, 1), background 0.8s',
          }} />

        {/* Feature card — hidden while sad */}
        <div className="absolute top-8"
          style={{
            left: cardOnLeft ? '2%' : undefined,
            right: cardOnLeft ? undefined : '2%',
            width: '38%',
            opacity: !showCard ? 0 : transitioning ? 0 : 1,
            transform: !showCard ? 'translateY(20px) scale(0.95)' : transitioning ? `translateX(${cardOnLeft ? -40 : 40}px)` : 'translateX(0)',
            transition: 'all 0.7s cubic-bezier(0.25, 0.1, 0.25, 1)',
            pointerEvents: showCard ? 'auto' : 'none',
          }}>
          <div className="rounded-[20px] p-7 border relative overflow-hidden"
            style={{ background: 'var(--card)', borderColor: feat.color, boxShadow: `0 8px 40px ${feat.glow}` }}>
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
              style={{ background: feat.color, opacity: 0.06, filter: 'blur(20px)' }} />
            <div className="relative z-10">
              <h3 className="text-[22px] font-bold mb-1" style={{ color: feat.color }}>{feat.title}</h3>
              <p className="text-[14px] font-semibold text-[var(--text)] mb-3">{feat.subtitle}</p>
              <p className="text-[13px] text-[var(--text3)] leading-relaxed">{feat.detail}</p>
            </div>
          </div>
        </div>

        {/* Shape — opposite side */}
        <div className="absolute"
          style={{
            top: 30,
            left: cardOnLeft ? undefined : '8%',
            right: cardOnLeft ? '8%' : undefined,
            width: 150, height: 150,
            opacity: !showCard ? 0 : transitioning ? 0 : 0.85,
            transform: !showCard ? 'scale(0.5)' : transitioning ? `scale(0.7) translateX(${cardOnLeft ? 30 : -30}px)` : 'scale(1) translateX(0)',
            transition: 'all 0.7s cubic-bezier(0.25, 0.1, 0.25, 1)',
            filter: `drop-shadow(0 0 24px ${feat.glow})`,
          }}>
          <Shape color={feat.color} />
        </div>

        {/* Connecting line — hidden while sad */}
        <svg className="absolute pointer-events-none" style={{ top: 0, left: 0, width: '100%', height: '100%', opacity: !showCard ? 0 : transitioning ? 0 : 0.15, transition: 'opacity 0.3s' }}>
          <line
            x1={cardOnLeft ? '40%' : '60%'} y1="55%"
            x2={`${personX}%`} y2="75%"
            stroke={feat.color} strokeWidth="1.5" strokeDasharray="6 4"
            style={{ transition: 'x2 1.4s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
          />
        </svg>

        {/* Floating particles — hidden while sad */}
        {showCard && [...Array(5)].map((_, i) => (
          <div key={`p-${active}-${i}`} className="absolute rounded-full animate-float-particle"
            style={{
              width: 3 + i * 1.5, height: 3 + i * 1.5,
              background: feat.color, opacity: 0.2 - i * 0.03,
              left: `${25 + i * 12}%`, top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.4}s`, animationDuration: `${3 + i}s`,
            }} />
        ))}
      </section>

      {/* ── Navigation dots ── */}
      <div className="flex justify-center gap-2 pb-12">
        {features.map((f, i) => (
          <button key={i}
            onClick={() => { setTransitioning(true); setTimeout(() => { setActive(i); setTransitioning(false); }, 300); }}
            className="group relative h-3 rounded-full cursor-pointer border-none transition-all duration-300"
            style={{ width: i === active ? 32 : 12, background: i === active ? f.color : 'var(--card-border)' }}
            title={f.title}>
            {i === active && (
              <span className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: f.color, opacity: 0.3, filter: 'blur(4px)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Full feature list ── */}
      <section className="max-w-[1400px] mx-auto px-10 pb-20">
        <h2 className="font-serif text-[32px] font-bold text-[var(--text)] text-center mb-10">
          Все возможности
        </h2>

        {/* Stats row — first 3 */}
        <div className="grid grid-cols-3 gap-5 mb-5 max-sm:grid-cols-1">
          {features.slice(0, 3).map((f, i) => {
            const S = shapeComponents[i];
            return (
              <div key={f.title}
                className="rounded-[18px] p-6 border transition-all duration-300 cursor-pointer group text-center"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                onClick={() => { setActive(i); setGoingRight(i > active); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = f.color;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${f.glow}`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}>
                <div className="w-14 h-14 mx-auto mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
                  <S color={f.color} />
                </div>
                <h3 className="text-[20px] font-black mb-1" style={{ color: f.color }}>{f.title}</h3>
                <p className="text-[12px] text-[var(--text3)] leading-relaxed">{f.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Rest — 4 columns */}
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {features.slice(3).map((f, rawI) => {
            const i = rawI + 3;
            const S = shapeComponents[i];
            return (
              <div key={f.title}
                className="rounded-[18px] p-6 border transition-all duration-300 cursor-pointer group"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                onClick={() => { setActive(i); setGoingRight(i > active); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = f.color;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${f.glow}`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}>
                <div className="w-10 h-10 mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
                  <S color={f.color} />
                </div>
                <h3 className="text-[15px] font-bold text-[var(--text)] mb-1">{f.title}</h3>
                <p className="text-[12px] text-[var(--text3)] leading-relaxed">{f.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-[800px] mx-auto px-10 pb-16">
        <div className="rounded-[18px] px-8 py-9 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 16px 50px rgba(255,92,40,0.15)' }}>
          <div className="absolute rounded-full" style={{ top: -60, right: -60, width: 240, height: 240, background: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute rounded-full" style={{ bottom: -40, left: -40, width: 180, height: 180, background: 'rgba(255,255,255,0.04)' }} />
          <div className="relative z-10">
            <h2 className="font-serif text-[24px] font-black text-white mb-2">Попробуйте сами</h2>
            <p className="text-[14px] text-white/70 mb-5 max-w-[360px] mx-auto">
              Найдите ресторан мечты за пару кликов — выберите свой способ
            </p>
            <div className="flex gap-3 justify-center max-sm:flex-col max-sm:items-center">
              <Link href="/restaurants"
                className="flex items-center gap-2 px-6 py-3 text-[13px] font-semibold rounded-full transition-all duration-300 no-underline"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.25)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                Найти самостоятельно
              </Link>
              <Link href="/"
                className="flex items-center gap-2 px-6 py-3 text-[13px] font-semibold rounded-full transition-all duration-300 no-underline"
                style={{ background: 'var(--lime)', color: 'var(--bg)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px var(--lime-glow)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}>
                <span style={{ fontSize: 15 }}>🤖</span>
                Спроси Menu-Rest.AI
              </Link>
            </div>
            <p className="text-[12px] text-white/40 mt-3">Просто опишите, что хотите — AI подберёт за секунду</p>
          </div>
        </div>
      </section>

      {/* Animation styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          25% { transform: translateY(-15px) translateX(8px); opacity: 0.25; }
          50% { transform: translateY(-5px) translateX(-5px); opacity: 0.1; }
          75% { transform: translateY(-20px) translateX(3px); opacity: 0.2; }
        }
        .animate-float-particle {
          animation: float-particle 4s ease-in-out infinite;
        }
      `}} />
    </>
  );
}
