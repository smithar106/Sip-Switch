import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const isPremium = useSessionStore((s) => s.isPremium);
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const profile = useTasteStore((s) => s.profile);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;

  const handleRetake = () => {
    posthog.capture('profile_quiz_retaken', { archetype_id: archetypeId });
    resetOnboarding();
    router.push('/onboarding/quiz');
  };

  const toGlass = (numerator: number, divisor: number) => {
    const raw = (numerator / divisor) * 5;
    return Math.min(5, Math.max(0.5, Math.round(raw * 2) / 2));
  };

  const s = profile.scores;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Archetype Card */}
        {archetype && (
          <View style={styles.archetypeCard}>
            <Text style={styles.archetypeEmoji}>{archetype.emoji}</Text>
            <Text style={styles.archetypeName}>{archetype.name}</Text>
            <Text style={styles.archetypeTagline}>{archetype.tagline}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Taste Meter */}
        <Text style={styles.sectionTitle}>Your Taste Meter</Text>

        {[
          {
            label: 'Social', emoji: '🎉',
            score: toGlass(
              (s.carbonated ?? 50) * 2 + (s.bold ?? 50) * 2 + (s.light ?? 50) * 1,
              5 * 100
            ),
          },
          {
            label: 'Flavour', emoji: '🌿',
            score: toGlass(
              (s.complex ?? 50) * 2 + (s.bitter ?? 50) * 2 + (s.herbal ?? 50) * 1,
              5 * 100
            ),
          },
          {
            label: 'Bubbles', emoji: '🫧',
            score: toGlass(
              (s.carbonated ?? 50) * 4 + (s.light ?? 50) * 1,
              5 * 100
            ),
          },
          {
            label: 'Boldness', emoji: '🍸',
            score: toGlass(
              (s.bold ?? 50) * 3 + (s.bitter ?? 50) * 2 + (s.complex ?? 50) * 1,
              6 * 100
            ),
          },
          {
            label: 'Freshness', emoji: '☀️',
            score: toGlass(
              (s.citrus ?? 50) * 3 + (s.light ?? 50) * 2 + (s.clean ?? 50) * 1,
              6 * 100
            ),
          },
        ].map(({ label, emoji, score }) => (
          <View key={label} style={styles.meterRow}>
            <Text style={styles.meterEmoji}>{emoji}</Text>
            <Text style={styles.meterLabel}>{label}</Text>
            <View style={styles.meterGlasses}>
              {[1,2,3,4,5].map(i => {
                const filled = i <= Math.floor(score);
                const half = !filled && i === Math.ceil(score) && score % 1 !== 0;
                return (
                  <Text key={i} style={[
                    styles.meterGlass,
                    filled ? styles.meterGlassFilled : half ? styles.meterGlassHalf : styles.meterGlassEmpty
                  ]}>
                    🥂
                  </Text>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.ratingCount}>{profile.totalRatings} drinks rated</Text>

        <View style={styles.divider} />

        {/* Subscription */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        <Text style={[styles.subStatus, isPremium && { color: '#C8A96E' }]}>
          {isPremium ? 'Pro · Active' : '7-day trial'}
        </Text>
        {!isPremium && (
          <TouchableOpacity style={styles.subBtn} onPress={() => {
            posthog.capture('profile_upgrade_tapped', { archetype_id: archetypeId });
            router.push('/paywall');
          }}>
            <Text style={styles.subBtnText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity style={styles.settingRow} onPress={handleRetake}>
          <Text style={styles.settingText}>Retake quiz</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('https://sipswitch.app/privacy')}>
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('https://sipswitch.app/terms')}>
          <Text style={styles.settingText}>Terms of Service</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('mailto:support@sipswitch.app')}>
          <Text style={styles.settingText}>Contact</Text>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:          { flex: 1 },
  wrap:            { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  pageTitle:       { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 20 },
  archetypeCard:   { backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', padding: 20, alignItems: 'center', marginBottom: 8 },
  archetypeEmoji:  { fontSize: 56, marginBottom: 12 },
  archetypeName:   { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  archetypeTagline:{ color: '#CCCCCC', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  divider:         { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 20 },
  sectionTitle:    { color: '#C8A96E', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  meterRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  meterEmoji:       { fontSize: 20, width: 28, textAlign: 'center' },
  meterLabel:       { color: '#CCCCCC', fontSize: 13, fontWeight: '600', width: 72 },
  meterGlasses:     { flexDirection: 'row', gap: 3, flex: 1 },
  meterGlass:       { fontSize: 18 },
  meterGlassFilled: { opacity: 1 },
  meterGlassHalf:   { opacity: 0.5 },
  meterGlassEmpty:  { opacity: 0.2 },
  ratingCount:      { color: '#888888', fontSize: 12, marginTop: 4, marginBottom: 4 },
  subStatus:       { color: '#CCCCCC', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  subBtn:          { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  subBtnText:      { color: '#0A0A0A', fontSize: 16, fontWeight: '800' },
  settingRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingText:     { color: '#FFF', fontSize: 15 },
  settingArrow:    { color: '#888888', fontSize: 16 },
});
