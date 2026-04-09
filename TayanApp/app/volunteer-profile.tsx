import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AppIcon } from '@/components/app-icon';

type VolunteerRating = {
  volunteer_id: number;
  avg_rating: number;
  reviews_count: number;
};

type VolunteerReviewItem = {
  request_id: number;
  rating: number;
  review_text?: string | null;
  reviewed_at: string;
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

export default function VolunteerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { volunteerId, name } = useLocalSearchParams<{ volunteerId?: string; name?: string }>();

  const primary = useThemeColor({}, 'primary');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({ light: '#555', dark: '#C3CCDA' }, 'tabIconDefault');

  const { token, lang } = useAuth();

  const id = useMemo(() => {
    const raw = Array.isArray(volunteerId) ? volunteerId[0] : volunteerId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [volunteerId]);

  const title = useMemo(() => {
    const raw = Array.isArray(name) ? name[0] : name;
    return (raw && String(raw).trim()) ? String(raw) : t(lang, 'volunteer_profile.title_fallback');
  }, [name, lang]);

  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<VolunteerRating | null>(null);
  const [reviews, setReviews] = useState<VolunteerReviewItem[]>([]);

  const load = useCallback(async () => {
    if (!id) {
      Alert.alert(t(lang, 'common.error'), t(lang, 'volunteer_profile.no_id'));
      router.back();
      return;
    }

    setLoading(true);
    try {
      const [r, list] = await Promise.all([
        api<VolunteerRating>(`/volunteer/${id}/rating`, { method: 'GET', token, lang }),
        api<VolunteerReviewItem[]>(`/volunteer/${id}/reviews?limit=50&offset=0`, { method: 'GET', token, lang }),
      ]);

      setRating(r || null);
      setReviews(Array.isArray(list) ? list : []);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : t(lang, 'volunteer_profile.load_failed');
      Alert.alert(t(lang, 'common.error'), msg, [{ text: t(lang, 'common.ok'), onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [id, token, lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const avgText = useMemo(() => {
    const v = rating?.avg_rating ?? 0;
    return (Number.isFinite(v) ? v : 0).toFixed(1);
  }, [rating?.avg_rating]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{title}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <View style={[styles.volHeaderCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.volHeaderRow}>
                <View style={[styles.volAvatar, { backgroundColor: 'rgba(44,45,95,0.1)' }]}>
                  <AppIcon name="profile" size={20} color={titleColor} />
                </View>

                <View style={styles.volMain}>
                  <ThemedText style={[styles.volName, { color: titleColor }]}>{title}</ThemedText>

                  <View style={styles.volRatingRow}>
                    <ThemedText style={[styles.volAvg, { color: text }]}>{avgText}</ThemedText>
                    <Text style={styles.volStars}>{renderStars(rating?.avg_rating ?? 0)}</Text>
                  </View>

                  <ThemedText style={styles.volCount}>{t(lang, 'volunteer_profile.reviews_count', { count: rating?.reviews_count ?? 0 })}</ThemedText>
                </View>

                <View style={styles.volRight}>
                  <View style={styles.badges}>
                    <View style={[styles.badge, styles.badgeBlue]}>
                      <ThemedText style={styles.badgeText}>{t(lang, 'volunteer_profile.badge_verified')}</ThemedText>
                    </View>
                    <View style={[styles.badge, styles.badgeGreen]}>
                      <ThemedText style={styles.badgeText}>{t(lang, 'volunteer_profile.badge_first_aid')}</ThemedText>
                    </View>
                    <View style={[styles.badge, styles.badgeGray]}>
                      <ThemedText style={styles.badgeText}>{t(lang, 'volunteer_profile.badge_city_bishkek')}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable style={[styles.iconBtn, styles.iconBtnOutline, { borderColor: border }]} onPress={() => {}}>
                      <AppIcon name="chat" size={18} color={titleColor} />
                    </Pressable>
                    <Pressable style={[styles.iconBtn, { backgroundColor: primary }]} onPress={() => {}}>
                      <AppIcon name="mapPin" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'volunteer_profile.reviews_title')}</ThemedText>

            {reviews.length ? (
              <View style={styles.list}>
                {reviews.map((x) => {
                  const userName = x.user_name || t(lang, 'reviews.user_fallback', { id: x.user_id });
                  return (
                    <View key={String(x.request_id)} style={[styles.reviewCard, { backgroundColor: surface }]}>
                      <View style={styles.reviewTopRow}>
                        <View>
                          <ThemedText style={[styles.userName, { color: titleColor }]}>{userName}</ThemedText>
                          <ThemedText style={styles.reviewedAt}>{fmtTimeIso(x.reviewed_at)}</ThemedText>
                        </View>
                        <Text style={styles.ratingStars}>{renderStars(x.rating || 0)}</Text>
                      </View>

                      {x.review_text ? (
                        <ThemedText style={[styles.reviewText, { color: muted }]}>{String(x.review_text)}</ThemedText>
                      ) : (
                        <ThemedText style={styles.noComment}>{t(lang, 'volunteer_profile.no_comment')}</ThemedText>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }]}>
                  <ThemedText>{t(lang, 'volunteer_profile.empty_reviews')}</ThemedText>
              </View>
            )}
          </>
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
  center: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },

  volHeaderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  volHeaderRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  volAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  volAvatarText: { fontSize: 28, lineHeight: 32 },
  volMain: { flex: 1 },
  volName: { fontSize: 20, fontWeight: '800' },
  volRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  volAvg: { fontWeight: '700', fontSize: 18 },
  volStars: { fontSize: 18 },
  volCount: { color: '#666', fontSize: 13, marginTop: 4 },

  volRight: { alignItems: 'flex-end', gap: 12 },
  badges: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeBlue: { backgroundColor: 'rgba(21,101,192,0.15)' },
  badgeGreen: { backgroundColor: 'rgba(46,125,50,0.15)' },
  badgeGray: { backgroundColor: 'rgba(0,0,0,0.08)' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#E7ECF5' },

  actions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBtnOutline: { borderWidth: 1, backgroundColor: 'transparent' },
  iconBtnText: { fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  list: { gap: 16 },
  reviewCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reviewTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 12 },
  userName: { fontWeight: '700' },
  reviewedAt: { color: '#999', fontSize: 12, marginTop: 2 },
  ratingStars: { fontSize: 18 },
  reviewText: { fontSize: 14, lineHeight: 20 },
  noComment: { color: '#999', fontSize: 13 },

  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
});
