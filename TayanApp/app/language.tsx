import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

const LANGS: Array<{ code: 'ru' | 'kg' | 'en'; name: string; flag: string }> = [
  { code: 'ru', name: 'Русский', flag: 'RU' },
  { code: 'kg', name: 'Кыргызча', flag: 'KG' },
  { code: 'en', name: 'English', flag: 'EN' },
];

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const infoSurface = useThemeColor({ light: '#EAF2FF', dark: '#1A2236' }, 'surface');
  const text = useThemeColor({}, 'text');
  const { lang, setLang } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'language.title')}</ThemedText>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {LANGS.map((x) => {
          const selected = x.code === lang;
          return (
            <Pressable
              key={x.code}
              onPress={() => setLang(x.code)}
              style={[styles.langOption, { backgroundColor: surface, borderColor: selected ? primary : border }]}
            >
              <View style={styles.langRow}>
                <ThemedText style={styles.flag}>{x.flag}</ThemedText>
                <ThemedText style={[styles.langName, { color: titleColor }]}>{x.name}</ThemedText>
              </View>
              {selected ? <ThemedText style={[styles.check, { color: titleColor }]}>✓</ThemedText> : null}
            </Pressable>
          );
        })}

        <View style={[styles.noteBox, { backgroundColor: infoSurface }]}>
          <ThemedText style={[styles.noteText, { color: text }]}>{t(lang, 'language.applied')}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
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

  content: { padding: 24, paddingTop: 32, gap: 12 },
  langOption: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 28, lineHeight: 34 },
  langName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  check: { fontSize: 18, fontWeight: '700' },

  noteBox: { marginTop: 12, borderRadius: 14, padding: 12 },
  noteText: {},
});
