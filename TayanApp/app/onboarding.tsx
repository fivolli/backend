import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  continue: string;
  slides: SlideCopy[];
  roleDemo: {
    title: string;
    intro: string;
    cards: {
      title: string;
      desc: string;
      image: any;
    }[];
  };
  levels: {
    title: string;
    desc: string;
    color: string;
    image: any;
  }[];
  timeline: {
    title: string;
    desc: string;
    image: any;
  }[];
};

const COPY: Record<AppLang, CopyPack> = {
  ru: {
    skip: 'Пропустить',
    create: 'Создать аккаунт',
    login: 'Войти',
    continue: 'Продолжить',
    slides: [
      {
        title: 'Tayan рядом, когда нужна помощь',
        body: 'Мгновенная первая помощь рядом с вами. Мы объединяем людей, чтобы никто не оставался один в трудную минуту.',
        cta: 'Начать',
      },
      {
        title: 'Есть 2 варианта использования приложения:',
        body: 'Выберите подходящий формат использования на следующем шаге.',
        cta: 'Дальше',
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
    roleDemo: {
      title: 'Есть 2 варианта использования приложения:',
      intro: 'Это не выбор на этом экране, а обзор того, как можно использовать Tayan.',
      cards: [
        {
          title: 'Для пострадавшего',
          desc: 'Для тех, кому нужна доврачебная помощь. Оформите вызов в один клик и отслеживайте прибытие волонтера.',
          image: require('../hands-removebg-preview.png'),
        },
        {
          title: 'Для волонтера',
          desc: 'Медики и студенты-медики помогают рядом. Принимайте заявки и спасайте жизни.',
          image: require('../volunteer-removebg-preview.png'),
        },
      ],
    },
    levels: [
      {
        title: 'Лёгкие случаи',
        desc: 'Порезы, ушибы, недомогание. Помогут студенты-медики рядом.',
        color: '#31C46C',
        image: require('../student-removebg-preview.png'),
      },
      {
        title: 'Средние случаи',
        desc: 'Высокая температура, сильная боль, ухудшение состояния. Подключаются специалисты.',
        color: '#F2C94C',
        image: require('../medic-removebg-preview.png'),
      },
      {
        title: 'Экстренные случаи',
        desc: 'Потеря сознания, ДТП, тяжёлое состояние. Сразу рекомендуем скорую помощь.',
        color: '#F05D5E',
        image: require('../emergency-removebg-preview.png'),
      },
    ],
    timeline: [
      {
        title: 'Нажми кнопку',
        desc: 'Система мгновенно определит твои координаты.',
        image: require('../button-removebg-preview.png'),
      },
      {
        title: 'Подбор медика',
        desc: 'Алгоритм найдёт ближайшего верифицированного специалиста.',
        image: require('../volunteer-removebg-preview.png'),
      },
      {
        title: 'Отслеживай путь',
        desc: 'На карте будет видно, как помощь приближается.',
        image: require('../map-removebg-preview.png'),
      },
      {
        title: 'Оценка и отзыв',
        desc: 'После помощи можно оставить оценку и комментарий.',
        image: require('../score-removebg-preview.png'),
      },
    ],
  },
  en: {
    skip: 'Skip',
    create: 'Create account',
    login: 'Log in',
    continue: 'Continue',
    slides: [
      {
        title: 'Tayan is close when help matters',
        body: 'Immediate first aid is closer than you think. We connect people so no one is left alone in a hard moment.',
        cta: 'Start',
      },
      {
        title: 'There are 2 ways to use the app:',
        body: 'On the next step you can continue with the flow that fits you.',
        cta: 'Next',
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
    roleDemo: {
      title: 'There are 2 ways to use the app:',
      intro: 'This screen is a quick overview, not a role selection yet.',
      cards: [
        {
          title: 'For a patient',
          desc: 'For people who need first aid. Create a request in one tap and track volunteer arrival.',
          image: require('../hands-removebg-preview.png'),
        },
        {
          title: 'For a volunteer',
          desc: 'Medics and medical students can help nearby people by accepting requests quickly.',
          image: require('../volunteer-removebg-preview.png'),
        },
      ],
    },
    levels: [
      {
        title: 'Light cases',
        desc: 'Cuts, bruises, mild discomfort. Nearby medic students can help quickly.',
        color: '#31C46C',
        image: require('../student-removebg-preview.png'),
      },
      {
        title: 'Medium cases',
        desc: 'Fever, stronger pain, worsening condition. We connect trained clinicians.',
        color: '#F2C94C',
        image: require('../medic-removebg-preview.png'),
      },
      {
        title: 'Emergency cases',
        desc: 'Loss of consciousness, accidents, critical symptoms. Ambulance is the right choice.',
        color: '#F05D5E',
        image: require('../emergency-removebg-preview.png'),
      },
    ],
    timeline: [
      {
        title: 'Tap once',
        desc: 'Your location is detected instantly.',
        image: require('../button-removebg-preview.png'),
      },
      {
        title: 'Match a medic',
        desc: 'We find the nearest verified specialist.',
        image: require('../volunteer-removebg-preview.png'),
      },
      {
        title: 'Track the route',
        desc: 'Watch help move toward you on the map.',
        image: require('../map-removebg-preview.png'),
      },
      {
        title: 'Rate the result',
        desc: 'Leave a rating and short feedback after support.',
        image: require('../score-removebg-preview.png'),
      },
    ],
  },
  kg: {
    skip: 'Өткөрүү',
    create: 'Аккаунт түзүү',
    login: 'Кирүү',
    continue: 'Улантуу',
    slides: [
      {
        title: 'Tayan жардам керек учурда жаныңда',
        body: 'Шашылыш биринчи жардам жакын. Биз адамдарды бириктирип, оор учурда эч ким жалгыз калбашы үчүн иштейбиз.',
        cta: 'Баштоо',
      },
      {
        title: 'Тиркемени колдонуунун 2 варианты бар:',
        body: 'Бул экран тандоо эмес, колдонуу жолдорун кыскача көрсөтөт.',
        cta: 'Кийинки',
      },
      {
        title: 'Акылдуу жардам тандоо',
        body: 'Тиркеме кырдаалдын оордугун өзү баалап, ылайыктуу жардамды тандап берет.',
        cta: 'Түшүндүм',
      },
      {
        title: 'Жардам алууга 4 эле кадам',
        body: 'Бир басуу, тез тандоо, картадан көзөмөлдөө жана жардамдан кийин баалоо.',
        cta: 'Сонун',
      },
      {
        title: 'Коопсуздугуң биз үчүн маанилүү',
        body: 'Бардык медиктер текшерилген, ал эми сенин маалыматың корголот. Ким бара жатканын дайыма көрөсүң.',
        cta: 'Даяр',
      },
    ],
    roleDemo: {
      title: 'Тиркемени колдонуунун 2 варианты бар:',
      intro: 'Бул экран тандоо эмес, Tayan кандайча колдонуларын көрсөтөт.',
      cards: [
        {
          title: 'Жабыркаган адам үчүн',
          desc: 'Дарыгерге чейинки жардам керек болгондор үчүн. Бир баскыч менен чакыруу түзүп, волонтердун келүүсүн көзөмөлдөңүз.',
          image: require('../hands-removebg-preview.png'),
        },
        {
          title: 'Волонтер үчүн',
          desc: 'Медиктер жана медик-студенттер жакын жерден жардам бере алышат. Сурамдарды кабыл алып, өмүр сактаңыз.',
          image: require('../volunteer-removebg-preview.png'),
        },
      ],
    },
    levels: [
      {
        title: 'Жеңил учурлар',
        desc: 'Кесик, көгөрүү, жеңил алсыроо. Жакынкы медик-студенттер жардам берет.',
        color: '#31C46C',
        image: require('../student-removebg-preview.png'),
      },
      {
        title: 'Орто учурлар',
        desc: 'Жогорку температура, катуу оору, абалдын начарлашы. Адистер кошулат.',
        color: '#F2C94C',
        image: require('../medic-removebg-preview.png'),
      },
      {
        title: 'Шашылыш учурлар',
        desc: 'Эсин жоготуу, жол кырсыгы, оор белгилер. Дароо тез жардам сунушталат.',
        color: '#F05D5E',
        image: require('../emergency-removebg-preview.png'),
      },
    ],
    timeline: [
      {
        title: 'Баскычты бас',
        desc: 'Система жайгашкан жериңди дароо аныктайт.',
        image: require('../button-removebg-preview.png'),
      },
      {
        title: 'Медик тандалат',
        desc: 'Алгоритм эң жакын текшерилген адисти табат.',
        image: require('../volunteer-removebg-preview.png'),
      },
      {
        title: 'Жолду көзөмөлдө',
        desc: 'Жардам жакындап жатканын картадан көрөсүң.',
        image: require('../map-removebg-preview.png'),
      },
      {
        title: 'Баалоо жана пикир',
        desc: 'Жардамдан кийин баа берип, пикир калтырасың.',
        image: require('../score-removebg-preview.png'),
      },
    ],
  },
};

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { lang } = useAuth();
  const palette = COPY[(lang as AppLang) || 'ru'] ?? COPY.ru;

  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = '#6D7B93';
  const activeDot = '#4AA9E8';
  const lastIndex = palette.slides.length - 1;

  const scrollRef = useRef<ScrollView | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [index, setIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const slideStyle = useMemo(
    () => ({
      width,
      paddingTop: Math.max(insets.top + 24, 32),
      paddingHorizontal: 24,
      paddingBottom: 12,
    }),
    [insets.top, width]
  );

  const complete = async (target: '/login' | '/register' = '/register') => {
    if (completing) return;
    setCompleting(true);
    await new Promise<void>((resolve) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => resolve());
    });
    await setOnboardingSeen(true);
    router.replace({ pathname: target, params: { fromOnboarding: '1' } } as any);
  };

  const goNext = async () => {
    if (index >= lastIndex) {
      await complete();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  const syncIndex = (x: number, pageWidth: number) => {
    const safeWidth = Math.max(pageWidth || width, 1);
    const nextIndex = Math.round(x / safeWidth);
    setIndex((current) => {
      const normalized = Math.max(0, Math.min(lastIndex, nextIndex));
      return current === normalized ? current : normalized;
    });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncIndex(event.nativeEvent.contentOffset.x, event.nativeEvent.layoutMeasurement.width);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncIndex(event.nativeEvent.contentOffset.x, event.nativeEvent.layoutMeasurement.width);
  };

  const footerReservedSpace = Math.max(insets.bottom + 160, 190);
  const slideMinHeight = Math.max(height - insets.top - footerReservedSpace, 460);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ThemedView style={styles.container}>
      {index < lastIndex ? (
        <Pressable
          onPress={() => void complete('/login')}
          disabled={completing}
          style={[styles.skipButton, { top: Math.max(insets.top + 6, 16) }]}>
          <ThemedText style={[styles.skipText, { color: muted }]}>{palette.skip}</ThemedText>
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        bounces={false}
        onScrollEndDrag={onScrollEnd}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}>
        <View style={slideStyle}>
          <View style={[styles.card, { backgroundColor: surface, minHeight: slideMinHeight }]}>
            <Image source={require('../shield-removebg-preview.png')} style={styles.headerImage} resizeMode="contain" />
            <Image source={require('../hands-removebg-preview.png')} style={styles.heroImage} resizeMode="contain" />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[0].title}</ThemedText>
            <ThemedText style={[styles.body, { color: text }]}>{palette.slides[0].body}</ThemedText>
          </View>
        </View>

        <View style={slideStyle}>
          <View style={[styles.card, styles.roleDemoCard, { backgroundColor: surface }]}> 
            <Image source={require('../shield-removebg-preview.png')} style={styles.headerImage} resizeMode="contain" />
            <ThemedText style={[styles.title, styles.roleTitle, { color: primary }]}>{palette.roleDemo.title}</ThemedText>
            <View style={styles.roleCardsWrap}>
              {palette.roleDemo.cards.map((card) => (
                <View key={card.title} style={styles.roleCard}>
                  <View style={styles.roleCardHead}>
                    <Image source={card.image} style={styles.roleCardImage} resizeMode="contain" />
                    <ThemedText style={[styles.roleCardTitle, { color: primary }]}>{card.title}</ThemedText>
                  </View>
                  <ThemedText style={[styles.roleCardDesc, { color: text }]}>{card.desc}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={slideStyle}>
          <View style={[styles.card, { backgroundColor: surface, minHeight: slideMinHeight }]}>
            <Image source={require('../shield-removebg-preview.png')} style={styles.headerImage} resizeMode="contain" />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[2].title}</ThemedText>
            <View style={styles.levelsWrap}>
              {palette.levels.map((level, levelIndex) => (
                <View
                  key={level.title}
                  style={[styles.levelRow, levelIndex < palette.levels.length - 1 ? styles.levelDivider : null]}>
                  <View style={[styles.levelIcon, { backgroundColor: `${level.color}22` }]}>
                    <Image source={level.image} style={styles.levelImage} resizeMode="contain" />
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
          <View style={[styles.card, { backgroundColor: surface, minHeight: slideMinHeight }]}>
            <Image source={require('../shield-removebg-preview.png')} style={styles.headerImage} resizeMode="contain" />
            <ThemedText style={[styles.title, { color: primary }]}>{palette.slides[3].title}</ThemedText>
            <View style={styles.timelineWrap}>
              {palette.timeline.map((step, stepIndex) => (
                <View key={step.title} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineIconWrap}>
                      <Image source={step.image} style={styles.timelineImage} resizeMode="contain" />
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
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.finalSlideScrollContent, { paddingBottom: footerReservedSpace }]}>
            <View style={[styles.card, styles.finalCard, { backgroundColor: surface, minHeight: slideMinHeight }]}>
              <Image source={require('../shield-removebg-preview.png')} style={styles.headerImage} resizeMode="contain" />
              <ThemedText style={[styles.title, styles.finalTitle, { color: primary }]}>{palette.slides[4].title}</ThemedText>
              <LinearGradient colors={['#CFF6F1', '#D6EAFF']} style={styles.finalShieldGlow}>
                <Image source={require('../shield-removebg-preview.png')} style={styles.finalShieldImage} resizeMode="contain" />
              </LinearGradient>
              <ThemedText style={[styles.body, styles.finalBody, { color: text }]}>{palette.slides[4].body}</ThemedText>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
        <View style={styles.dotsRow}>
          {Array.from({ length: palette.slides.length }, (_, dotIndex) => (
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

        {index < lastIndex ? (
          <Pressable onPress={() => void goNext()} style={styles.actionWrap} disabled={completing}>
            <LinearGradient colors={['#9AF2DE', '#6DE8C3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>{palette.slides[index].cta}</ThemedText>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={() => void complete()} style={styles.actionWrap} disabled={completing}>
            <LinearGradient colors={['#13E0C7', '#12C69F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>{palette.continue}</ThemedText>
            </LinearGradient>
          </Pressable>
        )}
      </View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FDFF',
  },
  pager: {
    flex: 1,
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
  headerImage: {
    width: 30,
    height: 30,
    alignSelf: 'center',
    marginBottom: 18,
  },
  heroImage: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginBottom: 18,
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
  roleTitle: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 22,
  },
  roleDemoCard: {
    justifyContent: 'flex-start',
    paddingBottom: 14,
  },
  roleIntro: {
    marginBottom: 14,
  },
  roleCardsWrap: {
    gap: 18,
  },
  roleCard: {
    borderWidth: 2,
    borderColor: '#C9E8F5',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FDFF',
  },
  roleCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  roleCardImage: {
    width: 28,
    height: 28,
  },
  roleCardTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  roleCardDesc: {
    fontSize: 16,
    lineHeight: 21,
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
  levelImage: {
    width: 44,
    height: 44,
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
  timelineImage: {
    width: 34,
    height: 34,
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
  finalSlideScrollContent: {
    flexGrow: 1,
  },
  finalCard: {
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  },
  finalShieldImage: {
    width: 132,
    height: 132,
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
