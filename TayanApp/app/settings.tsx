import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';

function langLabel(code: 'ru' | 'en' | 'kg') {
  if (code === 'ru') return 'Русский';
  if (code === 'kg') return 'Кыргызча';
  return 'English';
}

function themeTitle(lang: 'ru' | 'en' | 'kg') {
  if (lang === 'en') return 'Theme';
  if (lang === 'kg') return 'Тема';
  return 'Тема';
}

function themeSubtitle(lang: 'ru' | 'en' | 'kg', themePreference: 'system' | 'light' | 'dark', darkModeEnabled: boolean) {
  if (themePreference === 'system') {
    if (lang === 'en') return 'System';
    if (lang === 'kg') return 'Системалык';
    return 'Системная';
  }
  if (darkModeEnabled) {
    if (lang === 'en') return 'Dark';
    if (lang === 'kg') return 'Караңгы';
    return 'Тёмная';
  }
  if (lang === 'en') return 'Light';
  if (lang === 'kg') return 'Жарык';
  return 'Светлая';
}

function themeMetaLabel(lang: 'ru' | 'en' | 'kg', isSystem: boolean) {
  if (isSystem) {
    if (lang === 'en') return 'System mode enabled';
    if (lang === 'kg') return 'Системалык режим күйгөн';
    return 'Включен системный режим';
  }
  if (lang === 'en') return 'Use system theme';
  if (lang === 'kg') return 'Системалык теманы колдонуу';
  return 'Использовать системную тему';
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const mutedBg = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const { signOut, lang } = useAuth();
  const { themePreference, setThemePreference, colorScheme } = useAppTheme();
  const darkModeEnabled = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'settings.title')}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.functionList}>
          <ThemeItem
            surface={surface}
            mutedBg={mutedBg}
            primary={primary}
            lang={lang}
            title={themeTitle(lang)}
            subtitle={themeSubtitle(lang, themePreference, darkModeEnabled)}
            value={darkModeEnabled}
            onValueChange={(next) => void setThemePreference(next ? 'dark' : 'light')}
            onResetToSystem={() => void setThemePreference('system')}
            isSystem={themePreference === 'system'}
          />

          <SettingsItem
            surface={surface}
            mutedBg={mutedBg}
            textColor={text}
            primary={primary}
            icon="🔔"
            title={t(lang, 'settings.notifications')}
            subtitle={t(lang, 'settings.notifications_sub')}
            onPress={() => router.push('/notifications')}
          />

          <SettingsItem
            surface={surface}
            mutedBg={mutedBg}
            textColor={text}
            primary={primary}
            icon="🌐"
            title={t(lang, 'settings.language')}
            subtitle={langLabel(lang)}
            onPress={() => router.push('/language')}
          />

          <SettingsItem
            surface={surface}
            mutedBg={mutedBg}
            textColor={text}
            primary={primary}
            icon="🔒"
            title={t(lang, 'settings.privacy')}
            subtitle={t(lang, 'settings.privacy_sub')}
            onPress={() => router.push('/privacy')}
          />

          <SettingsItem
            surface={surface}
            mutedBg={mutedBg}
            textColor={text}
            primary={primary}
            icon="❓"
            title={t(lang, 'settings.help')}
            subtitle={t(lang, 'settings.help_sub')}
            onPress={() => router.push('/help')}
          />
        </View>

        <Pressable
          style={[styles.logoutBtn, { borderColor: '#B91717' }]}
          onPress={async () => {
            if (Platform.OS === 'web') {
              await signOut();
              router.replace('/login');
              return;
            }
            Alert.alert(t(lang, 'settings.logout_title'), t(lang, 'settings.logout_confirm'), [
              { text: t(lang, 'common.cancel'), style: 'cancel' },
              {
                text: t(lang, 'settings.logout'),
                style: 'destructive',
                onPress: async () => {
                  await signOut();
                  router.replace('/login');
                },
              },
            ]);
          }}
        >
          <ThemedText style={styles.logoutText}>{t(lang, 'settings.logout')}</ThemedText>
        </Pressable>

        <ThemedText style={styles.versionText}>{t(lang, 'common.app_version')}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function ThemeItem(props: {
  surface: string;
  mutedBg: string;
  primary: string;
  lang: 'ru' | 'en' | 'kg';
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  onResetToSystem: () => void;
  isSystem: boolean;
}) {
  return (
    <View style={[styles.functionItem, { backgroundColor: props.surface }]}>
      <View style={[styles.functionIconBox, { backgroundColor: props.mutedBg }]}>
        <ThemedText style={styles.functionIconText}>🌙</ThemedText>
      </View>

      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.functionTitle, { color: props.primary }]}>{props.title}</ThemedText>
        <ThemedText style={styles.functionSubtitle}>{props.subtitle}</ThemedText>

        <Pressable onPress={props.onResetToSystem} style={({ pressed }) => [styles.themeMetaPill, pressed ? { opacity: 0.86 } : null]}>
          <ThemedText style={[styles.themeMetaText, props.isSystem ? styles.themeMetaTextActive : null]}>
            {themeMetaLabel(props.lang, props.isSystem)}
          </ThemedText>
        </Pressable>
      </View>

      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        trackColor={{ false: '#C9CFD8', true: 'rgba(44,45,95,0.45)' }}
        thumbColor={props.value ? props.primary : '#F8FAFC'}
      />
    </View>
  );
}

function SettingsItem(props: {
  surface: string;
  mutedBg: string;
  textColor: string;
  primary: string;
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={props.onPress} style={[styles.functionItem, { backgroundColor: props.surface }]}>
      <View style={[styles.functionIconBox, { backgroundColor: props.mutedBg }]}>
        <ThemedText style={styles.functionIconText}>{props.icon}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.functionTitle, { color: props.primary }]}>{props.title}</ThemedText>
        <ThemedText style={styles.functionSubtitle}>{props.subtitle}</ThemedText>
      </View>
      <ThemedText style={[styles.functionChevron, { color: props.textColor }]}>›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },

  content: { padding: 24, paddingBottom: 28 },
  functionList: { gap: 12 },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  functionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  functionIconText: { fontSize: 18 },
  functionTitle: { fontSize: 15, fontWeight: '700' },
  functionSubtitle: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  functionChevron: { fontSize: 18, opacity: 0.8 },
  themeMetaPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(44,45,95,0.08)',
  },
  themeMetaText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
  themeMetaTextActive: { opacity: 1 },

  logoutBtn: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#B91717', fontWeight: '700' },
  versionText: { textAlign: 'center', opacity: 0.55, marginTop: 18, fontSize: 12 },
});
