import { Stack, router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/auth-provider';
import { initNotifications } from '@/lib/push-notifications';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

function PersistentBottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const { lang } = useAuth();

  const goHome = () => {
    if (pathname === '/home') return;
    // This makes the bottom bar behave like a tab switch: no "back" to settings.
    router.dismissTo('/home');
  };

  const goSettings = () => {
    if (pathname === '/settings') return;
    // Keep Settings as a normal screen so back returns to where user was.
    router.push('/settings');
  };

  // Keep the first screen clean.
  if (!pathname || pathname === '/') return null;

  const isHome = pathname === '/home';
  const isSettings = pathname === '/settings';

  return (
    <View style={[styles.bottomNav, { backgroundColor: surface, borderTopColor: border, paddingBottom: Math.max(10, insets.bottom) }]}>
      <Pressable
        hitSlop={10}
        onPress={goHome}
        style={({ pressed }) => [styles.bottomNavItem, pressed ? { opacity: 0.85 } : null]}
      >
        <ThemedText style={[styles.bottomNavIcon, { color: isHome ? primary : text }]}>🏠</ThemedText>
        <ThemedText style={[styles.bottomNavText, { color: isHome ? primary : text }]}>{t(lang, 'home.tab_home')}</ThemedText>
      </Pressable>

      <Pressable
        hitSlop={10}
        onPress={goSettings}
        style={({ pressed }) => [styles.bottomNavItem, pressed ? { opacity: 0.85 } : null]}
      >
        <ThemedText style={[styles.bottomNavIcon, { color: isSettings ? primary : text }]}>⚙️</ThemedText>
        <ThemedText style={[styles.bottomNavText, { color: isSettings ? primary : text }]}>{t(lang, 'settings.title')}</ThemedText>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const handledPushKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = (notification?.request?.content?.data ?? {}) as any;
        const isAiReady = data?.kind === 'ai_ready';
        const isAiChatOpen = pathname === '/chat';
        const shouldSuppress = isAiReady && isAiChatOpen;

        return {
          shouldShowAlert: !shouldSuppress,
          shouldShowBanner: !shouldSuppress,
          shouldShowList: !shouldSuppress,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
  }, [pathname]);

  useEffect(() => {
    void initNotifications();

    const goFromData = (data: any) => {
      const aiJobIdRaw = data?.ai_job_id ?? data?.aiJobId;
      const aiJobId = aiJobIdRaw != null ? Number(aiJobIdRaw) : 0;
      if (data?.kind === 'ai_ready' && Number.isFinite(aiJobId) && aiJobId > 0) {
        router.push({ pathname: '/chat', params: { ai_job_id: String(aiJobId) } });
        return;
      }

      const rawId = data?.request_id ?? data?.requestId ?? data?.id;
      const id = rawId != null ? Number(rawId) : 0;
      if (Number.isFinite(id) && id > 0) {
        if (data?.kind === 'chat_message') {
          router.push({
            pathname: '/request-chat',
            params: {
              id: String(id),
              name: data?.name ? String(data.name) : '',
              role: data?.role ? String(data.role) : '',
              phone: data?.phone ? String(data.phone) : '',
            },
          });
          return;
        }

        router.push({ pathname: '/map', params: { id: String(id) } });
        return;
      }
    };

    const handleResponse = (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;
      const req = response.notification?.request;
      const key = `${req?.identifier || 'no-id'}:${response.actionIdentifier || 'tap'}`;
      if (handledPushKeysRef.current.has(key)) return;
      handledPushKeysRef.current.add(key);

      const data = (req?.content?.data ?? {}) as any;
      goFromData(data);
    };

    void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="home" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="category" />
            <Stack.Screen name="symptom" />
            <Stack.Screen name="map" />
            <Stack.Screen name="request" />
            <Stack.Screen name="request-chat" />
            <Stack.Screen name="profile" />

            <Stack.Screen name="video" />
            <Stack.Screen name="video-detail" />
            <Stack.Screen name="hospitals-map" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="reviews" />
            <Stack.Screen name="volunteer-profile" />
            <Stack.Screen name="my-requests" />
            <Stack.Screen name="volunteer-my" />

            <Stack.Screen name="settings" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="language" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="policy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="help" />
          </Stack>
        </View>

        <PersistentBottomNav />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomNavItem: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  bottomNavIcon: { fontSize: 24 },
  bottomNavText: { fontSize: 12, fontWeight: '700' },
});
