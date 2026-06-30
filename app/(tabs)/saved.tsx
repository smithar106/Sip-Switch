import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasteStore } from '@/src/stores/tasteStore';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';

export default function Saved() {
  const insets = useSafeAreaInsets();
  const ratings = useTasteStore((s) => s.ratings);
  const saved = ratings.filter((r) => r.rating === 'love' || r.rating === 'like');
  const archetypeId = useSessionStore((s) => s.archetypeId);

  const DRINK_NAME_MAP: Record<string, string> = {};
  if (archetypeId) {
    const archetype = ARCHETYPES[archetypeId];
    archetype.examples.forEach((name, i) => {
      DRINK_NAME_MAP[`${archetypeId}-${i}`] = name;
    });
    ['Atypique', 'De Soi', 'Rightside', 'Tenneyson', 'Dhos'].forEach((name, i) => {
      DRINK_NAME_MAP[`extra-${i}`] = name;
    });
  }

  const getDrinkName = (drinkId: string): string => {
    return DRINK_NAME_MAP[drinkId] ?? drinkId;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {saved.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🍋</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySub}>Rate drinks in your feed to save your favourites</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/feed')}
          >
            <Text style={styles.emptyBtnText}>Go to feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>Saved</Text>
          <View style={styles.divider} />
          {saved.map((r) => (
            <View key={r.drinkId + r.timestamp} style={styles.savedCard}>
              <View style={styles.savedIconWrap}>
                <Text style={styles.savedIcon}>
                  {r.rating === 'love' ? '♥' : '♡'}
                </Text>
              </View>
              <View style={styles.savedInfo}>
                <Text style={styles.savedName}>{getDrinkName(r.drinkId)}</Text>
                <Text style={styles.savedDate}>
                  Saved {new Date(r.timestamp).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                </Text>
              </View>
              <Text style={styles.savedArrow}>→</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:        { flex: 1 },
  wrap:          { paddingHorizontal: 20, paddingBottom: 40 },
  headline:      { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 12 },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  savedCard:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  savedIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(200,169,110,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  savedIcon:     { color: '#C8A96E', fontSize: 18 },
  savedInfo:     { flex: 1 },
  savedName:     { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  savedDate:     { color: '#AAAAAA', fontSize: 12 },
  savedArrow:    { color: '#888888', fontSize: 16 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyEmoji:    { fontSize: 72, marginBottom: 16 },
  emptyTitle:    { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub:      { color: '#CCCCCC', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn:      { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText:  { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
});
