import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setOnboardingSeen } from '@/lib/storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/auth-provider';

type AppLang = 'ru' | 'en' | 'kg';

type SlideCopy = {
  title: string;
  body: string;
  cta: string;
};

type CopyPack = {
  skip: string;
  create: string;
  login: string;
  slides: SlideCopy[];
  levels: { title: string; desc: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[];
  timeline: { title: string; desc: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[];
};

const COPY: Record<AppLang, CopyPack> = {
  ru: {
    skip: 'Пропустить',
    create: 'Создать аккаунт',
    login: 'Войти',
    slides: [
      {
        title: 'Tayan рядом, когда нужна помощь',
        body: 'Мгновенная первая помощь рядом с вами. Мы объединяем людей, чтобы никто не оставался один в трудную минуту.',
        cta: 'Начать',
      },
      {
        title: 'Умный подбор помощи',
        body: 'Система сама оценивает серьёзность ситуации и подбирает подходящий уровень помощи без лишних шагов.',
        cta: 'Понятно',
      },
      {
        title: 'Всего 4 шага до помощи',
        body: 'Один вызов, быстрый подбор, отслеживание на карте и оценка после завершения.',
        cta: 'Супер',
      },
      {
        title: 'Твоя безопасность — наш приоритет',
        body: 'Все медики верифицированы, а твои данные защищены. Ты всегда понимаешь, кто едет к тебе.',
        cta: 'Готово',
      },
    ],
    levels: [
      {
        title: 'Лёгкие случаи',
        desc: 'Порезы, ушибы, недомогание. Помогут студенты-медики рядом.',
        color: '#31C46C',
        icon: 'doctor',
      },
      {
        title: 'Средние случаи',
        desc: 'Температура, сильная боль, ухудшение самочувствия. Подключаются специалисты.',
        color: '#F2C94C',
        icon: 'stethoscope',
      },
      {
        title: 'Экстренные случаи',
        desc: 'Потеря сознания, ДТП, тяжёлое состояние. Сразу рекомендуем скорую помощь.',
        color: '#F05D5E',
        icon: 'ambulance',
      },
    ],
    timeline: [
      { title: 'Нажми кнопку', desc: 'Система мгновенно определит твои координаты.', icon: 'gesture-tap-button' },
      { title: 'Подбор медика', desc: 'Алгоритм найдёт ближайшего верифицированного специалиста.', icon: 'account-search' },
      { title: 'Отслеживай путь', desc: 'На карте будет видно, как помощь приближается.', icon: 'map-marker-path' },
      { title: 'Оценка и отзыв', desc: 'После помощи можно оставить оценку и комментарий.', icon: 'star-check-outline' },
    ],
  },
  en: {
    skip: 'Skip',
    create: 'Create account',
    login: 'Log in',
    slides: [
      {
        title: 'Tayan is close when help matters',
        body: 'Immediate first aid is closer than you think. We connect people so no one is left alone in a hard moment.',
        cta: 'Start',
      },
      {
        title: 'Smart help matching',
        body: 'The app estimates urgency automatically and suggests the right level of support right away.',
        cta: 'Got it',
      },
      {
        title: 'Only 4 steps to get help',
        body: 'One tap, instant matching, route tracking, and rating after the visit.',
        cta: 'Nice',
      },
      {
        title: 'Your safety comes first',
        body: 'Every medic is verified and your data stays protected. You always know who is coming.',
        cta: 'Done',
      },
    ],
    levels: [
      {
        title: 'Light cases',
        desc: 'Cuts, bruises, mild discomfort. Nearby medic students can help quickly.',
        color: '#31C46C',
        icon: 'doctor',
      },
      {
        title: 'Medium cases',
        desc: 'Fever, stronger pain, worsening condition. We connect trained clinicians.',
        color: '#F2C94C',
        icon: 'stethoscope',
      },
      {
        title: 'Emergency cases',
        desc: 'Loss of consciousness, accidents, critical symptoms. Ambulance is the right choice.',
        color: '#F05D5E',
        icon: 'ambulance',
      },
    ],
    timeline: [
      { title: 'Tap once', desc: 'Your location is detected instantly.', icon: 'gesture-tap-button' },
      { title: 'Match a medic', desc: 'We find the nearest verified specialist.', icon: 'account-search' },
      { title: 'Track the route', desc: 'Watch help move toward you on the map.', icon: 'map-marker-path' },
      { title: 'Rate the result', desc: 'Leave a rating and short feedback after support.', icon: 'star-check-outline' },
    ],
  },
  kg: {
    skip: 'Өткөрүү',
    create: 'Аккаунт түзүү',
    login: 'Кирүү',
    slides: [
      {
        title: 'Tayan жардам керек учурда жаныңда',
        body: 'Шашылыш биринчи жардам жакын. Биз адамдарды бириктирип, оор учурда эч ким жалгыз калбашы үчүн иштейбиз.',
        cta: 'Баштоо',
      },
      {
        title: 'Акылдуу жардам тандоо',
        body: 'Тиркеме кырдаалдын оордугун өзү баалап, ылайыктуу жардамды тандап берет.',
        cta: 'Түшүнүктүү',
      },
      {
        title: 'Жардам алуу үчүн 4 эле кадам',
        body: 'Бир басуу, тез тандоо, картадан көзөмөлдөө жана жардамдан кийин баалоо.',
        cta: 'Сонун',
      },
      {
        title: 'Коопсуздугуң биз үчүн маанилүү',
        body: 'Бардык медиктер текшерилген, ал эми сенин маалыматтарың корголот. Ким бара жатканын дайыма көрөсүң.',
        cta: 'Даяр',
      },
    ],
    levels: [
      {
        title: 'Жеңил учурлар',
        desc: 'Кесик, көгөрүү, жеңил алсыроо. Жакынкы медик-студенттер жардам берет.',
        color: '#31C46C',
        icon: 'doctor',
      },
      {
        title: 'Орто учурлар',
        desc: 'Дене табы, катуу оору, абалдын начарлашы. Адистер кошулат.',
        color: '#F2C94C',
        icon: 'stethoscope',
      },
      {
        title: 'Шашылыш учурлар',
        desc: 'Эсин жоготуу, жол кырсыгы, оор белгилер. Дароо тез жардам сунушталат.',
        color: '#F05D5E',
        icon: 'ambulance',
      },
    ],
    timeline: [
      { title: 'Баскычты бас', desc: 'Система жайгашкан жериңди дароо аныктайт.', icon: 'gesture-tap-button' },
      { title: 'Медик тандалат', desc: 'Алгоритм эң жакын текшерилген адисти табат.', icon: 'account-search' },
      { title: 'Жолду көзөмөлдө', desc: 'Жардам жакындап жатканын картадан көрөсүң.', icon: 'map-marker-path' },
      { title: 'Баалоо жана пикир', desc: 'Жардамдан кийин баа берип, пикир калтырасың.', icon: 'star-check-outline' },
    ],
  },
};

function HandIllustration() {
  return (
    <View style={styles.handWrap}>
      <LinearGradient colors={['#93F0DD', '#5DB8E2']} style={styles.handCircle}>
        <MaterialCommunityIcons name="handshake-outline" size={112} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { lang } = useAuth();
  const palette = COPY[(lang as AppLang) || 'ru'] ?? COPY.ru;

  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = '#6D7B93';
  const activeDot = '#4AA9E8';

  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  const slideStyle = useMemo(
    () => ({
      width,
      paddingTop: Math.max(insets.top + 24, 32),
      paddingHorizontal: 24,
      paddingBottom: 12,
    }),
    [insets.top, width]
  );

  const complete = async (target: '/login' | '/register') => {
    await setOnboardingSeen(true);
    router.replace(target);
  };

  const goNext = async () => {
    if (index >= 3) {
      await complete('/register');
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex((current) => Math.min(current + 1, 3));
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(3, nextIndex)));
  };

  return (
    <ThemedView style={styles.container}>
      {index < 3 ? (
        <Pressable
          onPress={() => void complete('/login')}
          style={[styles.skipButton, { top: Math.max(insets.top + 6, 16) }]}>
          <ThemedText style={[styles.skipText, { color: muted }]}>{palette.skip}</ThemedText>
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}>
        <View style={slideStyle}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <MaterialCommunityIcons name="shield-star-outline" size={28} color="#7CBDEB" style={styles.headerIcon} />
            <HandIllustration />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[0].title}</ThemedText>
            <ThemedText style={[styles.body, { color: text }]}>{palette.slides[0].body}</ThemedText>
          </View>
        </View>

        <View style={slideStyle}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <MaterialCommunityIcons name="shield-star-outline" size={28} color="#7CBDEB" style={styles.headerIcon} />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[1].title}</ThemedText>
            <View style={styles.levelsWrap}>
              {palette.levels.map((level, levelIndex) => (
                <View
                  key={level.title}
                  style={[styles.levelRow, levelIndex < palette.levels.length - 1 ? styles.levelDivider : null]}>
                  <View style={[styles.levelIcon, { backgroundColor: `${level.color}22` }]}>
                    <MaterialCommunityIcons name={level.icon} size={30} color={level.color} />
                  </View>
                  <View style={styles.levelTextWrap}>
                    <View style={styles.levelHeading}>
                      <View style={[styles.signal, { backgroundColor: level.color }]} />
                      <ThemedText style={[styles.levelTitle, { color: text }]}>{level.title}</ThemedText>
                    </View>
                    <ThemedText style={[styles.levelDesc, { color: muted }]}>{level.desc}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={slideStyle}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <MaterialCommunityIcons name="shield-star-outline" size={28} color="#7CBDEB" style={styles.headerIcon} />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[2].title}</ThemedText>
            <View style={styles.timelineWrap}>
              {palette.timeline.map((step, stepIndex) => (
                <View key={step.title} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineIconWrap}>
                      <MaterialCommunityIcons name={step.icon} size={28} color="#4A95D2" />
                    </View>
                  </View>
                  <View style={styles.timelineMiddle}>
                    <View style={styles.timelineNumber}>
                      <ThemedText style={styles.timelineNumberText}>{stepIndex + 1}</ThemedText>
                    </View>
                    {stepIndex < palette.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineRight}>
                    <ThemedText style={[styles.timelineTitle, { color: text }]}>{step.title}</ThemedText>
                    <ThemedText style={[styles.timelineDesc, { color: muted }]}>{step.desc}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={slideStyle}>
          <View style={[styles.card, styles.finalCard, { backgroundColor: surface }]}>
            <MaterialCommunityIcons name="shield-star-outline" size={28} color="#7CBDEB" style={styles.headerIcon} />
            <ThemedText style={[styles.title, styles.finalTitle, { color: primary }]}>{palette.slides[3].title}</ThemedText>
            <LinearGradient colors={['#CFF6F1', '#D6EAFF']} style={styles.finalShieldGlow}>
              <MaterialCommunityIcons name="shield-check-outline" size={124} color="#4A95D2" />
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed-outline" size={22} color="#4A95D2" />
              </View>
            </LinearGradient>
            <ThemedText style={[styles.body, styles.finalBody, { color: text }]}>{palette.slides[3].body}</ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? activeDot : '#D1D9E6',
                  width: dotIndex === index ? 14 : 8,
                },
              ]}
            />
          ))}
        </View>

        {index < 3 ? (
          <Pressable onPress={() => void goNext()} style={styles.actionWrap}>
            <LinearGradient colors={['#9AF2DE', '#6DE8C3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>{palette.slides[index].cta}</ThemedText>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.finalActions}>
            <Pressable onPress={() => void complete('/register')} style={styles.actionWrap}>
              <LinearGradient colors={['#13E0C7', '#12C69F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>{palette.create}</ThemedText>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => void complete('/login')} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>{palette.login}</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FDFF',
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    flex: 1,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#B8F0EA',
    paddingHorizontal: 22,
    paddingVertical: 22,
    shadowColor: '#77E2D8',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    justifyContent: 'center',
  },
  headerIcon: {
    alignSelf: 'center',
    marginBottom: 18,
  },
  handWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  handCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
  },
  levelsWrap: {
    gap: 14,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
  },
  levelDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#DCECF5',
  },
  levelIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTextWrap: {
    flex: 1,
  },
  levelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  signal: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  timelineWrap: {
    gap: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    width: 64,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E1F6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineMiddle: {
    width: 34,
    alignItems: 'center',
  },
  timelineNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4A95D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  timelineLine: {
    width: 3,
    minHeight: 38,
    flex: 1,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: '#B7D9F1',
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  finalCard: {
    alignItems: 'center',
  },
  finalTitle: {
    maxWidth: 300,
  },
  finalShieldGlow: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    right: 30,
    bottom: 40,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalBody: {
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  actionWrap: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  finalActions: {
    gap: 12,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A98CF',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
