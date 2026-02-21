import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

type VolunteerMyItem = {
  id: number;
  kind: 'sos' | 'symptom' | string;
  status: 'new' | 'accepted' | 'in_progress' | 'completed' | 'canceled' | string;
  created_at: string;
  accepted_at?: string | null;
  in_progress_at?: string | null;
  completed_at?: string | null;
  canceled_at?: string | null;
};

function statusLabel(lang: 'ru' | 'en' | 'kg', status: string) {
  if (status === 'new') return t(lang, 'request.status.new');
  if (status === 'accepted') return t(lang, 'request.status.accepted');
  if (status === 'in_progress') return t(lang, 'request.status.in_progress');
  if (status === 'completed') return t(lang, 'request.status.completed');
  if (status === 'canceled') return t(lang, 'request.status.canceled');
  return status;
}

function kindLabel(lang: 'ru' | 'en' | 'kg', kind: string) {
  if (kind === 'sos') return t(lang, 'request.kind.sos');
  if (kind === 'symptom') return t(lang, 'request.kind.symptom');
  return kind;
}

function fmtTimeIso(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function fmtReactionMinutes(lang: 'ru' | 'en' | 'kg', createdAt: string, acceptedAt?: string | null) {
  if (!acceptedAt) return '—';
  const c = new Date(createdAt);
  const a = new Date(acceptedAt);
  if (Number.isNaN(c.getTime()) || Number.isNaN(a.getTime())) return '—';
  const min = Math.max(0, Math.floor((a.getTime() - c.getTime()) / 60000));
  return t(lang, 'volunteer_my.minutes_short', { minutes: min });
}

export default function VolunteerMyScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const infoBg = useThemeColor({}, 'infoBg');
  const infoBorder = useThemeColor({}, 'infoBorder');
  const successBg = useThemeColor({}, 'successBg');
  const successBorder = useThemeColor({}, 'successBorder');
  const dangerBg = useThemeColor({}, 'dangerBg');
  const dangerBorder = useThemeColor({}, 'dangerBorder');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const bg = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const { token, lang, me } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<VolunteerMyItem[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const r = await api<VolunteerMyItem[]>('/volunteer/my', { method: 'GET', token, lang });
        if (alive) setItems(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (alive)
          Alert.alert(
            t(lang, 'common.error'),
            e?.message ? String(e.message) : t(lang, 'volunteer_my.load_failed')
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, lang]);

  const isVolunteer = me?.role === 'volunteer';

  function cardThemeForStatus(status: string) {
    if (status === 'completed') {
      return { cardBg: successBg, cardBorder: successBorder, titleColor: success };
    }
    if (status === 'canceled') {
      return { cardBg: dangerBg, cardBorder: dangerBorder, titleColor: danger };
    }
    if (status === 'in_progress') {
      return { cardBg: infoBg, cardBorder: infoBorder, titleColor: primary };
    }
    return { cardBg: surface, cardBorder: border, titleColor: primary };
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'volunteer_my.title')}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!token ? (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'volunteer_my.need_sign_in')}</ThemedText>
            <Pressable onPress={() => router.push('/profile')} style={[styles.btn, { backgroundColor: primary }]}>
              <ThemedText style={styles.btnText}>{t(lang, 'common.open_profile')}</ThemedText>
            </Pressable>
          </View>
        ) : !isVolunteer ? (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'volunteer_my.only_volunteer')}</ThemedText>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((x) => (
              (() => {
                const themed = cardThemeForStatus(x.status);
                return (
              <Pressable
                key={String(x.id)}
                onPress={() => router.push({ pathname: '/request', params: { id: String(x.id) } })}
                style={({ pressed }) => [
                  styles.functionItem,
                  { backgroundColor: themed.cardBg, borderColor: themed.cardBorder },
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <View style={[styles.functionIconBox, { backgroundColor: bg }]}>
                  <ThemedText style={styles.functionIconText}>{x.kind === 'sos' ? '🚨' : '🩹'}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.rowTitle, { color: themed.titleColor }]}>
                    {kindLabel(lang, x.kind)} • {statusLabel(lang, x.status)}
                  </ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {t(lang, 'volunteer_my.created', { time: fmtTimeIso(x.created_at) })}
                  </ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {t(lang, 'volunteer_my.reaction', {
                      time: fmtReactionMinutes(lang, x.created_at, x.accepted_at),
                    })}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.chevron, { color: text }]}>›</ThemedText>
              </Pressable>
                );
              })()
            ))}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'volunteer_my.empty')}</ThemedText>
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
    gap: 12,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  center: { paddingVertical: 20, alignItems: 'center' },
  list: { gap: 12 },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  functionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  functionIconText: { fontSize: 20 },
  rowTitle: { fontWeight: '600' },
  rowSub: { opacity: 0.7, fontSize: 12, marginTop: 4 },
  chevron: { fontSize: 18, opacity: 0.9 },
});
