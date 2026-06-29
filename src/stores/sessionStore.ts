import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionState {
  isPremium: boolean;
  hasOnboarded: boolean;
  archetypeId: string | null;
  trialStartDate: string | null;
  setIsPremium: (v: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setArchetypeId: (id: string) => void;
  setTrialStartDate: (d: string) => void;
  loadFromStorage: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  isPremium: false,
  hasOnboarded: false,
  archetypeId: null,
  trialStartDate: null,
  setIsPremium: (v) => {
    set({ isPremium: v });
    AsyncStorage.setItem('@ss_premium', JSON.stringify(v));
  },
  setHasOnboarded: (v) => {
    set({ hasOnboarded: v });
    AsyncStorage.setItem('@ss_onboarded', JSON.stringify(v));
  },
  setArchetypeId: (id) => {
    set({ archetypeId: id });
    AsyncStorage.setItem('@ss_archetype', id);
  },
  setTrialStartDate: (d) => {
    set({ trialStartDate: d });
    AsyncStorage.setItem('@ss_trial_start', d);
  },
  loadFromStorage: async () => {
    const [premium, onboarded, archetype, trial] = await Promise.all([
      AsyncStorage.getItem('@ss_premium'),
      AsyncStorage.getItem('@ss_onboarded'),
      AsyncStorage.getItem('@ss_archetype'),
      AsyncStorage.getItem('@ss_trial_start'),
    ]);
    set({
      isPremium: premium ? JSON.parse(premium) : false,
      hasOnboarded: onboarded ? JSON.parse(onboarded) : false,
      archetypeId: archetype,
      trialStartDate: trial,
    });
  },
}));
