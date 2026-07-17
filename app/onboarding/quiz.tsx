import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasteStore } from '@/src/stores/tasteStore';
import { calculateArchetype, calculateConfidence, computeDimensionScores, answersToPreferencePreferences } from '@/src/constants/archetypes';

interface Question {
  id: string;
  text: string;
  options: { id: string; label: string }[];
  grid?: boolean;
}

const STEPS: Question[] = [
  {
    id: 'drink',
    text: 'What do you usually drink?',
    options: [
      { id: 'a', label: '🍺 Beer & cider' },
      { id: 'b', label: '🍷 Wine' },
      { id: 'c', label: '🍸 Cocktails' },
      { id: 'd', label: '🍹 Something light' },
    ],
  },
  {
    id: 'moment',
    text: 'When do you want a drink?',
    options: [
      { id: 'a', label: '🍽️ Dinner' },
      { id: 'b', label: '🎉 Social events' },
      { id: 'c', label: '😮‍💨 After work' },
      { id: 'd', label: '☀️ Daytime' },
    ],
  },
  {
    id: 'flavour',
    text: 'Favorite flavors?',
    grid: true,
    options: [
      { id: 'a', label: '🌿 Herbal\n& earthy' },
      { id: 'b', label: '🍋 Citrus\n& bright' },
      { id: 'c', label: '🍒 Rich\n& dark' },
      { id: 'd', label: '🫧 Clean\n& crisp' },
    ],
  },
  {
    id: 'texture',
    text: 'How should it feel?',
    grid: true,
    options: [
      { id: 'a', label: '🫧 Sparkling' },
      { id: 'b', label: '🧊 Still & smooth' },
      { id: 'c', label: '🍯 Rich & heavy' },
      { id: 'd', label: '💧 Light & easy' },
    ],
  },
  {
    id: 'goal',
    text: 'What matters most?',
    grid: true,
    options: [
      { id: 'a', label: '🧠 Sophisticated' },
      { id: 'b', label: '⚡ Functional kick' },
      { id: 'c', label: '🎭 Real cocktail' },
      { id: 'd', label: '🌱 All natural' },
    ],
  },
];

export default function Quiz() {
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, currentStep, nextStep, reset } = useOnboardingStore();
  const setArchetypeId = useSessionStore((s) => s.setArchetypeId);
  const updateArchetype = useTasteStore((s) => s.updateArchetype);
  const posthog = usePostHog();
  const [selected, setSelected] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@ss_quiz_result').then((raw) => {
      if (!raw) return;
      try {
        const result = JSON.parse(raw);
        if (result.archetypeId) {
          setArchetypeId(result.archetypeId);
          router.replace('/onboarding/identity');
        }
        AsyncStorage.removeItem('@ss_quiz_result');
      } catch (e) { console.error('[quiz] quiz_result parse error:', e); }
    });
  }, []);

  useEffect(() => {
    posthog.capture('onboarding_question_seen', { step: STEPS[currentStep]?.id });
  }, [currentStep]);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;

  const advance = useCallback(
    (optionId: string) => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      setSelected(optionId);

      autoAdvanceRef.current = setTimeout(() => {
        setAnswer(step.id, optionId);
        setSelected(null);

        if (currentStep + 1 >= totalSteps) {
          const finalAnswers = { ...answers, [step.id]: optionId };
          const result = calculateArchetype(finalAnswers);
          const dimScores = computeDimensionScores(finalAnswers);
          const confidence = calculateConfidence(dimScores);

          setArchetypeId(result);
          updateArchetype(result);
          // Persist onboarding answers and preference vector for Supabase sync
          const onboardingData = {
            onboarding_answers: finalAnswers,
            dimension_scores: dimScores,
            preference_profile: answersToPreferencePreferences(finalAnswers, dimScores),
            confidence,
          };
          AsyncStorage.setItem('@ss_onboarding_data', JSON.stringify(onboardingData));

          posthog.capture('onboarding_quiz_completed', {
            archetypeId: result,
            confidence,
            $set: { archetype_id: result, has_completed_quiz: true },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          reset();
          router.push('/onboarding/bridge');
        } else {
          nextStep();
          fadeAnim.setValue(0);
          Animated.timing(fadeAnim, {
            toValue: 1, duration: 220, useNativeDriver: true,
          }).start();
        }
      }, 180);
    },
    [currentStep, answers, step, setAnswer, nextStep, fadeAnim, setArchetypeId, updateArchetype, totalSteps, reset]
  );

  const handleBack = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (currentStep === 0) {
      router.back();
    } else {
      reset();
      router.back();
    }
  }, [currentStep, reset]);

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.6}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>Step {currentStep + 1} of {totalSteps}</Text>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <Text style={styles.questionText}>{step.text}</Text>
          <View style={step.grid ? styles.grid : styles.list}>
            {step.options.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    step.grid ? styles.cardGrid : styles.cardFull,
                    isSelected && styles.cardSelected,
                    selected !== null && !isSelected && styles.cardDisabled,
                  ]}
                  onPress={() => advance(opt.id)}
                  disabled={selected !== null}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cardLabel}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  backRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 16 },
  backArrow: { color: '#C8A96E', fontSize: 20, fontWeight: '600', marginRight: 4 },
  backLabel: { color: '#C8A96E', fontSize: 14, fontWeight: '600' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  progressTrack: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: 12 },
  progressFill: { height: 2, backgroundColor: '#C8A96E', borderRadius: 999 },
  stepLabel: { color: '#C8A96E', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 },
  questionText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 24, lineHeight: 32 },
  list: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardFull: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 },
  cardGrid: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, width: '48%', flexGrow: 1 },
  cardSelected: { backgroundColor: 'rgba(200,169,110,0.15)', borderColor: '#C8A96E' },
  cardDisabled: { opacity: 0.35 },
  cardLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
