import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHogProvider } from 'posthog-react-native';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useLiveStore } from '@/src/stores/liveStore';
import { configureRevenueCat, getCustomerInfo } from '@/src/services/revenueCat';
import { initializeAuth, onAuthStateChange, refreshSession } from '@/src/services/auth';
import { processSyncQueue } from '@/src/services/syncQueue';
import { migrateLegacyDeviceId } from '@/src/utils/legacyMigration';
import { initErrorReporting, captureError } from '@/src/services/errorReporting';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const posthogEnabled = posthogApiKey.length > 0 && posthogApiKey !== '<SIP_POSTHOG_KEY_HERE>';
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export default function RootLayout() {
  const loadSession = useSessionStore((s) => s.loadFromStorage);
  const loadTaste = useTasteStore((s) => s.loadFromStorage);
  const loadLive = useLiveStore((s) => s.loadFromStorage);
  const setIsPremium = useSessionStore((s) => s.setIsPremium);
  const setUserId = useSessionStore((s) => s.setUserId);
  const setLocalId = useSessionStore((s) => s.setLocalId);
  const setAuthReady = useSessionStore((s) => s.setAuthReady);
  const setIsAuthenticated = useSessionStore((s) => s.setIsAuthenticated);
  const userId = useSessionStore((s) => s.userId);
  const localId = useSessionStore((s) => s.localId);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;

    const init = async () => {
      try {
        initErrorReporting(sentryDsn);

        // Step 1: Initialize auth first (blocking for user-owned operations)
        const identity = await initializeAuth();
        
        if (identity?.mode === 'authenticated') {
          setUserId(identity.userId);
          setLocalId(null);
          setIsAuthenticated(true);
        } else if (identity?.mode === 'local_only') {
          setUserId(null);
          setLocalId(identity.localId);
          setIsAuthenticated(false);
        } else if (identity?.mode === 'auth_failed') {
          setUserId(null);
          setLocalId(null);
          setIsAuthenticated(false);
        }
        
        setAuthReady(true);

        // Step 2: Migrate legacy device ID if present
        if (identity?.mode === 'authenticated') {
          await migrateLegacyDeviceId(identity.userId);
        }

        // Step 3: Load local stores (parallel, independent of auth)
        await Promise.all([
          loadSession(),
          loadTaste(),
          loadLive(),
        ]);

        // Step 4: Process pending sync queue (only if authenticated)
        if (identity?.mode === 'authenticated') {
          processSyncQueue().catch((err) =>
            console.error('[root] sync queue processing error:', err)
          );
        }

        // Step 5: Configure RevenueCat (non-blocking)
        if (!__DEV__) {
          configureRevenueCat();
          getCustomerInfo().then((info) => {
            if (info?.entitlements?.active && Object.keys(info.entitlements.active).length > 0) {
              setIsPremium(true);
            }
          });
        } else {
          setIsPremium(true);
        }
      } catch (err) {
        captureError(err, { severity: 'error', context: { phase: 'app_init' } });
        // Ensure stores still load even if auth fails
        await Promise.all([
          loadSession(),
          loadTaste(),
          loadLive(),
        ]);
        setAuthReady(true);
      }
    };

    init();

    // Step 6: Listen for auth state changes
    unsubAuth = onAuthStateChange((newIdentity) => {
      if (newIdentity?.mode === 'authenticated') {
        setUserId(newIdentity.userId);
        setLocalId(null);
        setIsAuthenticated(true);
        if (newIdentity.userId !== userId) {
          processSyncQueue().catch(() => {});
        }
      } else if (newIdentity?.mode === 'local_only') {
        setUserId(null);
        setLocalId(newIdentity.localId);
        setIsAuthenticated(false);
      } else if (newIdentity?.mode === 'auth_failed') {
        setUserId(null);
        setLocalId(null);
        setIsAuthenticated(false);
      } else {
        setUserId(null);
        setLocalId(null);
        setIsAuthenticated(false);
      }
    });

    // Step 7: Handle app foreground for session refresh
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        refreshSession().catch(() => {});
      }
      appStateRef.current = nextState;
    });

    return () => {
      unsubAuth?.();
      sub.remove();
    };
  }, [loadSession, loadTaste, loadLive, setIsPremium, setUserId, setAuthReady, userId]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const token = parsed.queryParams?.token as string;
      if (!token) return;
      console.log('[SIP SWITCH QUIZ] token:', token);
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/quiz-result?token=${token}`
        );
        if (!res.ok) return;
        const result = await res.json();
        await AsyncStorage.setItem('@ss_quiz_result', JSON.stringify(result));
        console.log('[SIP SWITCH QUIZ] stored:', result);
      } catch (e) {
        console.error('[SIP SWITCH QUIZ] failed:', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PostHogProvider
          apiKey={posthogApiKey}
          options={{
            host: posthogHost,
            disabled: !posthogEnabled,
          }}
        >
          <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#0A0A0A' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
        </Stack>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
