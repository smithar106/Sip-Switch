import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useSessionStore } from '@/src/stores/sessionStore';
import { SWAP_MAP } from '@/src/constants/archetypes';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { ArchetypeId } from '@/src/types';

export default function Swaps() {
  const insets = useSafeAreaInsets();
  const ratings = useTasteStore((s) => s.ratings);
  const archetypeId = useSessionStore((s) => s.archetypeId) as ArchetypeId | null;
  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;

  const savedDrinkIds = new Set(
    ratings
      .filter(r => r.rating === 'love' || r.rating === 'like')
      .map(r => r.drinkId)
  );

  const drinkNameMap: Record<string, string> = {};
  if (archetype) {
    archetype.examples.forEach((name, i) => {
      drinkNameMap[`${archetypeId}-${i}`] = name;
    });
  }
  ['Atypique', 'De Soi', 'Rightside', 'Tenneyson', 'Dhos'].forEach((name, i) => {
    drinkNameMap[`extra-${i}`] = name;
  });

  const savedDrinkNames = new Set(
    [...savedDrinkIds].map(id => drinkNameMap[id]).filter(Boolean)
  );

  const isSaved = (swapTo: string): boolean => {
    return [...savedDrinkNames].some(name =>
      swapTo.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(swapTo.split(' ')[0].toLowerCase())
    );
  };

  const savedCount = SWAP_MAP.filter(s => isSaved(s.to)).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headline}>Your Switch Map</Text>
        <Text style={styles.subheadline}>
          Every drink you love has a non-alcoholic match that actually works.
        </Text>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${(savedCount / SWAP_MAP.length) * 100}%` }
            ]} />
          </View>
          <Text style={styles.progressLabel}>
            {savedCount} of {SWAP_MAP.length} switches saved
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Swap cards */}
        {SWAP_MAP.map((swap) => {
          const saved = isSaved(swap.to);
          return (
            <View
              key={swap.from}
              style={[styles.swapCard, saved && styles.swapCardSaved]}
            >
              {saved && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeTxt}>✓ SAVED</Text>
                </View>
              )}

              {/* Left — alcoholic drink */}
              <View style={styles.swapLeft}>
                <Text style={styles.swapFromEmoji}>
                  {swap.from.split(' ')[0]}
                </Text>
                <Text style={[
                  styles.swapFromName,
                  saved && styles.swapFromNameSaved
                ]}>
                  {swap.from.split(' ').slice(1).join(' ')}
                </Text>
              </View>

              {/* Arrow */}
              <View style={styles.arrowWrap}>
                <Text style={[
                  styles.swapArrow,
                  saved && styles.swapArrowSaved
                ]}>→</Text>
              </View>

              {/* Right — NA drink */}
              <View style={styles.swapRight}>
                <Text style={[
                  styles.swapToName,
                  saved && styles.swapToNameSaved
                ]}>
                  {swap.to}
                </Text>
                <Text style={styles.swapReason}>{swap.reason}</Text>
              </View>
            </View>
          );
        })}

        {/* Footer nudge if nothing saved */}
        {savedCount === 0 && (
          <View style={styles.nudge}>
            <Text style={styles.nudgeEmoji}>♥</Text>
            <Text style={styles.nudgeTxt}>
              Rate drinks in your feed to see your personal switch map fill up
            </Text>
          </View>
        )}

        {savedCount === SWAP_MAP.length && (
          <View style={styles.nudge}>
            <Text style={styles.nudgeEmoji}>🏆</Text>
            <Text style={styles.nudgeTxt}>
              You've mapped every switch. You're a Sip Switch pro.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:           { flex: 1 },
  wrap:             { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  headline:         { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subheadline:      { color: '#AAAAAA', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  progressWrap:     { gap: 8, marginBottom: 16 },
  progressTrack:    { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  progressFill:     { height: 4, backgroundColor: '#C8A96E', borderRadius: 2, minWidth: 4 },
  progressLabel:    { color: '#C8A96E', fontSize: 12, fontWeight: '600' },
  divider:          { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  swapCard:         {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    position: 'relative',
  },
  swapCardSaved:    {
    backgroundColor: 'rgba(200,169,110,0.08)',
    borderColor: 'rgba(200,169,110,0.35)',
  },
  savedBadge:       {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: '#C8A96E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedBadgeTxt:    { color: '#0A0A0A', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  swapLeft:         { alignItems: 'center', width: 56, gap: 4 },
  swapFromEmoji:    { fontSize: 24 },
  swapFromName:     { color: '#AAAAAA', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  swapFromNameSaved:{ color: '#E5E5E5' },
  arrowWrap:        { alignItems: 'center', width: 24 },
  swapArrow:        { color: '#555555', fontSize: 18, fontWeight: '700' },
  swapArrowSaved:   { color: '#C8A96E' },
  swapRight:        { flex: 1, gap: 3 },
  swapToName:       { color: '#E5E5E5', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  swapToNameSaved:  { color: '#FFFFFF' },
  swapReason:       { color: '#888888', fontSize: 12, lineHeight: 16 },
  nudge:            {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  nudgeEmoji:       { fontSize: 32 },
  nudgeTxt:         { color: '#888888', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
