import { useEffect } from 'react';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import ProblemScreen from '@/src/components/onboarding/ProblemScreen';

export default function PainTwo() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_pain_two_seen');
  }, []);

  return (
    <ProblemScreen
      headline="Finding your favorite shouldn't take ten bad bottles."
      subtext="Skip the trial and error."
      primaryButton="I'm in"
      onPrimary={() => router.push('/onboarding/quiz')}
    />
  );
}
