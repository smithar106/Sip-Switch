import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function Index() {
  const hasOnboarded = useSessionStore((s) => s.hasOnboarded);
  const isPremium = useSessionStore((s) => s.isPremium);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasOnboarded) {
        router.replace('/onboarding/welcome');
      } else if (!isPremium && !__DEV__) {
        router.replace('/paywall');
      } else {
        router.replace('/(tabs)/feed');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [hasOnboarded, isPremium]);

  return (
    <View style={styles.screen}>
      <Text style={styles.emoji}>🍋</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    opacity: 0.5,
  },
});
