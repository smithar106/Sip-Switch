import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text } from 'react-native';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function TabLayout() {
  const isPremium = useSessionStore((s) => s.isPremium);

  useEffect(() => {
    if (!isPremium) {
      router.replace('/paywall');
    }
  }, [isPremium]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#C8A96E',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'For You', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✦</Text> }} />
      <Tabs.Screen name="live" options={{
        title: 'Live',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚡</Text>
      }} />
      <Tabs.Screen name="swaps" options={{
        title: 'Switch Map',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⇄</Text>
      }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◉</Text> }} />
    </Tabs>
  );
}
