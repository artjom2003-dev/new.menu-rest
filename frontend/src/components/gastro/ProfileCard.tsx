'use client';

import Link from 'next/link';
import RadarChart from './RadarChart';
import type { GastroProfile } from '@/stores/gastro.store';

interface ProfileCardProps {
  profile: GastroProfile;
  compact?: boolean;
}

export default function ProfileCard({ profile, compact }: ProfileCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--card-border)',
        borderRadius: 20,
        padding: compact ? 20 : 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'var(--accent)',
          opacity: 0.06,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span style={{ fontSize: 40 }}>{profile.archetypeEmoji}</span>
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {profile.archetype}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              margin: '4px 0 0',
              lineHeight: 1.4,
            }}
          >
            {profile.archetypeDescription}
          </p>
        </div>
      </div>

      {/* Radar */}
      <div className="flex justify-center my-4">
        <RadarChart axes={profile.axes} size={compact ? 240 : 280} />
      </div>

      {/* Dietary tags */}
      {profile.dietaryTags && profile.dietaryTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {profile.dietaryTags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(255,92,40,0.08)',
                color: 'var(--accent)',
                border: '1px solid rgba(255,92,40,0.15)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Top axes tags */}
      {profile.topAxes && profile.topAxes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {profile.topAxes.map((axis) => (
            <span
              key={axis}
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(99,102,241,0.08)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.15)',
              }}
            >
              {axis}
            </span>
          ))}
        </div>
      )}

      {/* Retake button */}
      <Link
        href="/quiz"
        className="flex items-center justify-center gap-2 mt-5 w-full"
        style={{
          padding: '12px 20px',
          borderRadius: 14,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent)',
          background: 'rgba(255,92,40,0.08)',
          border: '1px solid rgba(255,92,40,0.18)',
          textDecoration: 'none',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,92,40,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,92,40,0.08)';
        }}
      >
        🔄 Перепройти квиз
      </Link>
    </div>
  );
}
