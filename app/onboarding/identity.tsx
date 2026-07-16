import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

export default function Identity() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_identity_seen', { archetypeId: archetype.id });
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('onboarding_identity_continue', { archetypeId: archetype.id });
    router.push('/onboarding/proof');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{archetype.emoji}</Text>
        <Text style={styles.eyebrow}>YOUR TASTE IDENTITY</Text>
        <Text style={styles.name}>You are {archetype.name}.</Text>
        <Text style={styles.tagline}>{archetype.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={handleContinue}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  eyebrow: { color: '#C8A96E', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  tagline: { color: '#CCCCCC', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 8 },
  cta: { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
});
