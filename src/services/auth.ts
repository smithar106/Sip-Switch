import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

const AUTH_SESSION_KEY = '@ss_auth_session';
const AUTH_READY_KEY = '@ss_auth_ready';
const LOCAL_ID_KEY = '@ss_local_id';

export type AuthError = {
  code: string;
  message: string;
};

export type IdentityState =
  | {
      mode: 'authenticated';
      userId: string;
      session: Session;
    }
  | {
      mode: 'local_only';
      localId: string;
    }
  | {
      mode: 'auth_failed';
      error: AuthError;
    };

let authInitialized = false;
let currentIdentity: IdentityState | null = null;
let authInitPromise: Promise<IdentityState | null> | null = null;
let isSyncQueuePaused: boolean = false;

export function getUserId(): string | null {
  if (currentIdentity?.mode === 'authenticated') return currentIdentity.userId;
  if (currentIdentity?.mode === 'local_only') return null;
  return null;
}

export function getLocalId(): string | null {
  return currentIdentity?.mode === 'local_only' ? currentIdentity.localId : null;
}

export function getIdentityState(): IdentityState | null {
  return currentIdentity;
}

export function isAuthReady(): boolean {
  return authInitialized;
}

export function isAuthenticated(): boolean {
  return currentIdentity?.mode === 'authenticated';
}

export function isSyncQueuePaused(): boolean {
  return isSyncQueuePaused;
}

export async function pauseSyncQueue(): Promise<void> {
  if (!isSyncQueuePaused) {
    isSyncQueuePaused = true;
    console.log('[auth] Sync queue paused - no authenticated user');
  }
}

export async function resumeSyncQueue(): Promise<void> {
  if (isSyncQueuePaused) {
    isSyncQueuePaused = false;
    console.log('[auth] Sync queue resumed');
  }
}

export async function waitForAuth(timeoutMs = 10_000): Promise<IdentityState | null> {
  if (authInitialized) return currentIdentity;
  if (!authInitPromise) return null;

  const result = await Promise.race([
    authInitPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
  return result;
}

export async function initializeAuth(): Promise<IdentityState | null> {
  if (authInitPromise) return authInitPromise;

  authInitPromise = (async (): Promise<IdentityState | null> => {
    try {
      if (!isSupabaseConfigured()) {
        console.log('[auth] Supabase not configured — using local-only mode');
        const localId = await getOrCreateLocalId();
        currentIdentity = {
          mode: 'local_only',
          localId,
        };
        authInitialized = true;
        await pauseSyncQueue();
        await AsyncStorage.setItem(AUTH_READY_KEY, 'true');
        return currentIdentity;
      }

      const savedSession = await restoreSession();
      if (savedSession?.user) {
        const identity: IdentityState = {
          mode: 'authenticated',
          userId: savedSession.user.id,
          session: savedSession,
        };
        currentIdentity = identity;
        supabase!.auth.setSession(savedSession);
        authInitialized = true;
        await resumeSyncQueue();
        await AsyncStorage.setItem(AUTH_READY_KEY, 'true');
        return identity;
      }

      const { data, error } = await supabase!.auth.signInAnonymously();
      if (error) {
        console.error('[auth] Anonymous sign-in failed:', error.message);
        const localId = await getOrCreateLocalId();
        currentIdentity = {
          mode: 'auth_failed',
          error: {
            code: error.code || 'sign_in_failed',
            message: error.message,
          },
        };
        authInitialized = true;
        await pauseSyncQueue();
        return currentIdentity;
      }

      if (data.session) {
        await persistSession(data.session);
        currentIdentity = {
          mode: 'authenticated',
          userId: data.session.user.id,
          session: data.session,
        };
      } else {
        currentIdentity = {
          mode: 'auth_failed',
          error: {
            code: 'no_session',
            message: 'No session returned from signInAnonymously',
          },
        };
      }

      authInitialized = true;
      if (currentIdentity.mode === 'authenticated') {
        await resumeSyncQueue();
      }
      await AsyncStorage.setItem(AUTH_READY_KEY, 'true');
      return currentIdentity;
    } catch (err) {
      console.error('[auth] Initialization error:', err);
      const localId = await getOrCreateLocalId();
      currentIdentity = {
        mode: 'auth_failed',
        error: {
          code: 'initialization_error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      };
      authInitialized = true;
      await pauseSyncQueue();
      return currentIdentity;
    }
  })();

  return authInitPromise;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    currentIdentity = {
      mode: 'local_only',
      localId: await getOrCreateLocalId(),
    };
    authInitialized = true;
    await resumeSyncQueue();
    return;
  }

  try {
    await supabase!.auth.signOut();
    currentIdentity = null;
    authInitialized = false;
    authInitPromise = null;
    await pauseSyncQueue();
  } catch (err) {
    console.error('[auth] signOut error:', err);
  } finally {
    await AsyncStorage.multiRemove([AUTH_SESSION_KEY, AUTH_READY_KEY]);
  }
}

async function getOrCreateLocalId(): Promise<string> {
  const existing = await AsyncStorage.getItem(LOCAL_ID_KEY);
  if (existing) return existing;

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
  await AsyncStorage.setItem(LOCAL_ID_KEY, id);
  return id;
}

async function restoreSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function persistSession(session: Session): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('[auth] persistSession error:', err);
  }
}

export async function refreshSession(): Promise<IdentityState | null> {
  if (!isSupabaseConfigured()) {
    return currentIdentity;
  }

  try {
    const { data, error } = await supabase!.auth.refreshSession();
    if (error) {
      console.error('[auth] refreshSession failed:', error.message);
      return currentIdentity;
    }

    if (data.session) {
      await persistSession(data.session);
      currentIdentity = {
        mode: 'authenticated',
        userId: data.session.user.id,
        session: data.session,
      };
    }

    return currentIdentity;
  } catch (err) {
    console.error('[auth] refreshSession error:', err);
    return currentIdentity;
  }
}

export function onAuthStateChange(callback: (identity: IdentityState | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    const check = setInterval(() => {
      if (authInitialized) {
        clearInterval(check);
        callback(currentIdentity);
      }
    }, 100);
    return () => clearInterval(check);
  }

  const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      currentIdentity = {
        mode: 'authenticated',
        userId: session.user.id,
        session,
      };
    } else {
      currentIdentity = null;
    }
    callback(currentIdentity);
  });
  return () => subscription.unsubscribe();
}

export async function migrateLocalIdToRemote(localId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    console.log('[auth] Attempting to migrate local ID to remote:', localId.substring(0, 8) + '...');
    
    const { data, error } = await supabase!.auth.admin.createUser({
      email: `${localId}@local.sip-switch.app`,
    });
    
    if (error) {
      console.error('[auth] Migration failed:', error.message);
      return;
    }
    
    if (data.user) {
      currentIdentity = {
        mode: 'authenticated',
        userId: data.user.id,
        session: { user: data.user, access_token: '', refresh_token: '' } as Session,
      };
      await persistSession(currentIdentity.session);
      await resumeSyncQueue();
      console.log('[auth] Successfully migrated local ID to remote user ID:', data.user.id.substring(0, 8) + '...');
    }
  } catch (err) {
    console.error('[auth] Migration exception:', err);
  }
}
