'use client';

interface ArticleCoverProps {
  slug: string;
  title: string;
  className?: string;
}

const COVERS: Record<string, {
  gradient: string;
  elements: JSX.Element;
}> = {
  'kak-vybrat-restoran-dlya-svidaniya': {
    gradient: 'linear-gradient(135deg, #1a0a1e 0%, #2d1233 30%, #3a1540 60%, #1e0a22 100%)',
    elements: (
      <>
        {/* Candles */}
        <rect x="140" y="120" width="8" height="50" rx="4" fill="#f5deb3" opacity="0.9" />
        <ellipse cx="144" cy="115" rx="6" ry="10" fill="#ff6b35" opacity="0.8" />
        <ellipse cx="144" cy="112" rx="3" ry="6" fill="#ffb347" opacity="0.9" />
        <circle cx="144" cy="108" r="2" fill="#fff4d6" opacity="0.7" />

        <rect x="260" y="130" width="8" height="45" rx="4" fill="#f5deb3" opacity="0.9" />
        <ellipse cx="264" cy="125" rx="6" ry="10" fill="#ff6b35" opacity="0.8" />
        <ellipse cx="264" cy="122" rx="3" ry="6" fill="#ffb347" opacity="0.9" />
        <circle cx="264" cy="118" r="2" fill="#fff4d6" opacity="0.7" />

        {/* Wine glasses */}
        <path d="M180 160 Q180 130 195 125 Q210 130 210 160 L205 160 L205 185 L215 185 L215 190 L175 190 L175 185 L185 185 L185 160Z" fill="rgba(180,50,80,0.4)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <path d="M220 155 Q220 128 235 123 Q250 128 250 155 L245 155 L245 183 L255 183 L255 188 L215 188 L215 183 L225 183 L225 155Z" fill="rgba(180,50,80,0.35)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

        {/* Hearts */}
        <g transform="translate(300, 80)" opacity="0.2">
          <path d="M0 8 Q0 0 8 0 Q16 0 16 8 Q16 16 8 24 Q0 16 0 8Z" fill="#ff4466" />
        </g>
        <g transform="translate(100, 70)" opacity="0.15">
          <path d="M0 6 Q0 0 6 0 Q12 0 12 6 Q12 12 6 18 Q0 12 0 6Z" fill="#ff4466" />
        </g>

        {/* Ambient glow */}
        <circle cx="200" cy="140" r="80" fill="url(#candleGlow)" opacity="0.3" />
        <defs>
          <radialGradient id="candleGlow">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Text */}
        <text x="200" y="220" textAnchor="middle" fill="rgba(255,255,255,0.08)" fontSize="80" fontFamily="serif" fontWeight="900">❤</text>
      </>
    ),
  },

  'kak-uvelichit-zapolnyaemost-zala': {
    gradient: 'linear-gradient(135deg, #0a1628 0%, #0f2035 30%, #162d45 60%, #0a1628 100%)',
    elements: (
      <>
        {/* Bar chart */}
        <rect x="100" y="160" width="30" height="40" rx="4" fill="rgba(57,255,209,0.25)" />
        <rect x="140" y="140" width="30" height="60" rx="4" fill="rgba(57,255,209,0.35)" />
        <rect x="180" y="110" width="30" height="90" rx="4" fill="rgba(57,255,209,0.5)" />
        <rect x="220" y="90" width="30" height="110" rx="4" fill="rgba(57,255,209,0.65)" />
        <rect x="260" y="70" width="30" height="130" rx="4" fill="rgba(57,255,209,0.8)" />

        {/* Arrow up */}
        <path d="M310 65 L290 50 L280 65" stroke="rgba(57,255,209,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <line x1="290" y1="50" x2="290" y2="100" stroke="rgba(57,255,209,0.4)" strokeWidth="2" strokeDasharray="4 4" />

        {/* +30% label */}
        <text x="290" y="42" textAnchor="middle" fill="rgba(57,255,209,0.7)" fontSize="16" fontWeight="bold" fontFamily="sans-serif">+30%</text>

        {/* Grid lines */}
        <line x1="90" y1="200" x2="310" y2="200" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1="90" y1="160" x2="310" y2="160" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="90" y1="120" x2="310" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="90" y1="80" x2="310" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Decorative dots */}
        <circle cx="115" cy="155" r="3" fill="rgba(57,255,209,0.4)" />
        <circle cx="155" cy="135" r="3" fill="rgba(57,255,209,0.4)" />
        <circle cx="195" cy="105" r="3" fill="rgba(57,255,209,0.4)" />
        <circle cx="235" cy="85" r="3" fill="rgba(57,255,209,0.4)" />
        <circle cx="275" cy="65" r="3" fill="rgba(57,255,209,0.4)" />
        <path d="M115 155 L155 135 L195 105 L235 85 L275 65" stroke="rgba(57,255,209,0.2)" strokeWidth="1.5" fill="none" />
      </>
    ),
  },

  'gastrofest-vesna-2026': {
    gradient: 'linear-gradient(135deg, #0f1a0a 0%, #1a2e10 30%, #243d18 60%, #0f1a0a 100%)',
    elements: (
      <>
        {/* Plate */}
        <ellipse cx="200" cy="145" rx="75" ry="70" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <ellipse cx="200" cy="145" rx="55" ry="50" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Leaves / spring herbs */}
        <g transform="translate(180, 120) rotate(-20)">
          <path d="M0 30 Q15 15 10 0 Q25 15 20 30Z" fill="rgba(100,200,80,0.5)" />
          <line x1="10" y1="0" x2="10" y2="30" stroke="rgba(100,200,80,0.3)" strokeWidth="1" />
        </g>
        <g transform="translate(210, 115) rotate(15)">
          <path d="M0 25 Q12 12 8 0 Q20 12 16 25Z" fill="rgba(120,210,90,0.4)" />
        </g>
        <g transform="translate(190, 140) rotate(5)">
          <path d="M0 20 Q10 10 7 0 Q17 10 14 20Z" fill="rgba(80,180,60,0.4)" />
        </g>

        {/* Asparagus */}
        <g transform="translate(160, 130)">
          <rect x="0" y="5" width="4" height="35" rx="2" fill="rgba(100,160,60,0.6)" />
          <ellipse cx="2" cy="5" rx="3" ry="5" fill="rgba(100,160,60,0.7)" />
        </g>
        <g transform="translate(168, 125)">
          <rect x="0" y="5" width="4" height="38" rx="2" fill="rgba(110,170,65,0.55)" />
          <ellipse cx="2" cy="5" rx="3" ry="5" fill="rgba(110,170,65,0.65)" />
        </g>

        {/* Flowers */}
        <g transform="translate(240, 125)" opacity="0.5">
          <circle cx="0" cy="-6" r="4" fill="#ffb6c1" />
          <circle cx="5" cy="-2" r="4" fill="#ffb6c1" />
          <circle cx="3" cy="4" r="4" fill="#ffb6c1" />
          <circle cx="-3" cy="4" r="4" fill="#ffb6c1" />
          <circle cx="-5" cy="-2" r="4" fill="#ffb6c1" />
          <circle cx="0" cy="0" r="3" fill="#ffd700" />
        </g>

        {/* "ВЕСНА" watermark */}
        <text x="200" y="230" textAnchor="middle" fill="rgba(100,200,80,0.06)" fontSize="60" fontWeight="900" fontFamily="serif">ВЕСНА</text>

        {/* Sparkles */}
        <text x="120" y="80" fill="rgba(255,220,100,0.3)" fontSize="18">✦</text>
        <text x="280" y="90" fill="rgba(255,220,100,0.2)" fontSize="14">✦</text>
        <text x="300" y="180" fill="rgba(255,220,100,0.15)" fontSize="12">✦</text>
      </>
    ),
  },

  'promo-biznes-lanch-skidka': {
    gradient: 'linear-gradient(135deg, #1a1400 0%, #2d2200 30%, #3d2f00 60%, #1a1400 100%)',
    elements: (
      <>
        {/* Price tag */}
        <g transform="translate(150, 80)">
          <rect x="0" y="0" width="100" height="50" rx="10" fill="rgba(255,200,40,0.2)" stroke="rgba(255,200,40,0.4)" strokeWidth="1.5" />
          <text x="50" y="30" textAnchor="middle" fill="rgba(255,200,40,0.9)" fontSize="20" fontWeight="bold" fontFamily="sans-serif">−20%</text>
          <circle cx="-5" cy="25" r="6" fill="#1a1400" stroke="rgba(255,200,40,0.4)" strokeWidth="1" />
        </g>

        {/* Clock */}
        <g transform="translate(200, 160)">
          <circle cx="0" cy="0" r="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,200,40,0.3)" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="0" y2="-18" stroke="rgba(255,200,40,0.6)" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="0" x2="12" y2="-8" stroke="rgba(255,200,40,0.5)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2" fill="rgba(255,200,40,0.7)" />
          {/* 12, 3, 6, 9 */}
          <text x="0" y="-20" textAnchor="middle" fill="rgba(255,200,40,0.3)" fontSize="6">12</text>
          <text x="22" y="3" textAnchor="middle" fill="rgba(255,200,40,0.3)" fontSize="6">3</text>
          <text x="0" y="26" textAnchor="middle" fill="rgba(255,200,40,0.3)" fontSize="6">6</text>
          <text x="-22" y="3" textAnchor="middle" fill="rgba(255,200,40,0.3)" fontSize="6">9</text>
        </g>

        {/* Time label */}
        <text x="200" y="210" textAnchor="middle" fill="rgba(255,200,40,0.4)" fontSize="13" fontWeight="600" fontFamily="sans-serif">12:00 – 15:00</text>

        {/* Fork & knife */}
        <g transform="translate(110, 140)" opacity="0.25">
          <rect x="0" y="0" width="3" height="40" rx="1.5" fill="#ffc828" />
          <rect x="-3" y="-5" width="9" height="12" rx="2" fill="none" stroke="#ffc828" strokeWidth="1.5" />
        </g>
        <g transform="translate(285, 140)" opacity="0.25">
          <rect x="0" y="0" width="3" height="40" rx="1.5" fill="#ffc828" />
          <path d="M-2 -5 L1.5 10 L5 -5" fill="none" stroke="#ffc828" strokeWidth="1.5" />
        </g>

        {/* Coins */}
        <circle cx="290" cy="90" r="12" fill="rgba(255,200,40,0.15)" stroke="rgba(255,200,40,0.3)" strokeWidth="1" />
        <text x="290" y="95" textAnchor="middle" fill="rgba(255,200,40,0.5)" fontSize="12">₽</text>
        <circle cx="305" cy="100" r="10" fill="rgba(255,200,40,0.1)" stroke="rgba(255,200,40,0.2)" strokeWidth="1" />
        <text x="305" y="104" textAnchor="middle" fill="rgba(255,200,40,0.4)" fontSize="10">₽</text>
      </>
    ),
  },

  'menu-rest-ai-poisk-zapuschen': {
    gradient: 'linear-gradient(135deg, #0a0a1e 0%, #12123a 30%, #1a1a50 60%, #0a0a1e 100%)',
    elements: (
      <>
        {/* Neural network nodes */}
        <circle cx="120" cy="100" r="8" fill="rgba(80,160,255,0.3)" stroke="rgba(80,160,255,0.5)" strokeWidth="1" />
        <circle cx="120" cy="150" r="8" fill="rgba(80,160,255,0.3)" stroke="rgba(80,160,255,0.5)" strokeWidth="1" />
        <circle cx="120" cy="200" r="8" fill="rgba(80,160,255,0.3)" stroke="rgba(80,160,255,0.5)" strokeWidth="1" />

        <circle cx="200" cy="120" r="10" fill="rgba(160,120,255,0.3)" stroke="rgba(160,120,255,0.5)" strokeWidth="1" />
        <circle cx="200" cy="180" r="10" fill="rgba(160,120,255,0.3)" stroke="rgba(160,120,255,0.5)" strokeWidth="1" />

        <circle cx="280" cy="150" r="12" fill="rgba(255,92,40,0.3)" stroke="rgba(255,92,40,0.5)" strokeWidth="1.5" />

        {/* Connections */}
        <line x1="128" y1="100" x2="190" y2="120" stroke="rgba(120,140,255,0.15)" strokeWidth="1" />
        <line x1="128" y1="100" x2="190" y2="180" stroke="rgba(120,140,255,0.1)" strokeWidth="1" />
        <line x1="128" y1="150" x2="190" y2="120" stroke="rgba(120,140,255,0.15)" strokeWidth="1" />
        <line x1="128" y1="150" x2="190" y2="180" stroke="rgba(120,140,255,0.15)" strokeWidth="1" />
        <line x1="128" y1="200" x2="190" y2="120" stroke="rgba(120,140,255,0.1)" strokeWidth="1" />
        <line x1="128" y1="200" x2="190" y2="180" stroke="rgba(120,140,255,0.15)" strokeWidth="1" />
        <line x1="210" y1="120" x2="268" y2="150" stroke="rgba(200,120,255,0.2)" strokeWidth="1.5" />
        <line x1="210" y1="180" x2="268" y2="150" stroke="rgba(200,120,255,0.2)" strokeWidth="1.5" />

        {/* AI text bubble */}
        <g transform="translate(155, 60)">
          <rect x="0" y="0" width="90" height="30" rx="15" fill="rgba(80,160,255,0.12)" stroke="rgba(80,160,255,0.3)" strokeWidth="1" />
          <text x="45" y="20" textAnchor="middle" fill="rgba(80,160,255,0.7)" fontSize="11" fontWeight="bold" fontFamily="sans-serif">.AI</text>
        </g>

        {/* Sparkle effect on output */}
        <g transform="translate(280, 150)">
          <line x1="-4" y1="0" x2="4" y2="0" stroke="rgba(255,92,40,0.5)" strokeWidth="1.5" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(255,92,40,0.5)" strokeWidth="1.5" />
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="rgba(255,92,40,0.3)" strokeWidth="1" />
          <line x1="3" y1="-3" x2="-3" y2="3" stroke="rgba(255,92,40,0.3)" strokeWidth="1" />
        </g>

        {/* Floating search terms */}
        <text x="90" y="80" fill="rgba(255,255,255,0.06)" fontSize="9" fontFamily="sans-serif">тихий</text>
        <text x="85" y="175" fill="rgba(255,255,255,0.06)" fontSize="9" fontFamily="sans-serif">веранда</text>
        <text x="80" y="225" fill="rgba(255,255,255,0.06)" fontSize="9" fontFamily="sans-serif">до 2500₽</text>

        {/* Pulse rings */}
        <circle cx="280" cy="150" r="20" fill="none" stroke="rgba(255,92,40,0.1)" strokeWidth="1" />
        <circle cx="280" cy="150" r="30" fill="none" stroke="rgba(255,92,40,0.06)" strokeWidth="1" />
      </>
    ),
  },
};

export function ArticleCover({ slug, title, className = '' }: ArticleCoverProps) {
  const cover = COVERS[slug];

  if (!cover) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ background: 'var(--bg3)' }}>
        <span className="text-5xl opacity-30">📰</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: cover.gradient }}>
      <svg viewBox="0 0 400 260" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {cover.elements}
      </svg>
    </div>
  );
}
