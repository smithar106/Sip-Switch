import { createClient, type Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const sessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { await AsyncStorage.setItem(key, value); } catch { /* silent */ }
  },
  removeItem: async (key: string): Promise<void> => {
    try { await AsyncStorage.removeItem(key); } catch { /* silent */ }
  },
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function getSupabaseClient() {
  return supabase;
}

export function subscribeToAuthState(
  callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'TOKEN_REFRESHED', session: Session | null) => void
) {
  if (!supabase) return {
    unsubscribe: () => {},
  };

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event as any, session);
  });

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
}
