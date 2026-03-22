import { create } from 'zustand';

interface ChatState {
  isOpen: boolean;
  conversationId: number | null;
  targetUserId: number | null;
  open: (opts?: { conversationId?: number; userId?: number }) => void;
  close: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  conversationId: null,
  targetUserId: null,
  open: (opts) => set({
    isOpen: true,
    conversationId: opts?.conversationId ?? null,
    targetUserId: opts?.userId ?? null,
  }),
  close: () => set({ isOpen: false, conversationId: null, targetUserId: null }),
}));
