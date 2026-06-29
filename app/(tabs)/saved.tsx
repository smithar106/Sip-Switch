import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasteStore } from '@/src/stores/tasteStore';

export default function Saved() {
  const insets = useSafeAreaInsets();
  const ratings = useTasteStore((s) => s.ratings);
  const saved = ratings.filter((r) => r.rating === 'love' || r.rating === 'like');

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
              <Text style={styles.ratingIcon}>{r.rating === 'love' ? '♥' : '♡'}</Text>
              <View>
                <Text style={styles.drinkId}>{r.drinkId}</Text>
                <Text style={styles.timestamp}>{new Date(r.timestamp).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:       { flex: 1 },
  wrap:         { paddingHorizontal: 20, paddingBottom: 40 },
  headline:     { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 12 },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  savedCard:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ratingIcon:   { color: '#C8A96E', fontSize: 20, flexShrink: 0 },
  drinkId:      { color: '#FFF', fontSize: 14, fontWeight: '600' },
  timestamp:    { color: '#666', fontSize: 12, marginTop: 2 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyEmoji:   { fontSize: 72, marginBottom: 16 },
  emptyTitle:   { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub:     { color: '#999', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn:     { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
});
