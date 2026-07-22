import { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import { RADIUS } from '@/src/constants/theme';
import { saveDrinkRating } from '@/src/services/drinks';
import { getFeedRecommendations } from '@/src/services/recommendationService';
import { subscribeToCatalog } from '@/src/repositories/drinkCatalog';
import type { ArchetypeId, DrinkProfile, DrinkRating } from '@/src/types';

const CATEGORY_GRADIENTS: Record<string, readonly [string, string]> = {
  na_beer: ['#C8A96E', '#8B7355'],
  na_wine: ['#722F37', '#4A1A2E'],
  na_spirits: ['#2C3E50', '#1A252F'],
  na_sparkling: ['#D4AF37', '#C8A96E'],
  na_aperitif: ['#E07A5F', '#C06040'],
  na_cocktail_kit: ['#6C5B7B', '#3B2A50'],
  na_kombucha: ['#8FBC8F', '#5A7D5A'],
  na_adaptogen: ['#9B59B6', '#6C3483'],
  na_soda: ['#5DADE2', '#2E86C1'],
  na_cider: ['#F0B27A', '#D4955B'],
};

const CATEGORY_EMOJIS: Record<string, string> = {
  na_beer:        '🍺', na_wine:        '🍷', na_spirits:     '🥃',
  na_sparkling:   '🥂', na_aperitif:    '🍊', na_cocktail_kit:'🍸',
  na_kombucha:    '🫚', na_adaptogen:   '🌿', na_soda:        '🫧',
  na_cider:       '🍏',
};

export default function Feed() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const userId = useSessionStore((s) => s.userId);
  const addRating = useTasteStore((s) => s.addRating);
  const ratings = useTasteStore((s) => s.ratings);
  const getUserTasteVector = useTasteStore((s) => s.getUserTasteVector);
  const getRatedDrinkIds = useTasteStore((s) => s.getRatedDrinkIds);
  const archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;
  const [drinks, setDrinks] = useState<DrinkProfile[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCatalog((state) => {
      setLoadingCatalog(state.loading);
      setCatalogError(state.error);
    });
    return unsub;
  }, []);

  const userTaste = useMemo(() => getUserTasteVector(), [getUserTasteVector, ratings]);

  useEffect(() => {
    if (!userTaste) return;
    const ratedIds = getRatedDrinkIds();
    getFeedRecommendations(userTaste, ratedIds).then((result) => {
      setDrinks(result.drinks);
      setLoadingCatalog(result.loading);
      setCatalogError(result.error);
    });
  }, [userTaste, ratings]);

  const ratedDrinks = useMemo(() => {
    const map: Record<string, 'love' | 'skip'> = {};
    for (const r of ratings) {
      if (r.rating === 'love' || r.rating === 'skip') {
        map[r.drinkId] = r.rating;
      }
    }
    return map;
  }, [ratings]);

  const handleRate = useCallback((drinkId: string, rating: 'love' | 'skip', flavourTags?: DrinkRating['flavourTags'], category?: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addRating({ drinkId, rating, timestamp: new Date().toISOString(), flavourTags, category });
    saveDrinkRating(userId, drinkId, rating, flavourTags).catch((err: unknown) =>
      console.error('[feed] saveDrinkRating error:', err)
    );
    posthog.capture('drink_rated', { drink_id: drinkId, rating, archetype_id: archetypeId, flavour_tags: flavourTags ?? null });
  }, [addRating, userId, archetypeId, posthog]);

  if (loadingCatalog && drinks.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.centerWrap}>
          <Text style={styles.loadingText}>Loading your recommendations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>For You</Text>
        <Text style={styles.archetypeName}>{archetype.name}</Text>

        {catalogError && drinks.length === 0 && (
          <Text style={styles.errorNote}>{catalogError}</Text>
        )}

        {catalogError && drinks.length > 0 && (
          <Text style={styles.staleNote}>Using cached recommendations — {catalogError}</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
          {archetype.primaryFlavours.map((f) => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.divider} />

        {drinks.map((drink) => (
          <View key={drink.id} style={styles.drinkCard}>
            <LinearGradient
              colors={CATEGORY_GRADIENTS[drink.category] ?? ['#333333', '#222222']}
              style={styles.imagePlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.imageEmoji}>
                {CATEGORY_EMOJIS[drink.category] ?? '🍹'}
              </Text>
            </LinearGradient>

            <View style={styles.drinkInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.brand}>{drink.brand.toUpperCase()}</Text>
                {drink.displayScore != null && (
                  <Text style={styles.matchScore}>{drink.displayScore}%</Text>
                )}
              </View>
              <Text style={styles.drinkName}>{drink.name}</Text>

              {drink.recommendationReason && (
                <Text style={styles.reason}>{drink.recommendationReason}</Text>
              )}

              <View style={styles.flavourRow}>
                {drink.flavourTags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.loveBtn, ratedDrinks[drink.id] === 'love' && styles.loveBtnActive]}
                  onPress={() => handleRate(drink.id, 'love', drink.flavourTags, drink.category)}
                >
                  <Text style={styles.loveBtnText}>
                    {ratedDrinks[drink.id] === 'love' ? '♥ Saved' : '♥ This is me'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.skipBtn, ratedDrinks[drink.id] === 'skip' && styles.skipBtnActive]}
                  onPress={() => handleRate(drink.id, 'skip', drink.flavourTags, drink.category)}
                >
                  <Text style={[styles.skipBtnText, ratedDrinks[drink.id] === 'skip' && styles.skipBtnTextActive]}>
                    {ratedDrinks[drink.id] === 'skip' ? '✕ Skipped' : '✕ Not for me'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.loadingRow}>
          <Text style={styles.loadingText}>Rate drinks to refine your taste profile</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:        { flex: 1 },
  wrap:          { paddingHorizontal: 20, paddingBottom: 40 },
  centerWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headline:      { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 12 },
  archetypeName: { color: '#C8A96E', fontSize: 15, fontWeight: '600', marginTop: 4, marginBottom: 16 },
  errorNote:     { color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: 8, backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: 8 },
  staleNote:     { color: '#C8A96E', fontSize: 11, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
  pillScroll:    { marginBottom: 8 },
  pillRow:       { gap: 8, flexDirection: 'row' },
  pill:          { backgroundColor: 'rgba(200,169,110,0.1)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)' },
  pillText:      { color: '#C8A96E', fontSize: 12, fontWeight: '600' },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  drinkCard:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14, overflow: 'hidden' },
  imagePlaceholder: { height: 140, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageEmoji:    { fontSize: 40, opacity: 0.6 },
  drinkInfo:     { padding: 16 },
  nameRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand:         { color: '#CCCCCC', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  matchScore:    { color: '#C8A96E', fontSize: 14, fontWeight: '800' },
  drinkName:     { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  reason:        { color: '#C8A96E', fontSize: 12, fontStyle: 'italic', marginBottom: 10, lineHeight: 16 },
  flavourRow:    { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tagPill:       { backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:       { color: '#C8A96E', fontSize: 11, fontWeight: '600' },
  actionRow:     { flexDirection: 'row', gap: 10 },
  loveBtn:       { flex: 1, backgroundColor: '#C8A96E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loveBtnActive: { backgroundColor: '#8B6914' },
  loveBtnText:   { color: '#0A0A0A', fontSize: 14, fontWeight: '700' },
  skipBtn:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  skipBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  skipBtnText:   { color: '#CCCCCC', fontSize: 14, fontWeight: '600' },
  skipBtnTextActive: { color: '#FFF' },
  loadingRow:    { alignItems: 'center', paddingVertical: 24 },
  loadingText:   { color: '#C8A96E', fontSize: 14, fontWeight: '500' },
});
