import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  headline: string;
  subtext?: string;
  primaryButton: string;
  secondaryButton?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export default function FutureStateScreen({
  headline, subtext, primaryButton, secondaryButton,
  onPrimary, onSecondary,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Text style={styles.prefix}>Imagine if...</Text>
        <Text style={styles.headline}>{headline}</Text>
        {subtext && <Text style={styles.subtext}>{subtext}</Text>}
        <View style={styles.spacer} />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={onPrimary}>
          <Text style={styles.ctaText}>{primaryButton}</Text>
        </TouchableOpacity>
        {secondaryButton && onSecondary && (
          <TouchableOpacity style={styles.ctaSecondary} activeOpacity={0.7} onPress={onSecondary}>
            <Text style={styles.ctaSecondaryText}>{secondaryButton}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  prefix: { color: '#C8A96E', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  headline: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: 8 },
  subtext: { color: '#AAAAAA', fontSize: 15, lineHeight: 22 },
  spacer: { flex: 1 },
  footer: { paddingHorizontal: 28, paddingTop: 12, gap: 8 },
  cta: { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  ctaSecondary: { paddingVertical: 14, alignItems: 'center' },
  ctaSecondaryText: { color: '#888888', fontSize: 15, fontWeight: '600' },
});
