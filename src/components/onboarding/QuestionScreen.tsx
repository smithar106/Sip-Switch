import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Option {
  id: string;
  label: string;
}

interface Props {
  question: string;
  options: Option[];
  step: number;
  total: number;
  grid?: boolean;
  onBack?: () => void;
  onSelect: (optionId: string) => void;
}

export default function QuestionScreen({
  question, options, step, total, grid, onBack, onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleSelect = useCallback((id: string) => {
    if (selected) return;
    setSelected(id);
    setTimeout(() => {
      setSelected(null);
      onSelect(id);
    }, 180);
  }, [selected, onSelect]);

  const progress = ((step + 1) / total) * 100;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {onBack && (
        <View style={styles.backRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.6}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.container}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>Step {step + 1} of {total}</Text>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <Text style={styles.questionText}>{question}</Text>
          <View style={grid ? styles.grid : styles.list}>
            {options.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    grid ? styles.cardGrid : styles.cardFull,
                    isSelected && styles.cardSelected,
                    selected !== null && !isSelected && styles.cardDisabled,
                  ]}
                  onPress={() => handleSelect(opt.id)}
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
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
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
