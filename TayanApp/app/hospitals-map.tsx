import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getGeoOrNull } from '@/lib/location';
import { loadNearbyHospitals, type HospitalItem } from '@/lib/hospitals';
import { t } from '@/lib/i18n';
import { open2GisPoint, open2GisRoute } from '@/lib/two-gis';
import { useAuth } from '@/providers/auth-provider';

const DEFAULT_LAT = 42.8746;
const DEFAULT_LNG = 74.5698;
const RADIUS_M = 5000;
const LIMIT = 30;

export default function HospitalsMapScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const bg = useThemeColor({}, 'background');
  const { lang } = useAuth();

  const mapRef = useRef<MapView | null>(null);
  const hospitalMarkerRefs = useRef<Record<string, any>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const cardYByKey = useRef<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [statusKind, setStatusKind] = useState<'info' | 'danger' | null>('info');
  const [statusText, setStatusText] = useState<string>(t(lang, 'hospitals_map.searching'));
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState<HospitalItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const hospitalKey = useCallback((h: HospitalItem) => `${h.name}:${h.lat}:${h.lng}`, []);

  const scrollToHospitalKey = useCallback((key: string) => {
    const y = cardYByKey.current[key];
    if (typeof y !== 'number') return;
    try {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    } catch {

    }
  }, []);

  const userCoord = useMemo(() => {
    const lat = user?.lat;
    const lng = user?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { latitude: lat, longitude: lng };
  }, [user?.lat, user?.lng]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setStatusKind('info');
    setStatusText(t(lang, 'hospitals_map.searching'));

    try {
      const geo = await getGeoOrNull();
      const lat0 = geo?.lat ?? DEFAULT_LAT;
      const lng0 = geo?.lng ?? DEFAULT_LNG;
      setUser({ lat: lat0, lng: lng0 });

      const list = await loadNearbyHospitals({ lat: lat0, lng: lng0, radius: RADIUS_M, limit: LIMIT, lang });
      setItems(Array.isArray(list) ? list : []);

      setStatusKind('info');
      setStatusText(
        t(lang, 'hospitals_map.found', { count: Array.isArray(list) ? list.length : 0 })
      );
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : t(lang, 'hospitals_map.load_failed');
      setStatusKind('danger');
      setStatusText(t(lang, 'hospitals_map.error_status', { message: msg }));
      Alert.alert(t(lang, 'common.error'), msg, [{ text: t(lang, 'common.ok'), onPress: () => router.replace('/home') }]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
      return () => {};
    }, [loadAll])
  );

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const coords: { latitude: number; longitude: number }[] = [];
    if (userCoord) coords.push(userCoord);
    for (const h of items) {
      if (typeof h?.lat !== 'number' || typeof h?.lng !== 'number') continue;
      coords.push({ latitude: h.lat, longitude: h.lng });
    }
    if (!coords.length) return;
    try {
      m.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true });
    } catch {
  
    }
  }, [userCoord?.latitude, userCoord?.longitude, items.length]);

  async function openRoute(h: HospitalItem) {
    try {
      const toLat = Number(h.lat);
      const toLng = Number(h.lng);
      if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) throw new Error('bad_coords');

      if (user && Number.isFinite(Number(user.lat)) && Number.isFinite(Number(user.lng))) {
        const ok = await open2GisRoute({
          toLat,
          toLng,
          fromLat: Number(user.lat),
          fromLng: Number(user.lng),
        });
        if (!ok) throw new Error('open_2gis_failed');
      } else {
        const ok = await open2GisPoint({ lat: toLat, lng: toLng });
        if (!ok) throw new Error('open_2gis_failed');
      }
    } catch {
      Alert.alert(t(lang, 'common.error'), t(lang, 'common.open_2gis_failed'));
    }
  }

  function focusOnMap(h: HospitalItem) {
    setSelectedKey(hospitalKey(h));
    const m = mapRef.current;
    if (!m) return;
    try {
      m.animateToRegion(
        {
          latitude: h.lat,
          longitude: h.lng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        400
      );
    } catch {

    }

    const key = hospitalKey(h);
    const ref = hospitalMarkerRefs.current[key];
    try {
      ref?.showCallout?.();
    } catch {

    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'hospitals_map.title')}</ThemedText>
        </View>

      {statusKind ? (
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: statusKind === 'danger' ? '#FFEBEE' : '#E3F2FD',
              borderColor: statusKind === 'danger' ? '#EF9A9A' : '#90CAF9',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusKind === 'danger' ? danger : '#1565C0' },
            ]}
          >
            {statusText}
          </Text>
        </View>
      ) : null}
      </View>

    <View style={[styles.mapWrap, { borderColor: border, backgroundColor: surface }]}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={styles.map}
        initialRegion={{
          latitude: user?.lat ?? DEFAULT_LAT,
          longitude: user?.lng ?? DEFAULT_LNG,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {userCoord ? <Marker coordinate={userCoord} title={t(lang, 'common.you')} pinColor={primary} /> : null}
        {items.map((h) => {
          const key = hospitalKey(h);
          const isSelected = selectedKey === key;
          return (
          <Marker
            key={key}
            ref={(r) => {
              hospitalMarkerRefs.current[key] = r;
            }}
            coordinate={{ latitude: h.lat, longitude: h.lng }}
            title={`🏥 ${h.name}`}
            description={h.address || undefined}
            pinColor={isSelected ? primary : '#22c55e'}
            onPress={() => {
              setSelectedKey(key);
              scrollToHospitalKey(key);
            }}
          />
          );
        })}
      </MapView>
    </View>

    <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { backgroundColor: bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : null}

      {!loading && !items.length ? (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <ThemedText>{t(lang, 'hospitals_map.empty')}</ThemedText>
        </View>
      ) : null}

      {items.map((h) => {
        const key = hospitalKey(h);
        const isSelected = selectedKey === key;
        return (
        <View
          key={key}
          onLayout={(e) => {
            cardYByKey.current[key] = e.nativeEvent.layout.y;
          }}
          style={[
            styles.hItem,
            { backgroundColor: bg, borderColor: isSelected ? primary : border },
          ]}
        >
          <ThemedText style={[styles.hTitle, { color: titleColor }]}>🏥 {h.name}</ThemedText>
          {h.address ? (
            <ThemedText style={styles.hAddr}>📍 {h.address}</ThemedText>
          ) : null}
          <ThemedText style={styles.hDist}>📏 {t(lang, 'hospitals_map.distance_km', { km: String(h.distance_km) })}</ThemedText>
          <View style={styles.hActions}>
            <Pressable onPress={() => openRoute(h)} style={[styles.btnOutline, { borderColor: primary }]}>
              <ThemedText style={[styles.btnOutlineText, { color: titleColor }]}>🧭 {t(lang, 'common.route')}</ThemedText>
            </Pressable>
            <Pressable onPress={() => focusOnMap(h)} style={[styles.btnPrimary, { backgroundColor: primary }]}>
              <ThemedText style={styles.btnPrimaryText}>📌 {t(lang, 'hospitals_map.on_map')}</ThemedText>
            </Pressable>
          </View>
        </View>
        );
      })}
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
  statusBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  statusText: { fontWeight: '700' },

  mapWrap: {
    height: 360,
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  map: { flex: 1 },

  content: { padding: 24, paddingTop: 20 },
  center: { paddingVertical: 16, alignItems: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  hItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  hTitle: { fontWeight: '700' },
  hAddr: { marginTop: 4, fontSize: 14, opacity: 0.85 },
  hDist: { marginTop: 6, fontSize: 13, opacity: 0.7 },
  hActions: { flexDirection: 'row', gap: 8, marginTop: 10 },

  btnOutline: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { fontWeight: '700' },
  btnPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
