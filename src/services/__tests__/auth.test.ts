"use client";
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, IdentityState, initializeAuth, onAuthStateChange, signOut } from '../auth';

vi.mock('@supabase/supabase-js', () => {
  const mockSupabaseClient = {
    auth: {
      signInAnonymously: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      setSession: vi.fn(),
    },
  };
  return {
    createClient: vi.fn(() => mockSupabaseClient),
    type Session: vi.fn(),
  };
});

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInAnonymously: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      setSession: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@react-native-async-storage/async-storage');

desc('Identity State Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AsyncStorage.clear?.();
  });

  describe('IdentityState types', () => {
    it('should type match for authenticated mode', () => {
      const testIdentity: IdentityState = {
        mode: 'authenticated',
        userId: 'user-123',
        session: { user: { id: 'user-123', email: null }, access_token: '', refresh_token: '' } as Session,
      };
      expect(testIdentity.mode).toBe('authenticated');
      expect(testIdentity.userId).toBe('user-123');
    });

    it('should type match for local_only mode', () => {
      const testIdentity: IdentityState = {
        mode: 'local_only',
        localId: 'local-456',
      };
      expect(testIdentity.mode).toBe('local_only');
      expect(testIdentity.localId).toBe('local-456');
    });

    it('should type match for auth_failed mode', () => {
      const testIdentity: IdentityState = {
        mode: 'auth_failed',
        error: { code: 'sign_in_failed', message: 'Anonymous auth failed' },
      };
      expect(testIdentity.mode).toBe('auth_failed');
      expect(testIdentity.error.code).toBe('sign_in_failed');
    });
  });

  describe('initializeAuth - authenticated flow', () => {
    it('should return authenticated state when sign-in succeeds', async () => {
      const mockSession: Session = {
        user: { id: 'auth-user-123', email: null },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);
      vi.mocked(require('../supabase').supabase.auth.signInAnonymously).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const identity = await initializeAuth();
      expect(identity?.mode).toBe('authenticated');
      expect(identity?.userId).toBe('auth-user-123');
    });

    it('should return local_only mode when Supabase is not configured', async () => {
      vi.mocked(require('../supabase').isSupabaseConfigured).mockReturnValueOnce(false);
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('local-id-456');
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const identity = await initializeAuth();
      expect(identity?.mode).toBe('local_only');
      expect(identity?.localId).toBe('local-id-456');
    });

    it('should return auth_failed mode when sign-in fails', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);
      vi.mocked(require('../supabase').supabase.auth.signInAnonymously).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid credentials', code: 'invalid_credentials' },
      });

      const identity = await initializeAuth();
      expect(identity?.mode).toBe('auth_failed');
      expect(identity?.error.code).toBe('invalid_credentials');
    });

    it('should restore session from storage when available', async () => {
      const mockSession: Session = {
        user: { id: 'restored-user-789', email: null },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };
      vi.mocked(AsyncStorage.getItem)
        .mockResolvedValueOnce(JSON.stringify(mockSession))
        .mockResolvedValueOnce('true');
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const identity = await initializeAuth();
      expect(identity?.mode).toBe('authenticated');
      expect(identity?.userId).toBe('restored-user-789');
    });
  });

  describe('onAuthStateChange', () => {
    it('should call callback with authenticated state change', () => {
      const mockSession: Session = {
        user: { id: 'changed-user-321', email: null },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      const mockOnAuthStateChange = vi.fn((_event, session) => {
        const callback = (event: any, session: any) => {
          if (session?.user?.id) {
            callback('SIGNED_IN', session);
          } else {
            callback('SIGNED_OUT', null);
          }
        };
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      vi.mocked(require('../supabase').supabase.auth.onAuthStateChange).mockImplementation(mockOnAuthStateChange);

      const unsubscribe = onAuthStateChange(mockCallback);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('signOut', () => {
    it('should clear auth state on successful sign-out', async () => {
      vi.mocked(require('../supabase').supabase.auth.signOut).mockResolvedValueOnce(undefined);
      vi.mocked(AsyncStorage.multiRemove).mockResolvedValueOnce(undefined);

      await signOut();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle sign-out when Supabase is not configured', async () => {
      vi.mocked(require('../supabase').isSupabaseConfigured).mockReturnValueOnce(false);

      await signOut();
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });
});
