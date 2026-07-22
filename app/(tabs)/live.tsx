import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useLiveStore } from '@/src/stores/liveStore';
import { MOMENTS } from '@/src/constants/moments';
import { fetchActiveDrinks, saveDrinkRating } from '@/src/services/drinks';
import { isSupabaseConfigured } from '@/src/services/supabase';
import { scoreDrinks } from '@/src/utils/recommendationEngine';
import type { LiveEntry } from '@/src/types/liveTypes';
import type { ArchetypeId, DrinkRating } from '@/src/types';
import type { SupabaseDrink } from '@/src/types/supabase';

type Phase = 'pick' | 'result';

export default function Live() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const archetypeId = useSessionStore((s) => s.archetypeId) as ArchetypeId | null;
  const userId = useSessionStore((s) => s.userId);
  const addRating = useTasteStore((s) => s.addRating);
  const getUserTasteVector = useTasteStore((s) => s.getUserTasteVector);
  const getRatedDrinkIds = useTasteStore((s) => s.getRatedDrinkIds);
  const { history, streak, addEntry, rateEntry } = useLiveStore();
  const [phase, setPhase] = useState<Phase>('pick');
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [customMoment, setCustomMoment] = useState('');
  const [currentEntry, setCurrentEntry] = useState<LiveEntry | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [supabaseDrinks, setSupabaseDrinks] = useState<SupabaseDrink[]>([]);
  const [loading, setLoading] = useState(true);

  const userTaste = useMemo(() => getUserTasteVector(), [getUserTasteVector]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchActiveDrinks().then((drinks) => {
        setSupabaseDrinks(drinks);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleMomentSelect = useCallback((momentId: string) => {
    const moment = MOMENTS.find(m => m.id === momentId);
    if (!moment) return;

    let drinkName = 'No recommendations yet';
    let drinkBrand = '';
    let reason = 'Add more drinks to your catalog to get personalized Live picks.';
    let drinkId: string | null = null;

    if (supabaseDrinks.length > 0) {
      const ratedIds = getRatedDrinkIds();
      const scored = scoreDrinks(supabaseDrinks, userTaste, { occasion: momentId }, ratedIds);
      const top = scored[0];
      if (top && top.score > 0) {
        const drink = supabaseDrinks.find((d) => d.id === top.drinkId);
        drinkName = drink?.name ?? top.drinkId;
        drinkBrand = drink?.brand ?? '';
        reason = top.reason;
        drinkId = top.drinkId;
      }
    }

    const entry: LiveEntry = {
      id: drinkId ?? `${momentId}-${Date.now()}`,
      momentId,
      momentLabel: moment.label,
      momentEmoji: moment.emoji,
      recommendedDrink: drinkName,
      recommendedBrand: drinkBrand,
      reason,
      timestamp: new Date().toISOString(),
    };

    setSelectedMoment(momentId);
    setCurrentEntry(entry);
    addEntry(entry);
    posthog.capture('live_moment_selected', { moment_id: momentId, moment_label: moment.label, recommended_drink: drinkName, archetype_id: archetypeId });
    setTimeout(() => {
      setPhase('result');
    }, 180);
  }, [archetypeId, supabaseDrinks, userTaste, getRatedDrinkIds, addEntry, posthog]);

  const handleRate = useCallback((liveRating: 'loved' | 'liked' | 'skipped') => {
    if (!currentEntry) return;

    rateEntry(currentEntry.id, liveRating);
    posthog.capture('live_recommendation_rated', { rating: liveRating, moment_id: currentEntry.momentId, recommended_drink: currentEntry.recommendedDrink, archetype_id: archetypeId });

    const profileRatingMap: Record<string, DrinkRating['rating']> = {
      loved: 'love',
      liked: 'like',
      skipped: 'skip',
    };
    const profileRating = profileRatingMap[liveRating];
    if (profileRating && currentEntry.recommendedDrink) {
      const drink = supabaseDrinks.find((d) => d.id === currentEntry.id);
      const flavourTags = drink?.flavor_tags ?? [];
      addRating({
        drinkId: currentEntry.id,
        rating: profileRating,
        timestamp: new Date().toISOString(),
        flavourTags,
      });
      saveDrinkRating(userId, currentEntry.id, profileRating as 'love' | 'like' | 'skip', flavourTags).catch((err: unknown) =>
        console.error('[live] saveDrinkRating error:', err)
      );
    }

    setTimeout(() => {
      setPhase('pick');
      setSelectedMoment(null);
      setCurrentEntry(null);
      setShowCustomInput(false);
      setCustomMoment('');
    }, 600);
  }, [currentEntry, rateEntry, addRating, deviceId, archetypeId, posthog]);

  const handleCustomSubmit = useCallback(() => {
    if (!customMoment.trim()) return;

    let drinkName = 'No recommendations yet';
    let drinkBrand = '';
    let reason = 'Add more drinks to your catalog to get personalized Live picks.';
    let drinkId: string | null = null;

    if (supabaseDrinks.length > 0) {
      const ratedIds = getRatedDrinkIds();
      const scored = scoreDrinks(supabaseDrinks, userTaste, undefined, ratedIds);
      const top = scored[0];
      if (top && top.score > 0) {
        const drink = supabaseDrinks.find((d) => d.id === top.drinkId);
        drinkName = drink?.name ?? top.drinkId;
        drinkBrand = drink?.brand ?? '';
        reason = top.reason;
        drinkId = top.drinkId;
      }
    }

    const entry: LiveEntry = {
      id: drinkId ?? `custom-${Date.now()}`,
      momentId: 'custom',
      momentLabel: customMoment.trim(),
      momentEmoji: '✨',
      recommendedDrink: drinkName,
      recommendedBrand: drinkBrand,
      reason,
      timestamp: new Date().toISOString(),
    };
    setCurrentEntry(entry);
    addEntry(entry);
    posthog.capture('live_custom_moment_submitted', { recommended_drink: drinkName, archetype_id: archetypeId });
    setPhase('result');
  }, [customMoment, archetypeId, supabaseDrinks, userTaste, getRatedDrinkIds, addEntry, posthog]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headline}>Live</Text>
            <Text style={styles.subheadline}>What's your moment right now?</Text>
          </View>
          {streak >= 3 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#C8A96E" />
          </View>
        )}

        {!loading && phase === 'pick' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.momentGrid}>
              {MOMENTS.map((moment) => (
                <TouchableOpacity
                  key={moment.id}
                  style={[styles.momentCard, selectedMoment === moment.id && styles.momentCardSelected]}
                  onPress={() => handleMomentSelect(moment.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.momentEmoji}>{moment.emoji}</Text>
                  <Text style={styles.momentLabel}>{moment.label}</Text>
                  <Text style={styles.momentDesc}>{moment.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {showCustomInput ? (
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Describe your moment..."
                  placeholderTextColor="#555"
                  value={customMoment}
                  onChangeText={setCustomMoment}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSubmit}
                />
                <TouchableOpacity
                  style={[styles.customSubmit, !customMoment.trim() && styles.customSubmitOff]}
                  onPress={handleCustomSubmit}
                  disabled={!customMoment.trim()}
                >
                  <Text style={styles.customSubmitTxt}>Find my drink →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.customBtn} onPress={() => setShowCustomInput(true)} activeOpacity={0.7}>
                <Text style={styles.customBtnTxt}>✏️  Describe your own moment</Text>
              </TouchableOpacity>
            )}

            {history.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyLabel}>YOUR SWITCH HISTORY</Text>
                {history.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={styles.historyCard}>
                    <Text style={styles.historyEmoji}>{entry.momentEmoji}</Text>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyMoment}>{entry.momentLabel}</Text>
                      <Text style={styles.historyDrink}>{entry.recommendedDrink}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    {entry.rating && (
                      <Text style={styles.historyRating}>
                        {entry.rating === 'loved' ? '♥' : entry.rating === 'liked' ? '👍' : '✕'}
                      </Text>
                    )}
                  </View>
                ))}
                {history.length > 5 && <Text style={styles.historyMore}>+{history.length - 5} more moments</Text>}
              </View>
            )}
          </ScrollView>
        )}

        {!loading && phase === 'result' && currentEntry && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultMoment}>
              <Text style={styles.resultMomentEmoji}>{currentEntry.momentEmoji}</Text>
              <Text style={styles.resultMomentLabel}>{currentEntry.momentLabel}</Text>
            </View>

            <View style={styles.recCard}>
              <Text style={styles.recEyebrow}>YOUR SIP SWITCH</Text>
              <Text style={styles.recDrink}>{currentEntry.recommendedDrink}</Text>
              <Text style={styles.recBrand}>{currentEntry.recommendedBrand.toUpperCase()}</Text>
              <View style={styles.recDivider} />
              <Text style={styles.recReason}>{currentEntry.reason}</Text>
            </View>

            <Text style={styles.ratingPrompt}>How did it go?</Text>
            <View style={styles.ratingRow}>
              <TouchableOpacity style={styles.ratingBtn} onPress={() => handleRate('loved')}>
                <Text style={styles.ratingBtnEmoji}>♥</Text>
                <Text style={styles.ratingBtnLabel}>Loved it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ratingBtn} onPress={() => handleRate('liked')}>
                <Text style={styles.ratingBtnEmoji}>👍</Text>
                <Text style={styles.ratingBtnLabel}>Pretty good</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ratingBtn} onPress={() => handleRate('skipped')}>
                <Text style={styles.ratingBtnEmoji}>✕</Text>
                <Text style={styles.ratingBtnLabel}>Not for me</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => { setPhase('pick'); setCurrentEntry(null); setSelectedMoment(null); }}>
              <Text style={styles.backBtnTxt}>← Try another moment</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#0A0A0A' },
  header:           { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headline:         { color: '#FFF', fontSize: 28, fontWeight: '800' },
  subheadline:      { color: '#AAAAAA', fontSize: 14, marginTop: 4 },
  streakBadge:      { backgroundColor: 'rgba(200,169,110,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  streakEmoji:      { fontSize: 20 },
  streakCount:      { color: '#C8A96E', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  streakLabel:      { color: '#C8A96E', fontSize: 10, fontWeight: '600', opacity: 0.7 },
  scroll:           { flex: 1 },
  scrollContent:    { paddingHorizontal: 20, paddingBottom: 40 },
  loadingWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  momentGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  momentCard:       { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, gap: 4 },
  momentCardSelected:{ backgroundColor: 'rgba(200,169,110,0.15)', borderColor: '#C8A96E', borderWidth: 2 },
  momentEmoji:      { fontSize: 26, marginBottom: 4 },
  momentLabel:      { color: '#FFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  momentDesc:       { color: '#AAAAAA', fontSize: 11, lineHeight: 15 },
  customBtn:        { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  customBtnTxt:     { color: '#AAAAAA', fontSize: 14, fontWeight: '500' },
  customInputWrap:  { gap: 10, marginBottom: 24 },
  customInput:      { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 14, color: '#FFF', fontSize: 15 },
  customSubmit:     { backgroundColor: '#C8A96E', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  customSubmitOff:  { backgroundColor: 'rgba(200,169,110,0.3)' },
  customSubmitTxt:  { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  historySection:   { gap: 8 },
  historyLabel:     { color: '#C8A96E', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  historyCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  historyEmoji:     { fontSize: 24, width: 32, textAlign: 'center' },
  historyInfo:      { flex: 1, gap: 2 },
  historyMoment:    { color: '#CCCCCC', fontSize: 11, fontWeight: '600' },
  historyDrink:     { color: '#FFF', fontSize: 13, fontWeight: '700' },
  historyDate:      { color: '#888888', fontSize: 11 },
  historyRating:    { color: '#C8A96E', fontSize: 18 },
  historyMore:      { color: '#888888', fontSize: 12, textAlign: 'center', marginTop: 4 },
  resultContent:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 20 },
  resultMoment:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultMomentEmoji:{ fontSize: 36 },
  resultMomentLabel:{ color: '#FFF', fontSize: 22, fontWeight: '800', flex: 1 },
  recCard:          { backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', padding: 24, gap: 6 },
  recEyebrow:       { color: '#C8A96E', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  recDrink:         { color: '#FFF', fontSize: 26, fontWeight: '800', lineHeight: 30 },
  recBrand:         { color: '#C8A96E', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  recDivider:       { height: 1, backgroundColor: 'rgba(200,169,110,0.15)', marginVertical: 8 },
  recReason:        { color: '#E5E5E5', fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  ratingPrompt:     { color: '#CCCCCC', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  ratingRow:        { flexDirection: 'row', gap: 10 },
  ratingBtn:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, alignItems: 'center', gap: 6 },
  ratingBtnEmoji:   { fontSize: 22 },
  ratingBtnLabel:   { color: '#CCCCCC', fontSize: 11, fontWeight: '600' },
  backBtn:          { alignItems: 'center', paddingVertical: 8 },
  backBtnTxt:       { color: '#888888', fontSize: 14 },
});
