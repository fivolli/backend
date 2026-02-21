import { ActivityIndicator, Alert, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { loadVideos, normalizeVideoItem, type NormalizedVideoItem } from '@/lib/videos';
import { useAuth } from '@/providers/auth-provider';

export default function VideoDetailScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const bg = useThemeColor({}, 'background');
  const { lang } = useAuth();

  const params = useLocalSearchParams<{ id?: string; title?: string; videoUrl?: string; thumbnailUrl?: string }>();
  const id = params.id ? Number(params.id) : 0;

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<NormalizedVideoItem | null>(null);

  const initialFromParams = useMemo(() => {
    if (!id) return null;
    if (!params.videoUrl && !params.title && !params.thumbnailUrl) return null;
    return normalizeVideoItem(
      {
      id,
      title: params.title || t(lang, 'video.item_fallback'),
      video_url: params.videoUrl || '',
      thumbnail_url: params.thumbnailUrl || '',
      },
      lang
    );
  }, [id, lang, params.title, params.videoUrl, params.thumbnailUrl]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (initialFromParams) {
          setVideo(initialFromParams);
          setLoading(false);
          return;
        }

        if (!id) {
          setVideo(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        const list = await loadVideos({ lang });
        const found = list.find((x) => Number(x.id) === Number(id)) || null;
        if (alive) setVideo(found);
      } catch (e: any) {
        if (!alive) return;
        const msg = e?.message ? String(e.message) : t(lang, 'video.load_failed');
        Alert.alert(t(lang, 'common.error'), msg, [{ text: t(lang, 'common.ok'), onPress: () => router.replace('/home') }]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, initialFromParams, lang]);

  async function openVideo(url: string) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t(lang, 'common.error'), t(lang, 'video_detail.open_failed'));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'video_detail.title')}</ThemedText>
        </View>
      </View>

      {!video ? (
        <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bg }]}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText>{t(lang, 'video_detail.not_found')}</ThemedText>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          <Pressable onPress={() => openVideo(video.video_url)} disabled={!video.video_url}>
            <View style={[styles.playerWrap, { backgroundColor: '#000' }]}>
              {video.thumbnail_url ? (
                <ImageBackground source={{ uri: video.thumbnail_url }} style={styles.playerImage} resizeMode="cover">
                  <View style={styles.playCircle}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={[styles.playerImage, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={styles.playCircle}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>
              )}
            </View>
          </Pressable>

          <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bg }]}>
            <ThemedText style={[styles.title, { color: primary }]}>{video.title}</ThemedText>

            {video.video_url ? (
              <>
                <Pressable onPress={() => openVideo(video.video_url)} style={[styles.btn, { backgroundColor: primary }]}>
                  <ThemedText style={styles.btnText}>{t(lang, 'video_detail.open_link')}</ThemedText>
                </Pressable>
                <ThemedText style={styles.urlText}>
                  {video.video_url}
                </ThemedText>
              </>
            ) : null}
          </ScrollView>
        </>
      )}
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

  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  playerImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 20, color: '#000' },

  content: { padding: 24 },
  center: { paddingVertical: 20, alignItems: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  urlText: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
  },
});
