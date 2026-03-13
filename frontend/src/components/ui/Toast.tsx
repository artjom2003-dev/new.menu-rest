'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toast: (text: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = ++nextId;
    setMessages(prev => [...prev, { id, text, type }]);
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {messages.map(msg => (
          <div
            key={msg.id}
            className="pointer-events-auto px-5 py-3 rounded-[14px] text-[13px] font-medium shadow-lg border animate-[slideUp_0.3s_ease-out]"
            style={{
              background: msg.type === 'error' ? 'rgba(239,68,68,0.15)' : msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'var(--bg3)',
              borderColor: msg.type === 'error' ? 'rgba(239,68,68,0.3)' : msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'var(--card-border)',
              color: msg.type === 'error' ? '#f87171' : msg.type === 'success' ? '#34d399' : 'var(--text)',
              backdropFilter: 'blur(16px)',
            }}
            onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}>
            {msg.type === 'error' ? '✕ ' : msg.type === 'success' ? '✓ ' : ''}{msg.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
