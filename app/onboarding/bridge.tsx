import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';

const MESSAGES = [
  'Mapping your taste profile…',
  'Scoring your flavor dimensions…',
  'Finding your closest matches…',
  'Preparing your profile…',
];

export default function Bridge() {
  const [msg, setMsg] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsg((prev) => (prev + 1) % MESSAGES.length);
    }, 700);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2800,
      useNativeDriver: false,
    }).start();

    const navTimer = setTimeout(() => {
      router.replace('/onboarding/archetype-reveal');
    }, 3000);

    return () => {
      clearInterval(msgTimer);
      clearTimeout(navTimer);
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.emoji}>🍋</Text>
      <Text style={styles.headline}>Building your taste profile</Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      <Text style={styles.msg}>{MESSAGES[msg]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji:       { fontSize: 56, marginBottom: 20 },
  headline:    { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 24 },
  progressBar: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16 },
  progressFill:{ height: 3, backgroundColor: '#C8A96E', borderRadius: 2 },
  msg:         { color: '#AAAAAA', fontSize: 14 },
});
