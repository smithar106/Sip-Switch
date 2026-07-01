import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.emoji}>🍋</Text>

        <Text style={styles.eyebrow}>SIP SWITCH</Text>

        <Text style={styles.headline}>
          You've probably ordered a sparkling water at the bar and felt completely left out.
        </Text>

        <Text style={styles.subheadline}>
          Sip Switch maps your taste to the exact NA drinks that actually hit. 5 minutes. No more soda water.
        </Text>

        <View style={styles.valueRows}>
          {[
            'Tell us what you love about drinking — 5 questions',
            'Get your Sip Switch profile',
            'Your first 3 NA drink matches, free',
            'Recommendations that get sharper every time you rate',
          ].map((text) => (
            <View key={text} style={styles.valueRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.valueText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/onboarding/quiz')}
        >
          <Text style={styles.ctaText}>Find my drink →</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>
          5 questions · Start your 14-day free trial
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#C8A96E',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  subheadline: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  valueRows: {
    width: '100%',
    paddingBottom: 24,
  },
  valueRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkmark: {
    color: '#C8A96E',
    fontSize: 16,
    fontWeight: '800',
  },
  valueText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 32,
  },
  cta: {
    backgroundColor: '#C8A96E',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    color: '#0A0A0A',
    fontSize: 17,
    fontWeight: '800',
  },
  finePrint: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
