import { ActivityIndicator, Alert, FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { loadVideos, type NormalizedVideoItem } from '@/lib/videos';
import { useAuth } from '@/providers/auth-provider';

export default function VideoScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const bg = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const { lang } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NormalizedVideoItem[]>([]);
  const inFlight = useRef(false);

  const loadAll = useCallback(
    async (showSpinner: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (showSpinner) setLoading(true);
      try {
        const list = await loadVideos({ lang });
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : t(lang, 'video.load_failed');
        Alert.alert(t(lang, 'common.error'), msg, [{ text: t(lang, 'common.ok'), onPress: () => router.replace('/home') }]);
      } finally {
        inFlight.current = false;
        if (showSpinner) setLoading(false);
      }
    },
    [lang]
  );

  useFocusEffect(
    useCallback(() => {
      void loadAll(true);
      return () => {};
    }, [loadAll])
  );

  function openItem(v: NormalizedVideoItem) {
    router.push({
      pathname: '/video-detail',
      params: {
        id: String(v.id),
        title: v.title,
        videoUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url,
      },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'video.title')}</ThemedText>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={[styles.content, { backgroundColor: bg }]}
        ListHeaderComponent={() => (
          <>
            {loading && !items.length ? (
              <View style={[styles.alertBox, styles.alertInfo]}>
                <Text style={styles.alertInfoText}>{t(lang, 'video.loading')}</Text>
              </View>
            ) : null}
            {!loading && !items.length ? (
              <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                <ThemedText>{t(lang, 'video.empty')}</ThemedText>
              </View>
            ) : null}
          </>
        )}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => openItem(item)}
            style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}
          >
            <View style={[styles.videoCard, { backgroundColor: surface }]}
              >
              <View style={styles.thumbnailWrap}>
                {item.thumbnail_url ? (
                  <ImageBackground source={{ uri: item.thumbnail_url }} style={styles.thumbnail} resizeMode="cover">
                    <View style={styles.playCircle}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.thumbnail, { backgroundColor: border, alignItems: 'center', justifyContent: 'center' }]}>
                    <View style={styles.playCircle}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.videoBody}>
                <ThemedText numberOfLines={3} style={[styles.videoTitle, { color: primary }]}>
                  {item.title || t(lang, 'video.item_fallback')}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={() => (loading && items.length ? <View style={styles.footerLoading}><ActivityIndicator /></View> : null)}
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  alertBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alertInfo: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  alertInfoText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '600',
  },

  gridItem: { flex: 1, marginBottom: 16 },
  gridItemLeft: { marginRight: 16 },
  gridItemRight: { marginRight: 0 },

  videoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnailWrap: { height: 128 },
  thumbnail: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 20, color: '#000' },
  videoBody: { padding: 12 },
  videoTitle: { fontWeight: '700', fontSize: 14, lineHeight: 18 },
  footerLoading: { paddingVertical: 12 },
});
