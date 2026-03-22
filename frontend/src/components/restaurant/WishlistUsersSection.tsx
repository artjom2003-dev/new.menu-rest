'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { StartChatButton } from '@/components/chat/StartChatButton';

interface WishlistUser {
  id: number;
  name: string | null;
  avatarUrl: string | null;
  loyaltyLevel: string;
}

const LEVEL_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

function pluralUsers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} человек хочет`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} человека хотят`;
  return `${n} человек хотят`;
}

function Avatar({ user: u, size = 28 }: { user: WishlistUser; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: u.avatarUrl ? 'transparent' : 'var(--bg2)',
        border: `2px solid ${LEVEL_COLORS[u.loyaltyLevel] || LEVEL_COLORS.bronze}`,
        fontSize: size * 0.5,
      }}
    >
      {u.avatarUrl ? (
        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
      ) : '👤'}
    </div>
  );
}

export function WishlistUsersSection({ restaurantId }: { restaurantId: number }) {
  const { isLoggedIn, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<WishlistUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userApi.getWishlistUsers(restaurantId)
      .then(r => setUsers(r.data || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [restaurantId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!loaded || users.length === 0) return null;

  const previewUsers = users.slice(0, 4);
  const shownUsers = users.slice(0, visibleCount);

  return (
    <div className="mt-8 relative" ref={dropdownRef}>
      {/* Compact trigger bar */}
      <button
        onClick={() => { setOpen(!open); setVisibleCount(10); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] border cursor-pointer transition-all"
        style={{
          background: open ? 'rgba(20,184,166,0.06)' : 'var(--bg2)',
          borderColor: open ? 'rgba(20,184,166,0.3)' : 'var(--card-border)',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'rgba(20,184,166,0.25)';
            e.currentTarget.style.background = 'rgba(20,184,166,0.03)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--card-border)';
            e.currentTarget.style.background = 'var(--bg2)';
          }
        }}
      >
        {/* Stacked avatars */}
        <div className="flex items-center" style={{ marginRight: previewUsers.length > 1 ? (previewUsers.length - 1) * 6 : 0 }}>
          {previewUsers.map((u, i) => (
            <div key={u.id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: previewUsers.length - i, position: 'relative' }}>
              <Avatar user={u} size={28} />
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-[var(--text)]">
            Хотят сходить
          </span>
          <span className="text-[12px] text-[var(--text3)] ml-2">
            {pluralUsers(users.length)}
          </span>
        </div>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 rounded-[16px] border overflow-hidden"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--card-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            maxHeight: 360,
            overflowY: 'auto',
          }}
        >
          <div className="p-2">
            {shownUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Link href={`/profile/${u.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 no-underline">
                  <Avatar user={u} size={32} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-[var(--text)] truncate block">
                      {u.name || 'Гость'}
                    </span>
                    <span className="text-[11px] capitalize" style={{ color: LEVEL_COLORS[u.loyaltyLevel] || LEVEL_COLORS.bronze }}>
                      {u.loyaltyLevel}
                    </span>
                  </div>
                </Link>
                {isLoggedIn && currentUser?.id !== u.id && (
                  <StartChatButton userId={u.id} userName={u.name || 'Гость'}  />
                )}
              </div>
            ))}
          </div>

          {/* Show more */}
          {visibleCount < users.length && (
            <button
              onClick={(e) => { e.stopPropagation(); setVisibleCount(prev => prev + 20); }}
              className="w-full py-2.5 text-[12px] font-semibold border-t cursor-pointer transition-all"
              style={{
                background: 'transparent',
                borderColor: 'var(--card-border)',
                color: 'var(--teal)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,184,166,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Показать ещё ({users.length - visibleCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
