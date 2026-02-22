import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { WebView } from 'react-native-webview';

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
  const [webError, setWebError] = useState(false);

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

  async function openVideoExternal(url: string) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t(lang, 'common.error'), t(lang, 'video_detail.open_failed'));
    }
  }

  const embedUrl = useMemo(() => {
    if (!video?.youtube_id) return '';
    const q = [
      'playsinline=1',
      'rel=0',
      'modestbranding=1',
      'autoplay=0',
    ].join('&');
    return `https://www.youtube.com/embed/${video.youtube_id}?${q}`;
  }, [video?.youtube_id]);

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
          <View style={[styles.playerWrap, { backgroundColor: '#000' }]}>
            {embedUrl && !webError ? (
              <WebView
                source={{
                  uri: embedUrl,
                  headers: {
                    Referer: 'https://www.youtube.com/',
                  },
                }}
                style={styles.playerImage}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
                onError={() => setWebError(true)}
              />
            ) : (
              <View style={[styles.playerImage, styles.fallbackWrap]}>
                <ThemedText style={styles.fallbackText}>{t(lang, 'video_detail.open_failed')}</ThemedText>
                {video.video_url ? (
                  <Pressable onPress={() => openVideoExternal(video.video_url)} style={[styles.btn, { backgroundColor: primary }]}>
                    <ThemedText style={styles.btnText}>{t(lang, 'video_detail.open_link')}</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bg }]}>
            <ThemedText style={[styles.title, { color: primary }]}>{video.title}</ThemedText>

            {video.video_url ? (
              <>
                <Pressable onPress={() => openVideoExternal(video.video_url)} style={[styles.btn, { backgroundColor: primary }]}>
                  <ThemedText style={styles.btnText}>{t(lang, 'video_detail.open_link')}</ThemedText>
                </Pressable>
                <ThemedText style={styles.urlText}>{video.video_url}</ThemedText>
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
  },
  fallbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  fallbackText: {
    color: '#fff',
    textAlign: 'center',
  },

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
