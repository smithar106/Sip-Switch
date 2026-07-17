import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArchetypeId } from '../types';

const VALID_ARCHETYPES: Set<string> = new Set([
  'bitter', 'carbonated', 'complex', 'dry', 'bold', 'light',
]);

interface SessionState {
  isPremium: boolean;
  hasOnboarded: boolean;
  archetypeId: ArchetypeId | null;
  trialStartDate: string | null;
  _hydrated: boolean;
  setIsPremium: (v: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setArchetypeId: (id: ArchetypeId) => void;
  setTrialStartDate: (d: string) => void;
  loadFromStorage: () => Promise<void>;
}

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch((err) => console.error('[sessionStore] write error:', err));
}

export const useSessionStore = create<SessionState>((set) => ({
  isPremium: false,
  hasOnboarded: false,
  archetypeId: null,
  trialStartDate: null,
  _hydrated: false,
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
      const validArchetype = archetype && VALID_ARCHETYPES.has(archetype)
        ? (archetype as ArchetypeId)
        : null;
      set({
        isPremium: premium ? JSON.parse(premium) : false,
        hasOnboarded: onboarded ? JSON.parse(onboarded) : false,
        archetypeId: validArchetype,
        trialStartDate: trial,
        _hydrated: true,
      });
    } catch (err) {
      console.error('[sessionStore] load error:', err);
    }
  },
}));
