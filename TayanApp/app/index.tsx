import { Redirect } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { loading, token, subscriptionPlan } = useAuth();

  if (loading) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  if (token && !subscriptionPlan) return <Redirect href="/subscription" />;
  if (token) return <Redirect href="/home" />;
  return <Redirect href="/onboarding" />;
}
