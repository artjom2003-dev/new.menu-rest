'use client';

import { useEffect, useState } from 'react';

interface RadarChartProps {
  axes: Record<string, number>;
  size?: number;
  color?: string;
}

const AXIS_LABELS: Record<string, string> = {
  spicy: 'Острота',
  sweet: 'Сладкое',
  sour: 'Кислое',
  bitter: 'Горечь',
  umami: 'Умами',
  salty: 'Солёное',
  exotic: 'Экзотика',
  traditional: 'Традиции',
  healthy: 'ЗОЖ',
  indulgent: 'Удовольствие',
  adventurous: 'Авантюризм',
  comfort: 'Комфорт',
};

export default function RadarChart({ axes, size = 280, color }: RadarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimProgress(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const keys = Object.keys(axes);
  const n = keys.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const angleStep = (2 * Math.PI) / n;
  const offset = -Math.PI / 2;

  const accentColor = color || 'var(--accent)';

  function polarToXY(index: number, value: number): [number, number] {
    const angle = offset + index * angleStep;
    const r = (value / 10) * maxR * animProgress;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const gridLevels = [2.5, 5, 7.5, 10];

  const dataPoints = keys.map((k, i) => polarToXY(i, axes[k] ?? 0));
  const polygon = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Grid circles */}
        {gridLevels.map((level) => {
          const r = (level / 10) * maxR;
          return (
            <circle
              key={level}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--text)"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes */}
        {keys.map((_, i) => {
          const angle = offset + i * angleStep;
          const x2 = cx + maxR * Math.cos(angle);
          const y2 = cy + maxR * Math.sin(angle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="var(--text)"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          );
        })}

        {/* Filled polygon */}
        <polygon
          points={polygon}
          fill={accentColor}
          fillOpacity={0.18}
          stroke={accentColor}
          strokeWidth={2}
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 8px ${accentColor})` }}
        />

        {/* Data points */}
        {dataPoints.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.5}
            fill={accentColor}
            stroke="var(--bg)"
            strokeWidth={1.5}
          />
        ))}

        {/* Labels */}
        {keys.map((key, i) => {
          const angle = offset + i * angleStep;
          const labelR = maxR + 22;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const label = AXIS_LABELS[key] || key;

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <text
              key={key}
              x={lx}
              y={ly}
              textAnchor={textAnchor}
              dominantBaseline="central"
              style={{
                fontSize: 10,
                fontWeight: 600,
                fill: 'var(--text2)',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
