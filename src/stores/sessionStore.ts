import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArchetypeId } from '../types';

interface SessionState {
  isPremium: boolean;
  hasOnboarded: boolean;
  archetypeId: ArchetypeId | null;
  trialStartDate: string | null;
  setIsPremium: (v: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setArchetypeId: (id: ArchetypeId) => void;
  setTrialStartDate: (d: string) => void;
  loadFromStorage: () => Promise<void>;
}

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch(() => {});
}

export const useSessionStore = create<SessionState>((set) => ({
  isPremium: false,
  hasOnboarded: false,
  archetypeId: null,
  trialStartDate: null,
  setIsPremium: (v) => {
    set({ isPremium: v });
    safeSet('@ss_premium', JSON.stringify(v));
  },
  setHasOnboarded: (v) => {
    set({ hasOnboarded: v });
    safeSet('@ss_onboarded', JSON.stringify(v));
  },
  setArchetypeId: (id) => {
    set({ archetypeId: id });
    safeSet('@ss_archetype', id);
  },
  setTrialStartDate: (d) => {
    set({ trialStartDate: d });
    safeSet('@ss_trial_start', d);
  },
  loadFromStorage: async () => {
    try {
      const [premium, onboarded, archetype, trial] = await Promise.all([
        AsyncStorage.getItem('@ss_premium'),
        AsyncStorage.getItem('@ss_onboarded'),
        AsyncStorage.getItem('@ss_archetype'),
        AsyncStorage.getItem('@ss_trial_start'),
      ]);
      set({
        isPremium: premium ? JSON.parse(premium) : false,
        hasOnboarded: onboarded ? JSON.parse(onboarded) : false,
        archetypeId: archetype as ArchetypeId | null,
        trialStartDate: trial,
      });
    } catch {
      // Corrupted storage — use defaults
    }
  },
}));
