import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype, FlavourTag } from '@/src/types';

const FLAVOUR_LABELS: Record<FlavourTag, string> = {
  bitter: 'Bitter',
  carbonated: 'Fizz',
  complex: 'Complex',
  dry: 'Dry',
  bold: 'Bold',
  light: 'Light',
  herbal: 'Herbal',
  citrus: 'Citrus',
  dark_fruit: 'Dark Fruit',
  clean: 'Clean',
};

export default function ArchetypeReveal() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>YOUR SIP SWITCH PROFILE</Text>

        <Text style={styles.emoji}>{archetype.emoji}</Text>

        <Text style={styles.name}>{archetype.name}</Text>

        <Text style={styles.tagline}>{archetype.tagline}</Text>

        <Text style={styles.description}>{archetype.description}</Text>

        <View style={styles.pillRow}>
          {archetype.categories.map((cat) => (
            <View key={cat} style={styles.pill}>
              <Text style={styles.pillText}>{cat}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Before → After reframing */}
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.beforeAfterRow}>
          <View style={styles.beforeBlock}>
            <Text style={styles.baLabel}>BEFORE</Text>
            <Text style={styles.baText}>
              Weeks of trial and error{'\n'}wasted money on drinks you pour out{'\n'}feeling left out at the bar
            </Text>
          </View>
          <View style={styles.baArrow}>
            <Text style={styles.baArrowText}>→</Text>
          </View>
          <View style={styles.afterBlock}>
            <Text style={[styles.baLabel, styles.baLabelAfter]}>WITH SIP SWITCH</Text>
            <Text style={styles.baText}>
              Your taste mapped in 5 minutes{'\n'}drinks matched to YOU{'\n'}walk in knowing exactly what to order
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Mini taste meter */}
        <Text style={styles.sectionLabel}>YOUR TASTE METER</Text>
        <View style={styles.tasteMeterWrap}>
          {archetype.primaryFlavours.map((flavour) => (
            <View key={flavour} style={styles.tasteBarRow}>
              <Text style={styles.tasteBarLabel}>{FLAVOUR_LABELS[flavour] ?? flavour}</Text>
              <View style={styles.tasteBarTrack}>
                <View style={[styles.tasteBarFill, { width: '70%' }]} />
              </View>
            </View>
          ))}
          <Text style={styles.tasteMeterHint}>
            Rates sharpen with every drink you rate — this is just the start.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Drink matches — unlocked first, then locked */}
        <View style={styles.drinkSection}>
          <Text style={styles.drinkSectionLabel}>YOUR FIRST MATCH</Text>
          <View style={styles.drinkCardUnlocked}>
            <Text style={styles.drinkEmoji}>
              {archetype.examples[0] && archetype.examples[0].includes('Athletic') ? '🍺' :
               archetype.examples[0] && (archetype.examples[0].includes('Monday') || archetype.examples[0].includes('Lyre')) ? '🍸' :
               archetype.examples[0] && (archetype.examples[0].includes('Leitz') || archetype.examples[0].includes('Thomson')) ? '🍷' :
               archetype.examples[0] && archetype.examples[0].includes('Surely') ? '🥂' :
               '🍵'}
            </Text>
            <View style={styles.drinkInfo}>
              <Text style={styles.drinkName}>{archetype.examples[0] ?? 'Seedlip Spice 94'}</Text>
              <Text style={styles.drinkSub}>Matched to your taste profile</Text>
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>92% match</Text>
            </View>
          </View>

          <Text style={styles.timeClaim}>
            Found in 10 seconds — not weeks of trial and error.
          </Text>

          <Text style={styles.lockLabel}>🔒 2 more matches — unlock with your trial</Text>
          {[1, 2].map((i) => (
            <View key={i} style={styles.drinkCardLocked}>
              <Text style={styles.drinkEmoji}>🔒</Text>
              <View style={styles.drinkInfo}>
                <Text style={styles.drinkNameLocked}>
                  {i === 1 ? 'Matched to your occasion' : 'Matched to your flavour profile'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/paywall')}
        >
          <Text style={styles.ctaText}>Unlock my full match list →</Text>
        </TouchableOpacity>

        <Text style={styles.finePrint}>7-day free trial · Cancel anytime</Text>
      </ScrollView>
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
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#C8A96E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    color: '#EEEEEE',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  description: {
    color: '#CCCCCC',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  pill: {
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: '#C8A96E',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#C8A96E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
  },
  beforeAfterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 4,
  },
  beforeBlock: {
    backgroundColor: 'rgba(170,57,57,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(170,57,57,0.15)',
    padding: 14,
    flex: 1,
  },
  baLabel: {
    color: '#AA3939',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  baLabelAfter: {
    color: '#4CAF50',
  },
  baText: {
    color: '#AAAAAA',
    fontSize: 12,
    lineHeight: 17,
  },
  baArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  baArrowText: {
    color: '#C8A96E',
    fontSize: 22,
    fontWeight: '800',
  },
  afterBlock: {
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.12)',
    padding: 14,
    flex: 1,
  },
  tasteMeterWrap: {
    width: '100%',
    gap: 10,
    marginBottom: 4,
  },
  tasteBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tasteBarLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
  tasteBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tasteBarFill: {
    height: 8,
    backgroundColor: '#C8A96E',
    borderRadius: 4,
    minWidth: 8,
  },
  tasteMeterHint: {
    color: '#888888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  drinkSection: { marginTop: 24, gap: 10, width: '100%' },
  drinkSectionLabel: { color: '#C8A96E', fontSize: 11,
    fontWeight: '700', letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  drinkCardUnlocked: { flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(200,169,110,0.08)',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)' },
  drinkCardLocked: { flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.5 },
  drinkEmoji: { fontSize: 28 },
  drinkInfo: { flex: 1 },
  drinkName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  drinkNameLocked: { color: '#666666', fontSize: 15, fontWeight: '600' },
  drinkSub: { color: '#888888', fontSize: 12, marginTop: 2 },
  matchBadge: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  matchBadgeText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '800',
  },
  timeClaim: {
    color: '#C8A96E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  lockLabel: { color: '#C8A96E', fontSize: 13, fontWeight: '600',
    textAlign: 'center', marginVertical: 4 },
  cta: {
    backgroundColor: '#C8A96E',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaText: {
    color: '#0A0A0A',
    fontSize: 17,
    fontWeight: '800',
  },
  finePrint: {
    color: '#AAAAAA',
    fontSize: 13,
    textAlign: 'center',
  },
});
