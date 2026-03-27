import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GastroProfile {
  archetype: string;
  archetypeEmoji: string;
  archetypeDescription: string;
  axes: Record<string, number>;
  dietaryTags: string[];
  topAxes: string[];
}

interface GastroState {
  quizStep: number;
  answers: Record<number, number[]>;
  profile: GastroProfile | null;
  isSubmitting: boolean;

  setAnswer: (questionIndex: number, optionIds: number[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  setProfile: (profile: GastroProfile | null) => void;
  setSubmitting: (v: boolean) => void;
}

export const useGastroStore = create<GastroState>()(
  persist(
    (set) => ({
      quizStep: 0,
      answers: {},
      profile: null,
      isSubmitting: false,

      setAnswer: (questionIndex, optionIds) =>
        set((s) => ({ answers: { ...s.answers, [questionIndex]: optionIds } })),

      nextStep: () => set((s) => ({ quizStep: Math.min(s.quizStep + 1, 14) })),
      prevStep: () => set((s) => ({ quizStep: Math.max(s.quizStep - 1, 0) })),

      reset: () => set({ quizStep: 0, answers: {}, profile: null, isSubmitting: false }),

      setProfile: (profile) => set({ profile }),
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
    }),
    {
      name: 'menurest-gastro',
      partialize: (state) => ({
        answers: state.answers,
        profile: state.profile,
        quizStep: state.quizStep,
      }),
    },
  ),
);
