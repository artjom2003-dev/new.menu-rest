'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userApi } from '@/lib/api';

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
  variant?: 'invite' | 'dinner';
  dinnerText?: string;
}

export function ReferralModal({ open, onClose, variant = 'invite', dinnerText }: ReferralModalProps) {
  const { user, updateUser } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Подгружаем referralCode при открытии, если его нет в store
  useEffect(() => {
    if (open && user && !user.referralCode) {
      userApi.getMe().then(r => {
        if (r.data?.referralCode) {
          updateUser({ referralCode: r.data.referralCode });
        }
      }).catch(() => {});
    }
  }, [open, user, updateUser]);

  if (!open || !user) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const code = user.referralCode || '';
  const referralLink = code ? `${baseUrl}/?ref=${code}` : `${baseUrl}`;

  const handleCopy = async () => {
    const text = dinnerText
      ? `${dinnerText}\n\n${referralLink}`
      : referralLink;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDinner = variant === 'dinner';

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="border rounded-[22px] p-8 max-w-[440px] w-full relative"
        style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer border transition-all"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          ✕
        </button>

        {/* Icon */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full text-[36px]"
            style={{
              background: isDinner
                ? 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(59,130,246,0.1))'
                : 'linear-gradient(135deg, rgba(255,92,40,0.15), rgba(255,140,66,0.1))',
            }}>
            {isDinner ? '🍽️' : '🎁'}
          </div>
        </div>

        {/* Title */}
        <h2 className="font-serif text-[24px] font-black text-[var(--text)] text-center mb-2">
          {isDinner ? 'Вкуснее вместе!' : 'Пригласить друга'}
        </h2>

        {/* Subtitle */}
        <p className="text-[13px] text-[var(--text3)] text-center mb-6 leading-relaxed">
          {isDinner
            ? 'Еда вкуснее в хорошей компании! Поделитесь ссылкой с другом — и вы оба получите бонусные баллы при регистрации'
            : 'Поделитесь ссылкой с другом — при регистрации вы оба получите бонусные баллы'}
        </p>

        {/* Bonus highlight */}
        <div className="rounded-[14px] p-4 mb-5 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,140,66,0.06))',
            border: '1px solid rgba(255,215,0,0.2)',
          }}>
          <span className="text-[28px]">✨</span>
          <div>
            <div className="text-[14px] font-bold text-[var(--text)]">+50 баллов каждому</div>
            <div className="text-[12px] text-[var(--text3)]">Вам и вашему другу при регистрации по ссылке</div>
          </div>
        </div>

        {/* Link field */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 px-4 py-3 rounded-[12px] text-[13px] font-mono truncate border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)', color: 'var(--text2)' }}>
            {code ? referralLink : 'Загрузка...'}
          </div>
          <button
            onClick={handleCopy}
            disabled={!code}
            className="px-5 py-3 rounded-[12px] text-[13px] font-semibold text-white border-none cursor-pointer transition-all flex-shrink-0 disabled:opacity-50"
            style={{
              background: copied ? 'var(--teal)' : 'var(--accent)',
              boxShadow: copied ? '0 0 20px rgba(45,212,191,0.3)' : '0 0 20px var(--accent-glow)',
            }}>
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>

        {/* Share via native */}
        {typeof navigator !== 'undefined' && 'share' in navigator && code && (
          <button
            onClick={() => {
              const shareText = isDinner
                ? `${dinnerText || 'Смотри какой план ужина!'}\n\nРегистрируйся и получи 50 бонусных баллов:`
                : 'Присоединяйся к MenuRest! Регистрируйся и получи 50 бонусных баллов:';
              navigator.share({
                title: isDinner ? 'План ужина — MenuRest' : 'Приглашение в MenuRest',
                text: shareText,
                url: referralLink,
              }).catch(() => {});
            }}
            className="w-full py-3 rounded-[12px] text-[13px] font-semibold border cursor-pointer transition-all"
            style={{ color: 'var(--text2)', borderColor: 'var(--card-border)', background: 'var(--bg3)' }}>
            Поделиться другим способом
          </button>
        )}

        {/* Your code */}
        {code && (
          <div className="text-center mt-5">
            <span className="text-[11px] text-[var(--text4)]">Ваш код: </span>
            <span className="text-[12px] font-bold text-[var(--accent)] tracking-wider">{code}</span>
          </div>
        )}
      </div>
    </div>
  );
}
