import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function AuthScreen() {
  const [pin, setPin] = useState('');
  const { login, loading, error } = useAuthStore();

  const handleDigit = (d: string) => {
    if (pin.length < 6) setPin(pin + d);
  };
  const handleDelete = () => setPin(pin.slice(0, -1));
  const handleSubmit = async () => {
    if (pin.length >= 4) await login(pin);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-6">👨‍🍳</div>
      <h1 className="text-2xl font-bold text-white mb-1">Menu<span className="text-[#E8491D]">Rest</span></h1>
      <p className="text-[#A0A0B0] text-sm mb-8">Введите PIN-код</p>

      {/* PIN display */}
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'bg-[#E8491D] scale-110' : 'bg-[#2A2A4A]'}`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
          <button
            key={key || 'empty'}
            disabled={!key || loading}
            onClick={() => key === '⌫' ? handleDelete() : key ? handleDigit(key) : null}
            className={`h-14 rounded-2xl text-xl font-semibold transition-all ${
              !key ? 'invisible' :
              key === '⌫' ? 'bg-[#1E2A47] text-[#A0A0B0] hover:bg-[#2A2A4A]' :
              'bg-[#16213E] text-white hover:bg-[#1E2A47] active:scale-95'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={pin.length < 4 || loading}
        className="mt-6 w-64 py-3.5 rounded-2xl bg-[#E8491D] text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D43D15] active:scale-[0.98] transition-all"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>

      <p className="text-[#6C6C80] text-xs mt-4">Демо PIN: 1234</p>
    </div>
  );
}
