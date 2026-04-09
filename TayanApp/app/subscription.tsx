import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon } from '@/components/app-icon';
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
    individualBadge: '1 аккаунт',
    familyTitle: 'Семейная',
    familyDesc: 'Для семьи + добавление близкого контакта',
    familyBadge: 'Близкий контакт',
    continue: 'Продолжить',
  },
  en: {
    title: 'Choose your plan',
    subtitle: 'First 6 months are free',
    trial: '6 months free trial period',
    individualTitle: 'Individual',
    individualDesc: 'For one person',
    individualBadge: 'Single account',
    familyTitle: 'Family',
    familyDesc: 'For family + emergency contact support',
    familyBadge: 'Emergency contact',
    continue: 'Continue',
  },
  kg: {
    title: 'Жазылууну тандаңыз',
    subtitle: 'Алгачкы 6 ай акысыз',
    trial: '6 айлык акысыз сыноо мөөнөтү',
    individualTitle: 'Жеке',
    individualDesc: 'Бир колдонуучу үчүн',
    individualBadge: '1 аккаунт',
    familyTitle: 'Үй-бүлөлүк',
    familyDesc: 'Үй-бүлө үчүн + жакын байланыш кошуу',
    familyBadge: 'Жакын байланыш',
    continue: 'Улантуу',
  },
} as const;

export default function SubscriptionScreen() {
  const { token, lang, subscriptionPlan, setSubscriptionPlan } = useAuth();
  const params = useLocalSearchParams<{ next?: string; fromOnboarding?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'background');

  const copy = COPY[(lang as keyof typeof COPY) || 'ru'] ?? COPY.ru;
  const isCompact = width < 940;

  const current = subscriptionPlan || 'individual';

  const onContinue = () => {
    if (token) {
      router.replace('/home');
      return;
    }

    const nextRoute = params.next === '/login' ? '/login' : '/register';
    router.replace({ pathname: nextRoute, params: { fromOnboarding: '1' } } as any);
  };

  const planItems = [
    {
      id: 'individual' as const,
      title: copy.individualTitle,
      desc: copy.individualDesc,
      badge: copy.individualBadge,
    },
    {
      id: 'family' as const,
      title: copy.familyTitle,
      desc: copy.familyDesc,
      badge: copy.familyBadge,
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(44,45,95,0.12)', 'rgba(44,45,95,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgGlowTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(44,45,95,0.10)', 'rgba(44,45,95,0)']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bgGlowBottom}
      />

      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom + 20, 28) }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.title, { color: primary }]}>{copy.title}</ThemedText>

        <View style={[styles.trial, { borderColor: `${primary}66`, backgroundColor: `${primary}10` }]}>
          <ThemedText style={[styles.trialText, { color: primary }]}>{copy.trial}</ThemedText>
        </View>

        <View style={[styles.cardsRow, isCompact ? styles.cardsCol : null]}>
          {planItems.map((plan) => {
            const selected = current === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => void setSubscriptionPlan(plan.id)}
                style={({ pressed, hovered }) => [
                  styles.card,
                  {
                    backgroundColor: selected ? `${primary}12` : surface,
                    borderColor: selected ? primary : border,
                    shadowOpacity: selected ? 0.24 : 0.08,
                    transform: [{ scale: pressed ? 0.985 : hovered ? 1.01 : selected ? 1.02 : 1 }],
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: selected ? `${primary}20` : `${primary}0E` }]}>
                    <ThemedText style={[styles.badgeText, { color: primary }]}>{plan.badge}</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.checkWrap,
                      {
                        borderColor: selected ? primary : `${primary}44`,
                        backgroundColor: selected ? primary : 'transparent',
                      },
                    ]}
                  >
                    {selected ? <AppIcon name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                </View>

                <ThemedText style={[styles.cardTitle, { color: primary }]}>{plan.title}</ThemedText>
                <ThemedText style={[styles.cardDesc, { color: text }]}>{plan.desc}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dotsRow}>
          {planItems.map((plan) => {
            const selected = current === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.dot,
                  { width: selected ? 14 : 8, backgroundColor: selected ? primary : `${primary}44` },
                ]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={onContinue}
          style={({ pressed, hovered }) => [
            styles.continueBtn,
            {
              backgroundColor: primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: hovered ? 1.01 : 1 }],
            },
          ]}
        >
          <ThemedText style={styles.continueText}>{copy.continue}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlowTop: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -180,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
  },
  wrap: { paddingHorizontal: 20, gap: 14 },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' },
  subtitle: { fontSize: 18, opacity: 0.9 },
  trial: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  trialText: { fontWeight: '800', fontSize: 17 },
  cardsRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  cardsCol: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowColor: '#2C2D5F',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 31, lineHeight: 34, fontWeight: '900' },
  cardDesc: { lineHeight: 24, fontSize: 20 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  continueBtn: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { color: '#fff', fontWeight: '900', fontSize: 17 },
});
