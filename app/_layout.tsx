import { useEffect } from 'react';
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

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const posthogEnabled = posthogApiKey.length > 0 && posthogApiKey !== '<SIP_POSTHOG_KEY_HERE>';

export default function RootLayout() {
  const loadSession = useSessionStore((s) => s.loadFromStorage);
  const loadTaste = useTasteStore((s) => s.loadFromStorage);
  const loadLive = useLiveStore((s) => s.loadFromStorage);
  const setIsPremium = useSessionStore((s) => s.setIsPremium);

  useEffect(() => {
    loadSession();
    loadTaste();
    loadLive();
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
  }, [loadSession, loadTaste, loadLive, setIsPremium]);

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
