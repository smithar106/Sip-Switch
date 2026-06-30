import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SWAP_MAP } from '@/src/constants/archetypes';

export default function Swaps() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Your Switch</Text>
        <Text style={styles.subheadline}>
          Every drink you love has an NA match that actually works.
        </Text>

        <View style={styles.divider} />

        {SWAP_MAP.map((swap) => (
          <View key={swap.from} style={styles.swapCard}>
            <Text style={styles.swapFrom}>{swap.from}</Text>
            <Text style={styles.swapArrow}>→</Text>
            <View style={styles.swapRight}>
              <Text style={styles.swapTo}>{swap.to}</Text>
              <Text style={styles.swapReason}>{swap.reason}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity onPress={() => router.push('/onboarding/quiz')}>
          <Text style={styles.retakeLink}>Take the quiz again →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:       { flex: 1 },
  wrap:         { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  headline:     { color: '#FFF', fontSize: 28, fontWeight: '800' },
  subheadline:  { color: '#999', fontSize: 14, marginTop: 6, marginBottom: 12 },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  swapCard:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  swapFrom:     { color: '#FFF', fontSize: 14, fontWeight: '600', flexShrink: 0, width: 120 },
  swapArrow:    { color: '#C8A96E', fontSize: 20, fontWeight: '700', flexShrink: 0 },
  swapRight:    { flex: 1 },
  swapTo:       { color: '#FFF', fontSize: 14, fontWeight: '700' },
  swapReason:   { color: '#666', fontSize: 12, marginTop: 3 },
  retakeLink:   { color: '#C8A96E', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
