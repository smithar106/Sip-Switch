import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useLiveStore } from '@/src/stores/liveStore';
import { configureRevenueCat, getCustomerInfo } from '@/src/services/revenueCat';

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
        if (info?.entitlements?.active) {
          setIsPremium(true);
        }
      });
    } else {
      setIsPremium(true);
    }
  }, [loadSession, loadTaste, loadLive, setIsPremium]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#0A0A0A' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
