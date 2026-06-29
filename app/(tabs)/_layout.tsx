import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

export default function TabLayout() {
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
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'For You', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✦</Text> }} />
      <Tabs.Screen name="swaps" options={{ title: 'Swaps', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⇄</Text> }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>♡</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◉</Text> }} />
    </Tabs>
  );
}
