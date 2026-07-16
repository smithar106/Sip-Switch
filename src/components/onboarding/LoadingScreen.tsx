import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  messages: string[];
  duration?: number;
  emoji?: string;
  headline?: string;
  onComplete: () => void;
}

export default function LoadingScreen({
  messages, duration = 3000, emoji, headline, onComplete,
}: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 700);

    Animated.timing(progressAnim, {
      toValue: 1, duration, useNativeDriver: false,
    }).start();

    const navTimer = setTimeout(onComplete, duration + 100);
    return () => { clearInterval(msgTimer); clearTimeout(navTimer); };
  }, []);

  return (
    <View style={styles.screen}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      {headline && <Text style={styles.headline}>{headline}</Text>}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={styles.msg}>{messages[msgIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 20 },
  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  progressBar: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16 },
  progressFill: { height: 3, backgroundColor: '#C8A96E', borderRadius: 2 },
  msg: { color: '#AAAAAA', fontSize: 14, textAlign: 'center' },
});
