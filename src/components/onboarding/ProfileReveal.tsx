import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Pill { emoji: string; label: string }
interface Match { name: string; reason: string; badge: string }

interface Props {
  emoji: string;
  name: string;
  reason: string;
  pills: Pill[];
  match: Match;
  ctaLabel: string;
  finePrint?: string;
  onCta: () => void;
}

type Phase = 'loading' | 'profile' | 'match' | 'done';

export default function ProfileReveal({
  emoji, name, reason, pills, match, ctaLabel, finePrint, onCta,
}: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('loading');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const matchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('profile');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 400);
    const t2 = setTimeout(() => {
      setPhase('match');
      Animated.timing(matchAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 1200);
    const t3 = setTimeout(() => setPhase('done'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        {phase === 'loading' && (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingEmoji}>{emoji}</Text>
            <Text style={styles.loadingText}>Building your profile...</Text>
          </View>
        )}

        {phase !== 'loading' && (
          <Animated.View style={[styles.revealWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.eyebrow}>YOUR PROFILE</Text>
            <Text style={styles.confidence}>92% confidence</Text>
            <Text style={styles.profileEmoji}>{emoji}</Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.reason}>{reason}</Text>
            <View style={styles.pillRow}>
              {pills.map((p) => (
                <View key={p.label} style={styles.pill}>
                  <Text style={styles.pillEmoji}>{p.emoji}</Text>
                  <Text style={styles.pillText}>{p.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {(phase === 'match' || phase === 'done') && (
          <Animated.View style={[styles.matchWrap, { opacity: matchAnim }]}>
            <View style={styles.matchCard}>
              <View style={styles.matchBadge}><Text style={styles.matchBadgeText}>{match.badge}</Text></View>
              <Text style={styles.matchName}>{match.name}</Text>
              <Text style={styles.matchReason}>{match.reason}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {phase === 'done' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={onCta}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
          {finePrint && <Text style={styles.finePrint}>{finePrint}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  loadingWrap: { alignItems: 'center', gap: 12 },
  loadingEmoji: { fontSize: 48, opacity: 0.6 },
  loadingText: { color: '#AAAAAA', fontSize: 14 },
  revealWrap: { alignItems: 'center', width: '100%' },
  eyebrow: { color: '#C8A96E', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  confidence: { color: '#C8A96E', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  profileEmoji: { fontSize: 56, marginBottom: 8 },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  reason: { color: '#CCCCCC', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(200,169,110,0.08)', borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillEmoji: { fontSize: 14 },
  pillText: { color: '#C8A96E', fontSize: 12, fontWeight: '600' },
  matchWrap: { width: '100%', gap: 8, marginTop: 4 },
  matchCard: { backgroundColor: 'rgba(200,169,110,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)', padding: 16, gap: 6, position: 'relative' },
  matchBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: '#C8A96E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  matchBadgeText: { color: '#0A0A0A', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  matchName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  matchReason: { color: '#AAAAAA', fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 4, width: '100%' },
  cta: { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  finePrint: { color: '#AAAAAA', fontSize: 12, textAlign: 'center', marginTop: 6 },
});
