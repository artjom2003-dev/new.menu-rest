'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi, companionApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';

interface PublicProfile {
  id: number;
  name: string | null;
  avatarUrl: string | null;
  loyaltyLevel: 'bronze' | 'silver' | 'gold';
  loyaltyPoints: number;
  createdAt: string;
  bio?: string;
  age?: number;
  cityName?: string;
  favoriteCuisines?: string;
  favoriteDishes?: string;
  visitsCount: number;
}

const LEVEL_META: Record<string, { label: string; color: string; gradient: string }> = {
  bronze: { label: 'Бронза', color: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)' },
  silver: { label: 'Серебро', color: '#c0c0c0', gradient: 'linear-gradient(135deg, #c0c0c0, #808080)' },
  gold: { label: 'Золото', color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #daa520)' },
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn, user: me } = useAuthStore();
  const openChat = useChatStore(s => s.open);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [compStatus, setCompStatus] = useState<{ status: string; id: number | null; direction?: string }>({ status: 'none', id: null });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    userApi.getPublicProfile(id)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
    if (isLoggedIn) {
      companionApi.getStatus(id).then(r => setCompStatus(r.data)).catch(() => {});
    }
  }, [params.id, isLoggedIn]);

  const handleInvite = async () => {
    if (!profile) return;
    setInviting(true);
    try {
      await companionApi.invite(profile.id);
      setCompStatus({ status: 'pending', id: null, direction: 'sent' });
    } catch {}
    setInviting(false);
  };

  const handleAccept = async () => {
    if (!compStatus.id) return;
    try {
      await companionApi.accept(compStatus.id);
      setCompStatus({ ...compStatus, status: 'accepted' });
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="profile-loader" />
        <style>{`
          .profile-loader {
            width: 40px; height: 40px; border-radius: 50%;
            border: 3px solid var(--card-border); border-top-color: var(--accent);
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>?</div>
        <h2 style={{ color: 'var(--text)', fontSize: 20 }}>Пользователь не найден</h2>
        <button onClick={() => router.push('/loyalty')}
          style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          Назад к программе лояльности
        </button>
      </div>
    );
  }

  const level = LEVEL_META[profile.loyaltyLevel] || LEVEL_META.bronze;
  const initials = (profile.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });

  return (
    <>
      <style>{`
        .pub-profile-page {
          max-width: 600px; margin: 0 auto; padding: 40px 20px;
        }
        .pub-profile-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--text3); font-size: 14px; text-decoration: none;
          margin-bottom: 32px; cursor: pointer; border: none; background: none;
          transition: color 0.2s;
        }
        .pub-profile-back:hover { color: var(--accent); }
        .pub-profile-card {
          border-radius: 24px; overflow: hidden;
          border: 1px solid var(--card-border); background: var(--bg2);
        }
        .pub-profile-banner {
          height: 120px; position: relative;
        }
        .pub-profile-avatar {
          width: 96px; height: 96px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700; color: #fff;
          border: 4px solid var(--bg2);
          position: absolute; bottom: -48px; left: 50%; transform: translateX(-50%);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .pub-profile-body {
          padding: 60px 32px 32px; text-align: center;
        }
        .pub-profile-name {
          font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 8px;
        }
        .pub-profile-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
          margin-bottom: 24px;
        }
        .pub-profile-stats {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px;
        }
        .pub-profile-stat {
          padding: 20px; border-radius: 16px; background: var(--bg3);
        }
        .pub-profile-stat-value {
          font-size: 28px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums;
        }
        .pub-profile-stat-label {
          font-size: 12px; color: var(--text3); margin-top: 4px;
        }
      `}</style>
      <div className="pub-profile-page">
        <button className="pub-profile-back" onClick={() => router.push('/loyalty')}>
          &larr; Программа лояльности
        </button>
        <div className="pub-profile-card">
          <div className="pub-profile-banner" style={{ background: level.gradient }} >
            <div className="pub-profile-avatar" style={{ background: level.gradient }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : initials
              }
            </div>
          </div>
          <div className="pub-profile-body">
            <div className="pub-profile-name">{profile.name || 'Гурман'}</div>
            <div className="pub-profile-badge" style={{ background: `${level.color}22`, color: level.color }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: level.color, display: 'inline-block' }} />
              {level.label}
            </div>

            {/* Actions: invite to company + message */}
            {isLoggedIn && me?.id !== profile.id && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {compStatus.status === 'none' && (
                  <button onClick={handleInvite} disabled={inviting}
                    style={{ padding: '8px 18px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: inviting ? 0.6 : 1 }}>
                    🍽️ Пригласить в компанию
                  </button>
                )}
                {compStatus.status === 'pending' && compStatus.direction === 'sent' && (
                  <span style={{ padding: '8px 18px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, fontWeight: 500 }}>
                    Приглашение отправлено
                  </span>
                )}
                {compStatus.status === 'pending' && compStatus.direction === 'received' && (
                  <button onClick={handleAccept}
                    style={{ padding: '8px 18px', borderRadius: 12, border: 'none', background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Принять приглашение
                  </button>
                )}
                {compStatus.status === 'accepted' && (
                  <span style={{ padding: '8px 18px', borderRadius: 12, border: '1px solid rgba(20,184,166,0.2)', background: 'rgba(20,184,166,0.08)', color: 'var(--teal)', fontSize: 13, fontWeight: 600 }}>
                    В вашей компании
                  </span>
                )}
                <button onClick={() => openChat({ userId: profile.id })}
                  style={{ padding: '8px 18px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💬 Написать
                </button>
              </div>
            )}

            <div className="pub-profile-stats">
              <div className="pub-profile-stat">
                <div className="pub-profile-stat-value">{profile.loyaltyPoints.toLocaleString('ru-RU')}</div>
                <div className="pub-profile-stat-label">баллов</div>
              </div>
              <div className="pub-profile-stat">
                <div className="pub-profile-stat-value">{profile.visitsCount}</div>
                <div className="pub-profile-stat-label">посещений</div>
              </div>
              <div className="pub-profile-stat">
                <div className="pub-profile-stat-value" style={{ fontSize: 15 }}>{memberSince}</div>
                <div className="pub-profile-stat-label">участник с</div>
              </div>
            </div>

            {profile.bio && (
              <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 20, lineHeight: 1.6, textAlign: 'left' }}>{profile.bio}</p>
            )}

            {(profile.favoriteCuisines || profile.favoriteDishes) && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, textAlign: 'left' }}>
                {profile.favoriteCuisines && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Любимые кухни</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {profile.favoriteCuisines.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,92,40,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.15)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.favoriteDishes && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Любимые блюда</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {profile.favoriteDishes.split(',').map(d => d.trim()).filter(Boolean).map(d => (
                        <span key={d} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(20,184,166,0.08)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.15)' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
