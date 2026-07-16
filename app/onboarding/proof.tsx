import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

const PILL_EMOJIS: Record<string, string> = {
  'NA Aperitifs': '🍊', 'Herbal Tonics': '🌿', 'Shrubs & Switchels': '🍹',
  'NA Sparkling Wine': '🥂', 'Craft Sodas': '🫧', 'Sparkling Botanicals': '🌺',
  'NA Wine': '🍷', 'NA Spirits': '🥃', 'Craft Kombuchas': '🫚',
  'Dry NA Wine': '🍷', 'Sparkling Water': '🫧', 'Cold Brew': '☕',
  'NA Cocktail Kits': '🍸', 'Adaptogen Drinks': '🧪', 'NA Beer': '🍺',
  'NA Cider': '🍏', 'Fruit Kefir': '🍓',
};

export default function Proof() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_proof_seen', { archetypeId: archetype.id });
  }, []);

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('onboarding_proof_cta', { archetypeId: archetype.id });
    router.push('/paywall');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.eyebrow}>YOUR MATCHES</Text>
          <Text style={styles.headline}>We already found your first matches.</Text>
        </View>

        <View style={styles.matches}>
          {archetype.examples.map((drink) => (
            <View key={drink} style={styles.matchCard}>
              <View style={styles.matchIcon}>
                <Text style={styles.matchIconText}>
                  {PILL_EMOJIS[archetype.categories[0]] ?? '🍸'}
                </Text>
              </View>
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>{drink}</Text>
                <Text style={styles.matchTag}>{archetype.categories[0]?.replace('NA ', '')}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>Match</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.blurred}>
          <View style={styles.blurredOverlay} />
          <View style={styles.blurredContent}>
            <Text style={styles.blurredIcon}>✦</Text>
            <Text style={styles.blurredText}>10+ more matches waiting for you</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={handleCta}>
          <Text style={styles.ctaText}>Unlock My Matches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  topSection: { marginBottom: 24 },
  eyebrow: { color: '#C8A96E', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30 },
  matches: { gap: 8, marginBottom: 12 },
  matchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14 },
  matchIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(200,169,110,0.1)', alignItems: 'center', justifyContent: 'center' },
  matchIconText: { fontSize: 20 },
  matchInfo: { flex: 1, gap: 2 },
  matchName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  matchTag: { color: '#AAAAAA', fontSize: 12, fontWeight: '500' },
  matchBadge: { backgroundColor: 'rgba(200,169,110,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  matchBadgeText: { color: '#C8A96E', fontSize: 11, fontWeight: '700' },
  blurred: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  blurredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.6)', zIndex: 2 },
  blurredContent: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, alignItems: 'center', gap: 6 },
  blurredIcon: { fontSize: 18, color: '#C8A96E', opacity: 0.5 },
  blurredText: { color: '#888888', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  cta: { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
});
