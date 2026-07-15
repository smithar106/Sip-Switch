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
          Find NA drinks{'\n'}you'll actually love.
        </Text>

        <Text style={styles.subheadline}>
          Take a 60-second taste quiz and get matched to drinks based on how you drink — not generic recommendations.
        </Text>

        <View style={styles.valueRows}>
          {[
            'Matched to your taste',
            'Know what to order',
            'Sharper picks every time you rate',
          ].map((text) => (
            <View key={text} style={styles.valueRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.valueText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/onboarding/quiz')}
        >
          <Text style={styles.ctaText}>Build My Taste Profile</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>
          7 questions · 7-day free trial
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#0A0A0A' },
  content:  { flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },
  emoji:    { fontSize: 56, marginBottom: 12 },
  eyebrow:  { color: '#C8A96E', fontSize: 13, fontWeight: '600', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 },
  headline: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 42, marginBottom: 10 },
  subheadline: { color: '#CCCCCC', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
  valueRows: { width: '100%', gap: 12 },
  valueRow:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkmark: { color: '#C8A96E', fontSize: 16, fontWeight: '800' },
  valueText: { color: '#CCCCCC', fontSize: 14, lineHeight: 20, flex: 1 },
  footer:    { paddingHorizontal: 28, paddingTop: 12 },
  cta:       { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center' },
  ctaText:   { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  finePrint: { color: '#AAAAAA', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
