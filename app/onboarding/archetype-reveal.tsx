import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

const PILL_EMOJIS: Record<string, string> = {
  'NA Aperitifs': '🍊',
  'Herbal Tonics': '🌿',
  'Shrubs & Switchels': '🍹',
  'NA Sparkling Wine': '🥂',
  'Craft Sodas': '🫧',
  'Sparkling Botanicals': '🌺',
  'NA Wine': '🍷',
  'NA Spirits': '🥃',
  'Craft Kombuchas': '🫚',
  'Dry NA Wine': '🍷',
  'Sparkling Water': '🫧',
  'Cold Brew': '☕',
  'NA Cocktail Kits': '🍸',
  'Adaptogen Drinks': '🧪',
  'NA Beer': '🍺',
  'NA Cider': '🍏',
  'Fruit Kefir': '🍓',
};

function getReason(archetype: Archetype): string {
  const map: Record<string, string> = {
    bitter: 'You love depth, bitterness, and drinks that feel truly crafted.',
    carbonated: 'Bubbles are non-negotiable — you drink with your eyes and ears.',
    complex: 'You crave structure, finish, and a real wine-like experience.',
    dry: 'Nothing sweet, nothing fussy — just clean and refined.',
    bold: 'You want the full cocktail ritual, minus the alcohol.',
    light: 'Refreshing, sessionable, and zero explanation required.',
  };
  return map[archetype.id] ?? 'A taste profile built from your answers.';
}

type Phase = 'loading' | 'archetype' | 'match' | 'done';

export default function ArchetypeReveal() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;
  const [phase, setPhase] = useState<Phase>('loading');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const matchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('archetype');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 400);

    const t2 = setTimeout(() => {
      setPhase('match');
      Animated.timing(matchAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 1200);

    const t3 = setTimeout(() => setPhase('done'), 1800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        {phase === 'loading' && (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingEmoji}>🍋</Text>
            <Text style={styles.loadingText}>Building your taste profile…</Text>
          </View>
        )}

        {phase !== 'loading' && (
          <Animated.View style={[styles.revealWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.eyebrow}>YOUR TASTE PROFILE</Text>
            <Text style={styles.confidence}>92% confidence</Text>
            <Text style={styles.emoji}>{archetype.emoji}</Text>
            <Text style={styles.name}>{archetype.name}</Text>
            <Text style={styles.reason}>{getReason(archetype)}</Text>

            <Text style={styles.loveLabel}>You'll probably love</Text>
            <View style={styles.pillRow}>
              {archetype.categories.map((cat) => (
                <View key={cat} style={styles.pill}>
                  <Text style={styles.pillEmoji}>{PILL_EMOJIS[cat] ?? '✦'}</Text>
                  <Text style={styles.pillText}>{cat.replace('NA ', '').toLowerCase()}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {(phase === 'match' || phase === 'done') && (
          <Animated.View style={[styles.matchWrap, { opacity: matchAnim }]}>
            <View style={styles.matchCard}>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>93% match</Text>
              </View>
              <Text style={styles.matchDrink}>{archetype.examples[0] ?? 'Seedlip Spice 94'}</Text>
              <Text style={styles.matchReason}>
                {archetype.id === 'bitter' && 'Chosen for your love of bitterness, depth, and herbal complexity.'}
                {archetype.id === 'carbonated' && 'Chosen for your preference for bubbles, light body, and celebratory feel.'}
                {archetype.id === 'complex' && 'Chosen for your dry finish, complexity, and wine-like structure.'}
                {archetype.id === 'dry' && 'Chosen for your preference for clean, refined drinks with real structure.'}
                {archetype.id === 'bold' && 'Chosen for your love of bold cocktails, ritual, and complex flavour.'}
                {archetype.id === 'light' && 'Chosen for your preference for refreshing, sessionable drinks.'}
              </Text>
            </View>
            <Text style={styles.valueLine}>Found in seconds — not weeks of trial and error.</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/paywall')}
        >
          <Text style={styles.ctaText}>Unlock My Matches</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>7-day free trial · Cancel anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#0A0A0A' },
  content:      { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  loadingWrap:  { alignItems: 'center', gap: 12 },
  loadingEmoji: { fontSize: 48, opacity: 0.6 },
  loadingText:  { color: '#AAAAAA', fontSize: 14 },
  revealWrap:   { alignItems: 'center', width: '100%' },
  eyebrow:      { color: '#C8A96E', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  confidence:   { color: '#C8A96E', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  emoji:        { fontSize: 56, marginBottom: 8 },
  name:         { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  reason:       { color: '#CCCCCC', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 14 },
  loveLabel:    { color: '#888888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  pillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(200,169,110,0.08)', borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillEmoji:    { fontSize: 14 },
  pillText:     { color: '#C8A96E', fontSize: 12, fontWeight: '600' },
  matchWrap:    { width: '100%', gap: 8, marginTop: 4 },
  matchCard:    { backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', padding: 16, gap: 6, position: 'relative' },
  matchBadge:   { position: 'absolute', top: -10, right: 12, backgroundColor: '#C8A96E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  matchBadgeText:{ color: '#0A0A0A', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  matchDrink:   { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  matchReason:  { color: '#AAAAAA', fontSize: 13, lineHeight: 18 },
  valueLine:    { color: '#C8A96E', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  footer:       { paddingHorizontal: 24, paddingTop: 4 },
  cta:          { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center' },
  ctaText:      { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  finePrint:    { color: '#AAAAAA', fontSize: 12, textAlign: 'center', marginTop: 6 },
});
