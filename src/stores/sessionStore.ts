import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArchetypeId } from '../types';
import { getUserId, getLocalId, isAuthReady, waitForAuth, isAuthenticated } from '../services/auth';

const VALID_ARCHETYPES: Set<string> = new Set([
  'bitter', 'carbonated', 'complex', 'dry', 'bold', 'light',
]);

interface SessionState {
  isPremium: boolean;
  hasOnboarded: boolean;
  archetypeId: ArchetypeId | null;
  trialStartDate: string | null;
  userId: string | null;
  localId: string | null;
  authReady: boolean;
  _hydrated: boolean;
  isAuthenticated: boolean;
  setIsPremium: (v: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setArchetypeId: (id: ArchetypeId) => void;
  setTrialStartDate: (d: string) => void;
  setUserId: (id: string | null) => void;
  setLocalId: (id: string | null) => void;
  setAuthReady: (v: boolean) => void;
  setIsAuthenticated: (v: boolean) => void;
  loadFromStorage: () => Promise<void>;
  loadFromAuth: () => Promise<void>;
  migrateLocalToRemote: (remoteUserId: string) => Promise<void>;
}

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch((err) => console.error('[sessionStore] write error:', err));
}

export const useSessionStore = create<SessionState>((set) => ({
  isPremium: false,
  hasOnboarded: false,
  archetypeId: null,
  trialStartDate: null,
  userId: null,
  localId: null,
  authReady: false,
  _hydrated: false,
  isAuthenticated: false,

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
  setUserId: (id) => set({ userId: id, isAuthenticated: Boolean(id) }),
  setLocalId: (id) => set({ localId: id, isAuthenticated: false }),
  setAuthReady: (v) => set({ authReady: v }),
  setIsAuthenticated: (v) => set({ isAuthenticated: v }),

  loadFromStorage: async () => {
    try {
      const [premium, onboarded, archetype, trial, localId] = await Promise.all([
        AsyncStorage.getItem('@ss_premium'),
        AsyncStorage.getItem('@ss_onboarded'),
        AsyncStorage.getItem('@ss_archetype'),
        AsyncStorage.getItem('@ss_trial_start'),
        AsyncStorage.getItem('@ss_local_id'),
      ]);
      const validArchetype = archetype && VALID_ARCHETYPES.has(archetype)
        ? (archetype as ArchetypeId)
        : null;
      set({
        isPremium: premium ? JSON.parse(premium) : false,
        hasOnboarded: onboarded ? JSON.parse(onboarded) : false,
        archetypeId: validArchetype,
        trialStartDate: trial,
        localId: localId || null,
        _hydrated: true,
        isAuthenticated: false,
      });
    } catch (err) {
      console.error('[sessionStore] load error:', err);
    }
  },

  loadFromAuth: async () => {
    const state = await waitForAuth();
    if (state?.mode === 'authenticated') {
      set({
        userId: state.userId,
        localId: null,
        authReady: true,
        isAuthenticated: true,
      });
    } else if (state?.mode === 'local_only') {
      set({
        userId: null,
        localId: state.localId,
        authReady: true,
        isAuthenticated: false,
      });
    } else if (state?.mode === 'auth_failed') {
      set({
        userId: null,
        localId: null,
        authReady: true,
        isAuthenticated: false,
      });
    }
  },

  migrateLocalToRemote: async (remoteUserId: string) => {
    const localId = getLocalId();
    if (localId) {
      await AsyncStorage.removeItem('@ss_local_id');
      set({ 
        localId: null, 
        userId: remoteUserId, 
        isAuthenticated: true 
      });
    }
  },
}));
