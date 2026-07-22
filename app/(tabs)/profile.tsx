import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import { getConfidenceLabel } from '@/src/services/recommendationService';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const isPremium = useSessionStore((s) => s.isPremium);
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const profile = useTasteStore((s) => s.profile);
  const vector = useTasteStore((s) => s.model.vector);
  const confidence = useTasteStore((s) => s.confidence);
  const favoriteFlavorTags = useTasteStore((s) => s.favoriteFlavorTags);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;

  const handleRetake = () => {
    posthog.capture('profile_quiz_retaken', { archetype_id: archetypeId });
    resetOnboarding();
    router.push('/onboarding/quiz');
  };

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

        {/* Taste Vector */}
        <Text style={styles.sectionTitle}>Your Taste Profile</Text>

        {[
          { label: 'Sweetness', emoji: '🍯', val: vector.sweetness },
          { label: 'Bitterness', emoji: '🌿', val: vector.bitterness },
          { label: 'Acidity', emoji: '🍋', val: vector.acidity },
          { label: 'Body', emoji: '🍷', val: vector.body },
          { label: 'Complexity', emoji: '🧠', val: vector.complexity },
          { label: 'Carbonation', emoji: '🫧', val: vector.carbonation },
        ].map(({ label, emoji, val }) => (
          <View key={label} style={styles.meterRow}>
            <Text style={styles.meterEmoji}>{emoji}</Text>
            <Text style={styles.meterLabel}>{label}</Text>
            <View style={styles.meterBarBg}>
              <View style={[styles.meterBarFill, { width: `${val * 10}%` }]} />
            </View>
            <Text style={styles.meterValue}>{val}</Text>
          </View>
        ))}

        {favoriteFlavorTags.length > 0 && (
          <View style={styles.flavorRow}>
            <Text style={styles.flavorLabel}>Top tags: </Text>
            {favoriteFlavorTags.map((tag) => (
              <Text key={tag} style={styles.flavorTag}>{tag}</Text>
            ))}
          </View>
        )}

        <Text style={styles.ratingCount}>
          {profile.totalRatings} drinks rated
        </Text>
        {getConfidenceLabel(confidence).showLabel && (
          <Text style={styles.confidenceLabel}>
            {getConfidenceLabel(confidence).label}
          </Text>
        )}

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
  meterBarBg:       { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  meterBarFill:     { height: 8, backgroundColor: '#C8A96E', borderRadius: 4 },
  meterValue:       { color: '#C8A96E', fontSize: 13, fontWeight: '700', width: 20, textAlign: 'right' },
  flavorRow:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  flavorLabel:      { color: '#888888', fontSize: 12, fontWeight: '600' },
  flavorTag:        { color: '#C8A96E', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(200,169,110,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)' },
  ratingCount:      { color: '#888888', fontSize: 12, marginTop: 12, marginBottom: 2 },
  confidenceLabel:  { color: '#C8A96E', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  subStatus:       { color: '#CCCCCC', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  subBtn:          { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  subBtnText:      { color: '#0A0A0A', fontSize: 16, fontWeight: '800' },
  settingRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingText:     { color: '#FFF', fontSize: 15 },
  settingArrow:    { color: '#888888', fontSize: 16 },
});
