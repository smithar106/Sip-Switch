import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface Benefit {
  emoji: string;
  text: string;
}

interface Props {
  headline: string;
  body: string;
  benefits: Benefit[];
  ctaLabel: string;
  onCta: () => void;
}

export default function ValueScreen({
  headline, body, benefits, ctaLabel, onCta,
}: Props) {
  const insets = useSafeAreaInsets();

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCta();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={handleCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  headline: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 14 },
  body: { color: '#AAAAAA', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  benefits: { gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  benefitText: { color: '#CCCCCC', fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 8 },
  cta: { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
});
