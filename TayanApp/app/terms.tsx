import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { getLegalDoc } from '@/lib/legal';
import { useAuth } from '@/providers/auth-provider';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const { lang } = useAuth();

  const doc = getLegalDoc('terms', lang);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'privacy.terms')}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.metaCard, { backgroundColor: surface, borderColor: border }]}>
          <ThemedText style={styles.metaText}>{t(lang, 'legal.updated_at', { date: doc.updatedAt })}</ThemedText>
          <ThemedText style={styles.metaHint}>{t(lang, 'legal.template_notice')}</ThemedText>
        </View>

        {doc.blocks.map((b, idx) => (
          <View key={String(idx)} style={[styles.block, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={styles.blockTitle}>{b.title}</ThemedText>
            <ThemedText style={styles.blockText}>{b.text}</ThemedText>
          </View>
        ))}
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

  content: { padding: 24, gap: 12 },

  metaCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  metaText: { fontWeight: '800', color: '#2C2D5F' },
  metaHint: { opacity: 0.8, color: '#555' },

  block: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  blockTitle: { fontWeight: '900', color: '#2C2D5F' },
  blockText: { color: '#555', lineHeight: 20 },
});
