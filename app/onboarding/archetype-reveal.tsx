import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

export default function ArchetypeReveal() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;

  const s = useSessionStore((s) => s.archetypeId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>YOUR PROFILE</Text>

        <Text style={styles.emoji}>{archetype.emoji}</Text>
        <Text style={styles.name}>{archetype.name}</Text>
        <Text style={styles.tagline}>{archetype.tagline}</Text>

        <View style={styles.pillRow}>
          {archetype.categories.map((cat) => (
            <View key={cat} style={styles.pill}>
              <Text style={styles.pillText}>{cat}</Text>
            </View>
          ))}
        </View>

        <View style={styles.drinkCard}>
          <Text style={styles.drinkEmoji}>🍵</Text>
          <View style={styles.drinkInfo}>
            <Text style={styles.drinkName}>{archetype.examples[0] ?? 'Seedlip Spice 94'}</Text>
            <Text style={styles.drinkSub}>Your first match</Text>
          </View>
        </View>

        <Text style={styles.lockLabel}>🔒 2 more unlocked with your trial</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/paywall')}
        >
          <Text style={styles.ctaText}>Unlock my matches →</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>7-day free trial · Cancel anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#0A0A0A' },
  content:  { flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center', gap: 8 },
  eyebrow:  { color: '#C8A96E', fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  emoji:    { fontSize: 72, marginBottom: 8 },
  name:     { color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  tagline:  { color: '#CCCCCC', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8, paddingHorizontal: 8 },
  pillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  pill:     { backgroundColor: 'rgba(200,169,110,0.1)', borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { color: '#C8A96E', fontSize: 12, fontWeight: '600' },
  drinkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', width: '100%', maxWidth: 320 },
  drinkEmoji: { fontSize: 28 },
  drinkInfo: { flex: 1 },
  drinkName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  drinkSub:  { color: '#AAAAAA', fontSize: 12, marginTop: 2 },
  lockLabel: { color: '#C8A96E', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  footer:    { paddingHorizontal: 28, paddingTop: 8 },
  cta:       { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center' },
  ctaText:   { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  finePrint: { color: '#AAAAAA', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
