import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

const AUTH_SESSION_KEY = '@ss_auth_session';
const AUTH_READY_KEY = '@ss_auth_ready';

let authInitialized = false;
let currentUserId: string | null = null;
let authInitPromise: Promise<string | null> | null = null;

export function getUserId(): string | null {
  return currentUserId;
}

export function isAuthReady(): boolean {
  return authInitialized;
}

export async function waitForAuth(timeoutMs = 10_000): Promise<string | null> {
  if (authInitialized) return currentUserId;
  if (!authInitPromise) return null;

  const result = await Promise.race([
    authInitPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
  return result;
}

export async function initializeAuth(): Promise<string | null> {
  if (authInitPromise) return authInitPromise;

  authInitPromise = (async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.log('[auth] Supabase not configured — using local-only mode');
        const localId = await getOrCreateLocalId();
        currentUserId = localId;
        authInitialized = true;
        return currentUserId;
      }

      const savedSession = await restoreSession();
      if (savedSession?.user) {
        currentUserId = savedSession.user.id;
        supabase!.auth.setSession(savedSession);
        authInitialized = true;
        await AsyncStorage.setItem(AUTH_READY_KEY, 'true');
        return currentUserId;
      }

      const { data, error } = await supabase!.auth.signInAnonymously();
      if (error) {
        console.error('[auth] Anonymous sign-in failed:', error.message);
        const localId = await getOrCreateLocalId();
        currentUserId = localId;
        authInitialized = true;
        return currentUserId;
      }

      if (data.session) {
        await persistSession(data.session);
        currentUserId = data.session.user.id;
      }

      authInitialized = true;
      await AsyncStorage.setItem(AUTH_READY_KEY, 'true');
      return currentUserId;
    } catch (err) {
      console.error('[auth] Initialization error:', err);
      const localId = await getOrCreateLocalId();
      currentUserId = localId;
      authInitialized = true;
      return currentUserId;
    }
  })();

  return authInitPromise;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase!.auth.signOut();
  } catch (err) {
    console.error('[auth] signOut error:', err);
  }
  currentUserId = null;
  authInitialized = false;
  authInitPromise = null;
  await AsyncStorage.multiRemove([AUTH_SESSION_KEY, AUTH_READY_KEY]);
}

async function getOrCreateLocalId(): Promise<string> {
  const existing = await AsyncStorage.getItem('@ss_device_id');
  if (existing) return existing;

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
  await AsyncStorage.setItem('@ss_device_id', id);
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

export async function refreshSession(): Promise<string | null> {
  if (!isSupabaseConfigured()) return currentUserId;
  try {
    const { data, error } = await supabase!.auth.refreshSession();
    if (error) {
      console.error('[auth] refreshSession failed:', error.message);
      return currentUserId;
    }
    if (data.session) {
      await persistSession(data.session);
      currentUserId = data.session.user.id;
    }
    return currentUserId;
  } catch (err) {
    console.error('[auth] refreshSession error:', err);
    return currentUserId;
  }
}

export function onAuthStateChange(callback: (userId: string | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    const check = setInterval(() => {
      if (authInitialized) {
        clearInterval(check);
        callback(currentUserId);
      }
    }, 100);
    return () => clearInterval(check);
  }

  const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user?.id ?? null;
    callback(currentUserId);
  });
  return () => subscription.unsubscribe();
}
