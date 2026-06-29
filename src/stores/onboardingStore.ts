import { create } from 'zustand';
import type { OnboardingAnswers } from '../types';

interface OnboardingState {
  answers: OnboardingAnswers;
  currentStep: number;
  setAnswer: (key: keyof OnboardingAnswers, value: string) => void;
  nextStep: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: {},
  currentStep: 0,
  setAnswer: (key, value) =>
    set((s) => ({ answers: { ...s.answers, [key]: value } })),
  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  reset: () => set({ answers: {}, currentStep: 0 }),
}));
