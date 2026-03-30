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

type MyRequestItem = {
  id: number;
  kind: 'sos' | 'symptom' | string;
  status: 'new' | 'accepted' | 'in_progress' | 'completed' | 'canceled' | string;
  created_at: string;
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

function itemIcon(kind: string, status: string) {
  if (status === 'completed') return '✅';
  if (status === 'canceled') return '❌';
  if (kind === 'sos') return '🚨';
  return '🩹';
}

function fmtTimeIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function MyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const bg = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const { token, lang } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MyRequestItem[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const r = await api<MyRequestItem[]>('/requests/my', { method: 'GET', token, lang });
        if (alive) setItems(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (alive) {
          Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'my_requests.load_failed'));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, lang]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'my_requests.title')}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!token ? (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'my_requests.need_sign_in')}</ThemedText>
            <Pressable onPress={() => router.push('/profile')} style={[styles.btn, { backgroundColor: primary }]}>
              <ThemedText style={styles.btnText}>{t(lang, 'common.open_profile')}</ThemedText>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((x) => {
              const isCompleted = x.status === 'completed';
              const isCanceled = x.status === 'canceled';
              const itemBg = isCompleted ? surface : isCanceled ? surface : surface;
              const itemBorder = isCompleted ? border : isCanceled ? border : border;

              return (
                <Pressable
                  key={String(x.id)}
                  onPress={() => router.push({ pathname: '/request', params: { id: String(x.id) } })}
                  style={({ pressed }) => [
                    styles.functionItem,
                    { backgroundColor: itemBg, borderColor: itemBorder },
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <View style={[styles.functionIconBox, { backgroundColor: bg }]}>
                    <ThemedText style={styles.functionIconText}>{itemIcon(x.kind, x.status)}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.rowTitle, { color: titleColor }]}>
                      {kindLabel(lang, x.kind)} • {statusLabel(lang, x.status)}
                    </ThemedText>
                    <ThemedText style={styles.rowSub}>{fmtTimeIso(x.created_at)}</ThemedText>
                  </View>
                  <ThemedText style={[styles.chevron, { color: text }]}>›</ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText>{t(lang, 'my_requests.empty')}</ThemedText>
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
