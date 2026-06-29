import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import type { Archetype } from '@/src/types';

export default function ArchetypeReveal() {
  const insets = useSafeAreaInsets();
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype: Archetype = archetypeId ? ARCHETYPES[archetypeId] : ARCHETYPES.complex;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>YOUR SIP SWITCH PROFILE</Text>

        <Text style={styles.emoji}>{archetype.emoji}</Text>

        <Text style={styles.name}>{archetype.name}</Text>

        <Text style={styles.tagline}>{archetype.tagline}</Text>

        <Text style={styles.description}>{archetype.description}</Text>

        <View style={styles.pillRow}>
          {archetype.categories.map((cat) => (
            <View key={cat} style={styles.pill}>
              <Text style={styles.pillText}>{cat}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Start here.</Text>

        {archetype.examples.map((example, i) => (
          <View key={example} style={styles.exampleCard}>
            <Text style={styles.exampleIcon}>✦</Text>
            <View style={styles.exampleInfo}>
              <Text style={styles.exampleName}>{example}</Text>
              <Text style={styles.exampleCategory}>
                {archetype.categories[i] ?? ''}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push('/paywall')}
        >
          <Text style={styles.ctaText}>Start my free trial →</Text>
        </TouchableOpacity>

        <Text style={styles.finePrint}>14-day free trial · Cancel anytime</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  backRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backArrow: {
    color: '#C8A96E',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 4,
  },
  backLabel: {
    color: '#C8A96E',
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#C8A96E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    color: '#DDDDDD',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  description: {
    color: '#999999',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  pill: {
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: '#C8A96E',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 10,
  },
  exampleIcon: {
    color: '#C8A96E',
    fontSize: 22,
    flexShrink: 0,
  },
  exampleInfo: {
    flex: 1,
  },
  exampleName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exampleCategory: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  cta: {
    backgroundColor: '#C8A96E',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaText: {
    color: '#0A0A0A',
    fontSize: 17,
    fontWeight: '800',
  },
  finePrint: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
  },
});
