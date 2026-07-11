import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Bridge() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding/archetype-reveal');
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.emoji}>🍋</Text>
      <Text style={styles.processing}>Building your taste profile...</Text>
      <Text style={styles.headline}>
        Here are your matches — drinks you'll actually like, found in seconds instead of months of trial and error.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  processing: {
    color: '#C8A96E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.8,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
});
