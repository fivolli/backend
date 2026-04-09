import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/auth-provider';

const COPY = {
  ru: {
    title: 'Выберите подписку',
    subtitle: 'Первые 6 месяцев бесплатно',
    trial: '6 месяцев бесплатного пробного периода',
    individualTitle: 'Индивидуальная',
    individualDesc: 'Для одного пользователя',
    familyTitle: 'Семейная',
    familyDesc: 'Для семьи + добавление близкого контакта',
    continue: 'Продолжить',
  },
  en: {
    title: 'Choose your plan',
    subtitle: 'First 6 months are free',
    trial: '6 months free trial period',
    individualTitle: 'Individual',
    individualDesc: 'For one person',
    familyTitle: 'Family',
    familyDesc: 'For family + emergency contact support',
    continue: 'Continue',
  },
  kg: {
    title: 'Жазылууну тандаңыз',
    subtitle: 'Алгачкы 6 ай акысыз',
    trial: '6 айлык акысыз сыноо мөөнөтү',
    individualTitle: 'Жеке',
    individualDesc: 'Бир колдонуучу үчүн',
    familyTitle: 'Үй-бүлөлүк',
    familyDesc: 'Үй-бүлө үчүн + жакын байланыш кошуу',
    continue: 'Улантуу',
  },
} as const;

export default function SubscriptionScreen() {
  const { token, lang, subscriptionPlan, setSubscriptionPlan } = useAuth();
  const params = useLocalSearchParams<{ next?: string; fromOnboarding?: string }>();
  const insets = useSafeAreaInsets();

  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'background');

  const copy = COPY[(lang as keyof typeof COPY) || 'ru'] ?? COPY.ru;

  const current = subscriptionPlan || 'individual';

  const onContinue = () => {
    if (token) {
      router.replace('/home');
      return;
    }

    const nextRoute = params.next === '/login' ? '/login' : '/register';
    router.replace({ pathname: nextRoute, params: { fromOnboarding: '1' } } as any);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}> 
      <View style={[styles.wrap, { paddingTop: insets.top + 24 }]}> 
        <ThemedText style={[styles.title, { color: primary }]}>{copy.title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: text }]}>{copy.subtitle}</ThemedText>

        <View style={[styles.trial, { borderColor: primary }]}> 
          <ThemedText style={[styles.trialText, { color: primary }]}>{copy.trial}</ThemedText>
        </View>

        <Pressable
          onPress={() => void setSubscriptionPlan('individual')}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: surface,
              borderColor: current === 'individual' ? primary : border,
              opacity: pressed ? 0.93 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.cardTitle, { color: primary }]}>{copy.individualTitle}</ThemedText>
          <ThemedText style={[styles.cardDesc, { color: text }]}>{copy.individualDesc}</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => void setSubscriptionPlan('family')}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: surface,
              borderColor: current === 'family' ? primary : border,
              opacity: pressed ? 0.93 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.cardTitle, { color: primary }]}>{copy.familyTitle}</ThemedText>
          <ThemedText style={[styles.cardDesc, { color: text }]}>{copy.familyDesc}</ThemedText>
        </Pressable>

        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            { backgroundColor: primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText style={styles.continueText}>{copy.continue}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap: { paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, opacity: 0.85 },
  trial: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  trialText: { fontWeight: '700' },
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardDesc: { lineHeight: 20 },
  continueBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
