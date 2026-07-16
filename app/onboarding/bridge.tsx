import { useEffect } from 'react';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import LoadingScreen from '@/src/components/onboarding/LoadingScreen';

export default function Bridge() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_building_profile');
  }, []);

  return (
    <LoadingScreen
      emoji="🍋"
      headline="Building your taste profile..."
      messages={[
        'Scoring flavor preferences',
        'Matching taste dimensions',
        'Finding your first favorites',
      ]}
      duration={2800}
      onComplete={() => router.replace('/onboarding/identity')}
    />
  );
}
