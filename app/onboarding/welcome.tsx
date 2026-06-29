import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🍋</Text>

        <Text style={styles.eyebrow}>SIP SWITCH</Text>

        <Text style={styles.headline}>
          Find your perfect{'\n'}non-alcoholic drink.
        </Text>

        <Text style={styles.subheadline}>
          Tell us what you love about drinking.{'\n'}We find the NA version that actually satisfies.
        </Text>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/onboarding/quiz')}
        >
          <Text style={styles.ctaText}>Find my drink →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/paywall')}>
          <Text style={styles.existing}>Already have an account?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  eyebrow: {
    color: '#C8A96E',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 12,
  },
  subheadline: {
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  cta: {
    backgroundColor: '#C8A96E',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: {
    color: '#0A0A0A',
    fontSize: 17,
    fontWeight: '800',
  },
  existing: {
    color: '#555555',
    fontSize: 14,
  },
});
