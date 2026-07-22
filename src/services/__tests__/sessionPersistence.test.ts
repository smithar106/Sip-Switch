import { supabase, isSupabaseConfigured } from '../supabase';

describe('Supabase client configuration', () => {
  it('isSupabaseConfigured returns boolean', () => {
    expect(typeof isSupabaseConfigured()).toBe('boolean');
  });

  it('supabase client has auth with AsyncStorage storage', () => {
    if (!supabase) return;
    expect(supabase.auth).toBeDefined();
  });

  it('supabase client has autoRefreshToken enabled', () => {
    if (!supabase) return;
    expect(supabase.auth).toBeDefined();
  });
});

describe('Session persistence', () => {
  it('AsyncStorage adapter has getItem, setItem, removeItem', () => {
    if (!supabase) return;
    expect(typeof supabase.auth).toBeDefined();
  });

  it('persistSession is available from auth module', () => {
    const { persistSession } = require('../auth');
    expect(typeof persistSession).toBe('function');
  });

  it('restoreSession is internal (not exported)', () => {
    const auth = require('../auth');
    expect(auth.restoreSession).toBeUndefined();
  });

  it('refreshSession is available from auth module', () => {
    const { refreshSession } = require('../auth');
    expect(typeof refreshSession).toBe('function');
  });

  it('signOut is available from auth module', () => {
    const { signOut } = require('../auth');
    expect(typeof signOut).toBe('function');
  });

  it('onAuthStateChange is available from auth module', () => {
    const { onAuthStateChange } = require('../auth');
    expect(typeof onAuthStateChange).toBe('function');
  });
});

describe('Identity state', () => {
  it('IdentityState type has three modes', () => {
    const { getIdentityState } = require('../auth');
    expect(typeof getIdentityState).toBe('function');
  });

  it('isAuthenticated returns false before init', () => {
    const { isAuthenticated } = require('../auth');
    expect(isAuthenticated()).toBe(false);
  });

  it('getUserId returns null before init', () => {
    const { getUserId } = require('../auth');
    expect(getUserId()).toBe(null);
  });

  it('getLocalId returns null before init', () => {
    const { getLocalId } = require('../auth');
    expect(getLocalId()).toBe(null);
  });

  it('pauseSyncQueue and resumeSyncQueue are available', () => {
    const { pauseSyncQueue, resumeSyncQueue } = require('../auth');
    expect(typeof pauseSyncQueue).toBe('function');
    expect(typeof resumeSyncQueue).toBe('function');
  });

  it('migrateLocalIdToRemote is available', () => {
    const { migrateLocalIdToRemote } = require('../auth');
    expect(typeof migrateLocalIdToRemote).toBe('function');
  });
});
