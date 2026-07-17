import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArchetypeId } from '../types';

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 11);
  return `${ts}-${rand}`;
}

const VALID_ARCHETYPES: Set<string> = new Set([
  'bitter', 'carbonated', 'complex', 'dry', 'bold', 'light',
]);

interface SessionState {
  isPremium: boolean;
  hasOnboarded: boolean;
  archetypeId: ArchetypeId | null;
  trialStartDate: string | null;
  deviceId: string;
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
  deviceId: '',
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
      const [premium, onboarded, archetype, trial, didRaw] = await Promise.all([
        AsyncStorage.getItem('@ss_premium'),
        AsyncStorage.getItem('@ss_onboarded'),
        AsyncStorage.getItem('@ss_archetype'),
        AsyncStorage.getItem('@ss_trial_start'),
        AsyncStorage.getItem('@ss_device_id'),
      ]);
      let deviceId = didRaw ?? '';
      if (!deviceId) {
        deviceId = generateId();
        AsyncStorage.setItem('@ss_device_id', deviceId).catch(() => {});
      }
      const validArchetype = archetype && VALID_ARCHETYPES.has(archetype)
        ? (archetype as ArchetypeId)
        : null;
      set({
        isPremium: premium ? JSON.parse(premium) : false,
        hasOnboarded: onboarded ? JSON.parse(onboarded) : false,
        archetypeId: validArchetype,
        trialStartDate: trial,
        deviceId,
        _hydrated: true,
      });
    } catch (err) {
      console.error('[sessionStore] load error:', err);
    }
  },
}));
