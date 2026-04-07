import { Redirect } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/auth-provider';
import { getOnboardingSeen } from '@/lib/storage';
import { useEffect, useState } from 'react';

export default function Index() {
  const { loading, token } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const seen = await getOnboardingSeen();
      if (alive) setSeenOnboarding(seen);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading || seenOnboarding === null) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  if (token) return <Redirect href="/home" />;
  if (!seenOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/login" />;
}
