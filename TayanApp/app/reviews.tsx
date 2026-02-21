import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

type ReviewsStats = {
  avg_rating: number;
  reviews_count: number;
};

type ReviewFeedItem = {
  request_id: number;
  rating: number;
  review_text?: string | null;
  reviewed_at: string;
  volunteer_id: number;
  volunteer_name?: string | null;
  user_id: number;
  user_name?: string | null;
  kind: string;
};

function fmtTimeIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function renderStars(rating: number) {
  const full = Math.floor(Number.isFinite(rating) ? rating : 0);
  const empty = Math.max(0, 5 - full);
  return '★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, Math.min(5, empty)));
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const bg = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const { token, lang } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReviewsStats | null>(null);
  const [items, setItems] = useState<ReviewFeedItem[]>([]);
  const pollInFlight = useRef(false);

  const avgText = useMemo(() => {
    const v = stats?.avg_rating ?? 0;
    return (Number.isFinite(v) ? v : 0).toFixed(1);
  }, [stats?.avg_rating]);

  const loadAll = useCallback(
    async (showSpinner: boolean) => {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      if (showSpinner) setLoading(true);
      try {
        const [s, r] = await Promise.all([
          api<ReviewsStats>('/reviews/stats', { method: 'GET', token, lang }),
          api<ReviewFeedItem[]>('/reviews/latest?limit=30', { method: 'GET', token, lang }),
        ]);
        setStats(s || null);
        setItems(Array.isArray(r) ? r : []);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : t(lang, 'reviews.load_failed');
        Alert.alert(t(lang, 'common.error'), msg, [{ text: t(lang, 'common.ok'), onPress: () => router.replace('/home') }]);
      } finally {
        pollInFlight.current = false;
        if (showSpinner) setLoading(false);
      }
    },
    [token, lang]
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadAll(true);

      const t = setInterval(() => {
        if (!alive) return;
        void loadAll(false);
      }, 15000);

      return () => {
        alive = false;
        clearInterval(t);
      };
    }, [loadAll])
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'reviews.title')}</ThemedText>
        </View>

        <View style={styles.statsCard}>
          {loading && !stats ? (
            <ThemedText style={styles.statsLoading}>{t(lang, 'reviews.stats_loading')}</ThemedText>
          ) : (
            <View style={styles.statsRow}>
              <View>
                <ThemedText style={styles.statsLabel}>{t(lang, 'reviews.avg_rating')}</ThemedText>
                <View style={styles.avgRow}>
                  <Text style={styles.avgValue}>{avgText}</Text>
                  <Text style={styles.avgStars}>{renderStars(stats?.avg_rating ?? 0)}</Text>
                </View>
              </View>
              <View style={styles.statsRight}>
                <ThemedText style={styles.statsLabel}>{t(lang, 'reviews.total_reviews')}</ThemedText>
                <Text style={styles.totalValue}>{String(stats?.reviews_count ?? 0)}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { color: primary }]}>{t(lang, 'reviews.section_title')}</ThemedText>
          <ThemedText style={styles.sectionNote}>{t(lang, 'reviews.section_note')}</ThemedText>
        </View>

        {loading && !items.length ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((x) => {
              const userName = x.user_name || t(lang, 'reviews.user_fallback', { id: String(x.user_id) });
              const volunteerName = x.volunteer_name || t(lang, 'reviews.volunteer_fallback', { id: String(x.volunteer_id) });

              return (
                <View key={String(x.request_id)} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <View style={styles.userRow}>
                      <View style={[styles.userAvatar, { backgroundColor: 'rgba(44,45,95,0.1)' }]}>
                        <Text style={styles.userAvatarText}>👤</Text>
                      </View>
                      <View>
                        <ThemedText style={[styles.userName, { color: primary }]}>{userName}</ThemedText>
                        <ThemedText style={styles.reviewedAt}>{fmtTimeIso(x.reviewed_at)}</ThemedText>
                      </View>
                    </View>
                    <Text style={styles.ratingEmoji}>{'⭐'.repeat(Math.max(0, Math.min(5, x.rating || 0)))}</Text>
                  </View>

                  {x.review_text ? (
                    <ThemedText style={styles.reviewText}>{String(x.review_text)}</ThemedText>
                  ) : null}

                  <View style={[styles.volBox, { backgroundColor: bg, borderColor: border }]}
                  >
                    <View style={styles.volLeft}>
                      <ThemedText style={styles.volLabel}>{t(lang, 'common.volunteer')}</ThemedText>
                      <ThemedText style={[styles.volName, { color: primary }]}>{volunteerName}</ThemedText>
                    </View>

                    <Pressable
                      style={({ pressed }) => [styles.profileBtn, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
                      onPress={() =>
                        router.push({
                          pathname: '/volunteer-profile',
                          params: { volunteerId: String(x.volunteer_id), name: x.volunteer_name || t(lang, 'common.volunteer') },
                        })
                      }
                    >
                      <ThemedText style={styles.profileBtnText}>{t(lang, 'reviews.profile_button')}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'reviews.empty')}</ThemedText>
          </View>
        )}
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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
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

  statsCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statsLoading: { color: 'rgba(255,255,255,0.7)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statsRight: { alignItems: 'flex-end' },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  avgValue: { fontSize: 28, color: 'white' },
  avgStars: { fontSize: 18, color: 'white' },
  totalValue: { fontSize: 28, color: 'white', marginTop: 4 },

  content: { padding: 24 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionNote: { color: '#999', fontSize: 13, flexShrink: 1, textAlign: 'right' },

  center: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 16 },

  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reviewTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  userRow: { flexDirection: 'row', gap: 12, flex: 1 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 20, lineHeight: 24 },
  userName: { fontWeight: '600' },
  reviewedAt: { color: '#999', fontSize: 12, marginTop: 2 },
  ratingEmoji: { fontSize: 18 },
  reviewText: { color: '#555', fontSize: 14, marginBottom: 12, lineHeight: 20 },

  volBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  volLeft: { flex: 1 },
  volLabel: { color: '#999', fontSize: 12 },
  volName: { fontWeight: '700', fontSize: 14, marginTop: 2 },
  profileBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  profileBtnText: { color: 'white', fontWeight: '700' },

  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
});
