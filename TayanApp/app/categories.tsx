import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { CATEGORIES, withAlpha } from '@/lib/categories-data';
import { useAuth } from '@/providers/auth-provider';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const { lang } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'categories.title')}</ThemedText>
        </View>
      </View>

      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/category', params: { id: item.id } })}
            style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}
          >
            <LinearGradient
              colors={[item.color, withAlpha(item.color, '88')]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.categoryCard}
            >
              <View style={styles.categoryIcon}>
                <ThemedText style={styles.categoryIconText}>{item.icon}</ThemedText>
              </View>
              <ThemedText numberOfLines={3} style={[styles.categoryTitle, { color: primary }]}>
                {item.title[lang] || item.title.ru}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        )}
      />
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

  content: { padding: 24 },

  gridItem: { flex: 1, marginBottom: 16 },
  gridItemLeft: { marginRight: 16 },
  gridItemRight: { marginRight: 0 },

  categoryCard: {
    height: 190,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  categoryIconText: { fontSize: 32, lineHeight: 36, textAlign: 'center' },
  categoryTitle: { textAlign: 'center', fontWeight: '700', lineHeight: 20 },
});
