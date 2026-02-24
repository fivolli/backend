import { Pressable, ScrollView, StyleSheet, View, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryById } from '@/lib/categories-data';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { me, lang } = useAuth();
  const category = getCategoryById(params.id);

  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  if (!category) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ThemedText style={styles.backText}>←</ThemedText>
            </Pressable>
            <ThemedText style={styles.headerTitle}>{t(lang, 'category.title')}</ThemedText>
          </View>
        </View>
        <View style={styles.fallback}>
          <ThemedText>{t(lang, 'category.not_found')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isUser = me?.role === 'user';

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{category.title[lang] || category.title.ru}</ThemedText>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.alertDanger}>
          <ThemedText style={styles.alertDangerText}>{t(lang, 'category.warning_text')}</ThemedText>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: primary }]}>{t(lang, 'category.step_by_step')}</ThemedText>

        <View style={styles.stepList}>
          {(category.steps[lang] || category.steps.ru).map((step, idx) => (
            <View
              key={`${category.id}-${idx}`}
              style={[styles.stepItem, { backgroundColor: surface, borderColor: border }]}
            >
              <View style={[styles.stepNumber, { backgroundColor: primary }]}>
                <ThemedText style={styles.stepNumberText}>{idx + 1}</ThemedText>
              </View>
              <ThemedText style={[styles.stepText, { color: primary }]}>{step}</ThemedText>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => Linking.openURL('tel:103')}
          style={[styles.btn, { backgroundColor: danger, marginTop: 24 }]}
        >
          <ThemedText style={styles.btnTextLight}>{t(lang, 'category.call_ambulance_103')}</ThemedText>
        </Pressable>

        {isUser ? (
          <Pressable
            onPress={() => router.dismissTo('/home')}
            style={[styles.btn, { backgroundColor: primary, marginTop: 12 }]}
          >
            <ThemedText style={styles.btnTextLight}>{t(lang, 'category.call_volunteer')}</ThemedText>
          </Pressable>
        ) : null}
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

  fallback: { padding: 24 },

  content: { padding: 24 },
  alertDanger: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#EF9A9A',
  },
  alertDangerText: { color: '#B71C1C', fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  stepList: { gap: 12 },
  stepItem: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { color: '#fff', fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14 },

  btn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextLight: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
