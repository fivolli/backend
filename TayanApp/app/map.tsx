import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t, type AppLang } from '@/lib/i18n';
import { getGeoOrNull } from '@/lib/location';
import { clearLastRequestId, clearReviewLater, getLastRequestId, getReviewLater, setLastRequestId, setReviewLater } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';
import { AppIcon, type AppIconName } from '@/components/app-icon';

type TrackDetail = {
	id: number;
	kind: string;
	status: string;
	created_at?: string;
	accepted_by?: number | null;
	accepted_at?: string | null;
	in_progress_at?: string | null;
	completed_at?: string | null;
	canceled_at?: string | null;
	volunteer_name?: string | null;
	volunteer_phone?: string | null;
	rating?: number | null;
	review_text?: string | null;
	reviewed_at?: string | null;
	lat?: number | null;
	lng?: number | null;
	volunteer_lat?: number | null;
	volunteer_lng?: number | null;
	address?: string | null;
	symptoms?: string | null;
	comments?: string | null;
};

type OpenRequestItem = {
	id: number;
	kind: string;
	status: string;
	created_at: string;
	user_name?: string | null;
	severity?: string | null;
	lat?: number | null;
	lng?: number | null;
	address?: string | null;
	symptoms?: string | null;
	comments?: string | null;
};

type MyRequestForReview = {
	id: number;
	status: string;
	accepted_by?: number | null;
	rating?: number | null;
};

type VolunteerMyItem = {
	id: number;
	status: string;
};

type NearbyVolunteer = {
	id: number;
	name: string;
	phone: string;
	lat: number;
	lng: number;
	distance_km: number;
	online_minutes_ago: number;
};

type OsrmRoute = {
	distanceMeters: number;
	durationSeconds: number;
	coords: { latitude: number; longitude: number }[];
};

type VolunteerRequestDetail = {
	id: number;
	user_id: number;
	kind: string;
	status: string;
	created_at: string;
	severity?: string | null;
	accepted_by?: number | null;
	accepted_at?: string | null;
	in_progress_at?: string | null;
	completed_at?: string | null;
	canceled_at?: string | null;
	lat?: number | null;
	lng?: number | null;
	address?: string | null;
	symptoms?: string | null;
	comments?: string | null;
	user_name?: string | null;
	user_phone?: string | null;
};

type GeoPoint = { lat: number; lng: number };

function kindIcon(kind: string) {
	return kind === 'sos' ? 'sos' : 'firstAid';
}

function requestKindTitle(lang: AppLang, kind: string, severity?: string | null) {
	if (kind === 'sos') return t(lang, 'request.kind.sos');
	if (severity === 'light') return t(lang, 'symptom.state_light_plain');
	if (severity === 'unstable') return t(lang, 'symptom.state_unstable_plain');
	return t(lang, 'request.kind.symptom');
}

function statusText(lang: AppLang, status: string, role?: 'user' | 'volunteer') {
	if (status === 'new') return t(lang, 'map.status_line.new');
	if (status === 'accepted') return role === 'volunteer' ? t(lang, 'map.status_line.accepted_self') : t(lang, 'map.status_line.accepted');
	if (status === 'in_progress') return role === 'volunteer' ? t(lang, 'map.status_line.in_progress_self') : t(lang, 'map.status_line.in_progress');
	if (status === 'completed') return t(lang, 'map.status_line.completed');
	if (status === 'canceled') return t(lang, 'map.status_line.canceled');
	return status;
}

function fmtTimeIso(iso?: string | null) {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleString();
}

function haversineMeters(a: GeoPoint, b: GeoPoint) {
	const R = 6371000;
	const lat1 = (a.lat * Math.PI) / 180;
	const lat2 = (b.lat * Math.PI) / 180;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const s1 = Math.sin(dLat / 2);
	const s2 = Math.sin(dLng / 2);
	const x = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
	const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
	return R * c;
}

function formatDistance(lang: 'ru' | 'en' | 'kg', meters: number) {
	if (!Number.isFinite(meters) || meters <= 0) return null;
	if (meters < 1000) return t(lang, 'common.distance_m', { meters: Math.round(meters) });
	const km = Math.round((meters / 1000) * 10) / 10;
	return t(lang, 'common.distance_km', { km });
}

function formatMinutesAgo(lang: AppLang, iso?: string | null) {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	const minutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
	if (lang === 'en') return `${minutes} min ago`;
	if (lang === 'kg') return `${minutes} мин мурда`;
	return `${minutes} мин назад`;
}

function isHttp500Error(e: any) {
	const msg = e?.message ? String(e.message) : '';
	return msg.includes('HTTP 500');
}

export default function MapScreen() {
	const params = useLocalSearchParams<{ id?: string }>();
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const danger = useThemeColor({}, 'danger');
	const bg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const { token, lang, me } = useAuth();

	const [requestId, setRequestId] = useState<number>(0);
	const [pinnedId, setPinnedId] = useState<number>(0);
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<TrackDetail | null>(null);
	const [openLoading, setOpenLoading] = useState(false);
	const [openItems, setOpenItems] = useState<OpenRequestItem[]>([]);
	const [myGeo, setMyGeo] = useState<GeoPoint | null>(null);
	const [acceptingId, setAcceptingId] = useState<number>(0);
	const [route, setRoute] = useState<OsrmRoute | null>(null);
	const [volDetail, setVolDetail] = useState<VolunteerRequestDetail | null>(null);
	const [reviewOpen, setReviewOpen] = useState(false);
	const [reviewRating, setReviewRating] = useState<number>(5);
	const [reviewText, setReviewText] = useState<string>('');
	const [reviewSubmitting, setReviewSubmitting] = useState(false);
	const [reviewAutoPickLoading, setReviewAutoPickLoading] = useState(false);
	const [showNearbyVolunteers, setShowNearbyVolunteers] = useState(false);
	const [nearbyVolunteersLoading, setNearbyVolunteersLoading] = useState(false);
	const [nearbyVolunteers, setNearbyVolunteers] = useState<NearbyVolunteer[]>([]);
	const [nearbyCenter, setNearbyCenter] = useState<GeoPoint | null>(null);
	const mapRef = useRef<MapView | null>(null);
	const lastRouteKeyRef = useRef<string>('');
	const loadingRouteRef = useRef(false);

	useEffect(() => {
		let alive = true;
		(async () => {
			const fromParams = params.id ? Number(params.id) : 0;
			if (fromParams > 0) {
				if (alive) setPinnedId(fromParams);
				if (alive) setRequestId(fromParams);
				return;
			}
			if (alive) setPinnedId(0);
			const last = await getLastRequestId();
			if (!alive) return;
			setRequestId(last || 0);
		})();
		return () => {
			alive = false;
		};
	}, [params.id]);

	useEffect(() => {
		setRoute(null);
		lastRouteKeyRef.current = '';
		setVolDetail(null);
	}, [requestId]);

	useEffect(() => {
	
		if (me?.role !== 'volunteer') return;
		if (!requestId) return;
		if (pinnedId) return;
		if (!data) return;
		if (!data.accepted_by || data.accepted_by !== me.id) return;
		if (!(data.status === 'completed' || data.status === 'canceled')) return;

		let alive = true;
		(async () => {
			try {
				await clearLastRequestId();
			} catch {

			}
			if (!alive) return;
			setData(null);
			setRequestId(0);
		})();
		return () => {
			alive = false;
		};
	}, [me?.role, me?.id, requestId, pinnedId, data?.status, data?.accepted_by]);

	useEffect(() => {
		
		if (!token) return;
		if (me?.role !== 'user') return;
		if (!requestId) return;
		if (!data) return;
		if (data.status !== 'completed') {
			setReviewOpen(false);
			return;
		}
		if (typeof data.rating === 'number') {
			setReviewOpen(false);
			return;
		}

		let alive = true;
		(async () => {
			const later = await getReviewLater(requestId);
			if (!alive) return;
			if (!later) {
				setShowNearbyVolunteers(false);
				setReviewRating(5);
				setReviewText('');
				setReviewOpen(true);
			}
		})();

		return () => {
			alive = false;
		};
	}, [token, me?.role, requestId, data?.status, data?.rating]);

	useEffect(() => {
		
		if (!token) return;
		if (me?.role !== 'user') return;
		if (requestId) return;
		if (pinnedId) return;
		if (showNearbyVolunteers) return;

		let alive = true;
		setReviewAutoPickLoading(true);
		(async () => {
			try {
				const items = await api<MyRequestForReview[]>('/requests/my', { method: 'GET', token, lang });
				if (!alive) return;
				const list = Array.isArray(items) ? items : [];

				
				for (const x of list) {
					if (!x || typeof x.id !== 'number') continue;
					if (x.status === 'new' || x.status === 'accepted' || x.status === 'in_progress') {
						setRequestId(x.id);
						setLastRequestId(x.id).catch(() => {});
						return;
					}
				}

				
				for (const x of list) {
					if (!x || typeof x.id !== 'number') continue;
					if (x.status !== 'completed') continue;
					if (!x.accepted_by) continue;
					if (typeof x.rating === 'number') continue;
					const later = await getReviewLater(x.id);
					if (!alive) return;
					if (later) continue;
					setRequestId(x.id);
					setLastRequestId(x.id).catch(() => {});
					break;
				}
			} catch {

			} finally {
				if (alive) setReviewAutoPickLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [token, lang, me?.role, requestId, pinnedId]);

	useEffect(() => {
		
		if (!token) return;
		if (me?.role !== 'volunteer') return;
		if (requestId) return;
		if (pinnedId) return;

		let alive = true;
		(async () => {
			try {
				const items = await api<VolunteerMyItem[]>('/volunteer/my', { method: 'GET', token, lang });
				if (!alive) return;
				const list = Array.isArray(items) ? items : [];
				for (const x of list) {
					if (!x || typeof x.id !== 'number') continue;
					if (x.status === 'accepted' || x.status === 'in_progress') {
						setRequestId(x.id);
						setLastRequestId(x.id).catch(() => {});
						break;
					}
				}
			} catch {
			}
		})();

		return () => {
			alive = false;
		};
	}, [token, lang, me?.role, requestId, pinnedId]);

	async function loadNearbyVolunteers() {
		if (!token) return;
		if (me?.role !== 'user') return;
		setNearbyVolunteersLoading(true);
		try {
			const geo = await getGeoOrNull();
			if (!geo) {
				Alert.alert(t(lang, 'map.geo_unavailable_title'), t(lang, 'map.geo_unavailable_text'));
				return;
			}
			setNearbyCenter({ lat: geo.lat, lng: geo.lng });
			const qs = `?lat=${encodeURIComponent(String(geo.lat))}&lng=${encodeURIComponent(String(geo.lng))}&radius_km=5&limit=20`;
			const r = await api<NearbyVolunteer[]>(`/geo/volunteers${qs}`, { method: 'GET', token, lang });
			setNearbyVolunteers(Array.isArray(r) ? r : []);
		} catch (e: any) {
			if (!isHttp500Error(e)) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'map.volunteers_load_failed'));
		}
		} finally {
			setNearbyVolunteersLoading(false);
		}
	}

	useEffect(() => {
		
		if (!token) return;
		if (me?.role !== 'user') return;
		if (requestId) return;
		if (pinnedId) return;
		if (reviewAutoPickLoading) return;
		if (showNearbyVolunteers) return;

		setShowNearbyVolunteers(true);
		loadNearbyVolunteers().catch(() => {});
	}, [token, lang, me?.role, requestId, pinnedId, reviewAutoPickLoading, showNearbyVolunteers]);

	async function submitReview() {
		if (!token || !requestId) return;
		if (me?.role !== 'user') return;
		if (!data || data.status !== 'completed') return;
		const rating = Math.max(1, Math.min(5, Math.floor(Number(reviewRating) || 5)));
		const review_text = (reviewText || '').trim();

		setReviewSubmitting(true);
		try {
			await api(`/requests/${requestId}/review`, {
				method: 'POST',
				token,
				lang,
				body: { rating, review_text: review_text || null },
			});
			await clearReviewLater(requestId);
			setReviewOpen(false);
			Alert.alert(t(lang, 'common.thanks'), t(lang, 'map.review_sent'));
			try {
				await clearLastRequestId();
			} catch {
			}
			setShowNearbyVolunteers(true);
			setData(null);
			setRequestId(0);
			loadNearbyVolunteers().catch(() => {});
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'request.review_send_failed'));
		} finally {
			setReviewSubmitting(false);
		}
	}

	async function reviewLater() {
		if (!requestId) return;
		try {
			await setReviewLater(requestId, true);
		} catch {
		}
		setReviewOpen(false);
		try {
			await clearLastRequestId();
		} catch {
		}
		setData(null);
		setRequestId(0);
	}

	async function loadOpenRequests(opts?: { silent?: boolean }) {
		if (!token) return;
		const silent = !!opts?.silent;
		if (!silent) setOpenLoading(true);
		try {
			const r = await api<OpenRequestItem[]>('/requests/open', { method: 'GET', token, lang });
			setOpenItems(Array.isArray(r) ? r : []);
		} catch (e: any) {
			if (!isHttp500Error(e)) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'map.requests_load_failed'));
		}
		} finally {
			if (!silent) setOpenLoading(false);
		}
	}

	function focusOpenRequestOnMap(item: OpenRequestItem) {
		const lat = item.lat;
		const lng = item.lng;
		if (typeof lat !== 'number' || typeof lng !== 'number') return;
		const m = mapRef.current;
		if (!m) return;
		try {
			if (myGeo) {
				m.fitToCoordinates(
					[
						{ latitude: lat, longitude: lng },
						{ latitude: myGeo.lat, longitude: myGeo.lng },
					],
					{ edgePadding: { top: 90, right: 60, bottom: 160, left: 60 }, animated: true }
				);
				return;
			}
			m.animateToRegion(
				{
					latitude: lat,
					longitude: lng,
					latitudeDelta: 0.015,
					longitudeDelta: 0.015,
				},
				350
			);
		} catch {
		}
	}

	async function acceptRequest(id: number) {
		if (!token) return;
		setAcceptingId(id);
		try {
			await api(`/requests/${id}/accept`, { method: 'POST', token, lang });
			await setLastRequestId(id);

			try {
				const geo = await getGeoOrNull();
				if (geo) {
					await api(`/volunteer/requests/${id}/location`, {
						method: 'PATCH',
						token,
						lang,
						body: { volunteer_lat: geo.lat, volunteer_lng: geo.lng },
					});
				}
			} catch {
			}

			Alert.alert(t(lang, 'common.done'), t(lang, 'map.accept_done'));
			setRequestId(id);
			loadVolunteerDetail(id).catch(() => {});
			loadTrack(id).catch(() => {});
		} catch (e: any) {
			Alert.alert(t(lang, 'map.accept_failed_title'), e?.message ? String(e.message) : t(lang, 'common.error'));
		} finally {
			setAcceptingId(0);
		}
	}

	async function loadTrack(id: number) {
		if (!token || !id) return;
		setLoading(true);
		try {
			const r = await api<TrackDetail>(`/requests/${id}/track`, { method: 'GET', token, lang });
			setData(r);
			if (!r || !id) return;
			if (!r.volunteer_lat || !r.volunteer_lng || !r.lat || !r.lng) {
				setRoute(null);
				lastRouteKeyRef.current = '';
			}
		} catch (e: any) {

		} finally {
			setLoading(false);
		}
	}

	async function loadVolunteerDetail(id: number) {
		if (!token || !id) return;
		if (me?.role !== 'volunteer') return;
		try {
			const r = await api<VolunteerRequestDetail>(`/volunteer/requests/${id}`, { method: 'GET', token, lang });
			setVolDetail(r);
		} catch {
		}
	}

async function setVolunteerStatus(status: 'in_progress' | 'completed' | 'canceled') {
		if (!token || !requestId) return;
		if (me?.role !== 'volunteer') return;
		if (!data || !data.accepted_by || data.accepted_by !== me.id) return;

		const confirmAction = async (title: string, message: string, okText: string, destructive = false) => {
			if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
				return window.confirm(`${title}\n\n${message}`);
			}
			return await new Promise<boolean>((resolve) => {
				Alert.alert(title, message, [
					{ text: t(lang, 'map.no'), style: 'cancel', onPress: () => resolve(false) },
					{ text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
				], { cancelable: true, onDismiss: () => resolve(false) });
			});
		};

		if (status === 'canceled') {
			const ok = await confirmAction(
				t(lang, 'map.cancel_confirm_title'),
				t(lang, 'map.cancel_confirm_text'),
				t(lang, 'map.yes_cancel'),
				true
			);
			if (!ok) return;
		}

		if (status === 'completed') {
			const ok = await confirmAction(
				t(lang, 'map.finish_confirm_title'),
				t(lang, 'map.finish_confirm_text'),
				t(lang, 'map.yes_finish')
			);
			if (!ok) return;
		}

		setLoading(true);
		try {
			await api(`/volunteer/requests/${requestId}/status`, { method: 'PATCH', token, lang, body: { status } });
			await loadTrack(requestId);
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'map.status_update_failed'));
		} finally {
			setLoading(false);
		}
	}

	async function openRouteByGps() {
		if (!userPoint) {
			Alert.alert(t(lang, 'common.unavailable'), t(lang, 'map.no_request_coords'));
			return;
		}
		const toLat = userPoint.latitude;
		const toLng = userPoint.longitude;
		const to = `${toLng},${toLat}`;

		const fromLat = volunteerPoint?.latitude;
		const fromLng = volunteerPoint?.longitude;
		const from = typeof fromLat === 'number' && typeof fromLng === 'number' ? `${fromLng},${fromLat}` : null;

		const deepLinks: string[] = [];
		if (from) {
			deepLinks.push(`dgis://2gis.ru/routeSearch/rsType/car/from/${from}/to/${to}`);
			deepLinks.push(`2gis://2gis.ru/routeSearch/rsType/car/from/${from}/to/${to}`);
		}
		deepLinks.push(`dgis://2gis.ru/routeSearch/rsType/car/to/${to}`);
		deepLinks.push(`2gis://2gis.ru/routeSearch/rsType/car/to/${to}`);

		const webFallbacks: string[] = [
			
			`https://2gis.ru/?m=${encodeURIComponent(`${toLng},${toLat}/16`)}`,
		];

		const tryOpen = async (url: string) => {
			try {
				await Linking.openURL(url);
				return true;
			} catch {
				return false;
			}
		};

		for (const url of deepLinks) {
			if (await tryOpen(url)) return;
		}
		for (const url of webFallbacks) {
			if (await tryOpen(url)) return;
		}

		Alert.alert(t(lang, 'common.open_2gis_failed'), t(lang, 'common.open_2gis_instructions'));
	}

	async function loadOsrmRoute(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
		const fromLat = from.latitude;
		const fromLng = from.longitude;
		const toLat = to.latitude;
		const toLng = to.longitude;
		const key = [fromLat.toFixed(5), fromLng.toFixed(5), toLat.toFixed(5), toLng.toFixed(5)].join('|');
		if (lastRouteKeyRef.current === key) return;
		if (loadingRouteRef.current) return;
		loadingRouteRef.current = true;
		try {
			const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
			const res = await fetch(url);
			if (!res.ok) throw new Error('osrm_failed');
			const json: any = await res.json();
			const r0 = json?.routes?.[0];
			const coordsRaw = r0?.geometry?.coordinates;
			if (!Array.isArray(coordsRaw) || !coordsRaw.length) throw new Error('no_route');
			const coords = coordsRaw
				.map((c: any) => (Array.isArray(c) && c.length >= 2 ? { latitude: Number(c[1]), longitude: Number(c[0]) } : null))
				.filter(Boolean) as { latitude: number; longitude: number }[];
			if (!coords.length) throw new Error('no_coords');
			setRoute({
				distanceMeters: Number(r0?.distance || 0),
				durationSeconds: Number(r0?.duration || 0),
				coords,
			});
			lastRouteKeyRef.current = key;
		} catch {
			
		} finally {
			loadingRouteRef.current = false;
		}
	}

	useEffect(() => {
		if (!token || !requestId) return;
		if (me?.role === 'volunteer') {
			
			if (!volDetail || !me?.id) return;
			if (volDetail.accepted_by !== me.id) return;
		}
		let alive = true;
		loadTrack(requestId).catch(() => {});
		const t = setInterval(() => {
			if (!alive) return;
			loadTrack(requestId).catch(() => {});
		}, 5000);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, requestId, lang, me?.role, me?.id, volDetail?.accepted_by]);

	useEffect(() => {
		if (!token || !requestId) return;
		if (me?.role !== 'volunteer') return;
		let alive = true;
		loadVolunteerDetail(requestId).catch(() => {});
		const t = setInterval(() => {
			if (!alive) return;
			loadVolunteerDetail(requestId).catch(() => {});
		}, 5000);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, requestId, lang, me?.role]);

	useEffect(() => {
		if (!token) return;
		if (me?.role !== 'volunteer') return;
		if (requestId) return;
		let alive = true;
		loadOpenRequests().catch(() => {});
		const t = setInterval(() => {
			if (!alive) return;
			loadOpenRequests({ silent: true }).catch(() => {});
		}, 6000);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, lang, me?.role, requestId]);

	useEffect(() => {
		if (!token) return;
		if (me?.role !== 'volunteer') return;
		if (requestId) return;
		let alive = true;
		const tick = async () => {
			try {
				const geo = await getGeoOrNull();
				if (!alive) return;
				if (geo) setMyGeo({ lat: geo.lat, lng: geo.lng });
			} catch {

			}
		};
		tick();
		const t = setInterval(tick, 20000);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, me?.role, requestId]);

	useEffect(() => {
		
		if (!token) return;
		if (me?.role !== 'volunteer') return;
		if (!requestId) return;
		if (!volDetail || volDetail.status !== 'new') return;
		if (volDetail.accepted_by && volDetail.accepted_by === me?.id) return;
		let alive = true;
		const tick = async () => {
			try {
				const geo = await getGeoOrNull();
				if (!alive) return;
				if (geo) setMyGeo({ lat: geo.lat, lng: geo.lng });
			} catch {

			}
		};
		tick();
		const t = setInterval(tick, 20000);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, me?.role, me?.id, requestId, volDetail?.status, volDetail?.accepted_by]);

	const sortedOpenItems = useMemo(() => {
		if (!myGeo) return openItems;
		return [...openItems].sort((a, b) => {
			const aLat = a.lat;
			const aLng = a.lng;
			const bLat = b.lat;
			const bLng = b.lng;
			const da = typeof aLat === 'number' && typeof aLng === 'number' ? haversineMeters(myGeo, { lat: aLat, lng: aLng }) : Number.POSITIVE_INFINITY;
			const db = typeof bLat === 'number' && typeof bLng === 'number' ? haversineMeters(myGeo, { lat: bLat, lng: bLng }) : Number.POSITIVE_INFINITY;
			return da - db;
		});
	}, [openItems, myGeo]);

	useEffect(() => {
		if (!token || !requestId) return;
		if (me?.role !== 'volunteer') return;
		if (!data) return;
		if (!data.accepted_by || data.accepted_by !== me.id) return;
		if (!(data.status === 'accepted' || data.status === 'in_progress')) return;

		let alive = true;
		const t = setInterval(() => {
			(async () => {
				try {
					const geo = await getGeoOrNull();
					if (!alive || !geo) return;
					await api('/volunteer/requests/' + String(requestId) + '/location', {
						method: 'PATCH',
						token,
						lang,
						body: { volunteer_lat: geo.lat, volunteer_lng: geo.lng },
					});
				} catch {

				}
			})();
		}, 7000);

		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [token, requestId, lang, me?.role, me?.id, data?.accepted_by, data?.status]);

	const userPoint = useMemo(() => {
		const lat = data?.lat;
		const lng = data?.lng;
		if (typeof lat !== 'number' || typeof lng !== 'number') return null;
		return { latitude: lat, longitude: lng };
	}, [data?.lat, data?.lng]);

	const volunteerPoint = useMemo(() => {
		const lat = data?.volunteer_lat;
		const lng = data?.volunteer_lng;
		if (typeof lat !== 'number' || typeof lng !== 'number') return null;
		return { latitude: lat, longitude: lng };
	}, [data?.volunteer_lat, data?.volunteer_lng]);

	useEffect(() => {
		if (!requestId) return;
		if (!userPoint || !volunteerPoint) return;
		loadOsrmRoute(volunteerPoint, userPoint).catch(() => {});
	}, [requestId, userPoint?.latitude, userPoint?.longitude, volunteerPoint?.latitude, volunteerPoint?.longitude]);

	useEffect(() => {
		const coords = [userPoint, volunteerPoint].filter(Boolean) as { latitude: number; longitude: number }[];
		if (!coords.length) return;
		const m = mapRef.current;
		if (!m) return;
		try {
			m.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 120, left: 60 }, animated: true });
		} catch {

		}
	}, [userPoint?.latitude, userPoint?.longitude, volunteerPoint?.latitude, volunteerPoint?.longitude]);

	const canShowMap = Boolean(userPoint);

	const showVolunteerActions =
		me?.role === 'volunteer' &&
		data &&
		data.accepted_by &&
		data.accepted_by === me.id &&
		(data.status === 'accepted' || data.status === 'in_progress');

	const etaText = useMemo(() => {
		if (!route) return null;
		const km = Math.round((route.distanceMeters / 1000) * 10) / 10;
		const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
		return t(lang, 'map.eta_short', { minutes, km });
	}, [route, lang]);

	const userPhone = volDetail?.user_phone || null;
	const userName = volDetail?.user_name || null;
	const volunteerName = data?.volunteer_name || null;

	const openPoints = useMemo(() => {
		return sortedOpenItems
			.map((x) => {
				const lat = x.lat;
				const lng = x.lng;
				if (typeof lat !== 'number' || typeof lng !== 'number') return null;
				return { id: x.id, kind: x.kind, severity: x.severity, latitude: lat, longitude: lng };
			})
			.filter(Boolean) as { id: number; kind: string; severity?: string | null; latitude: number; longitude: number }[];
	}, [sortedOpenItems]);

	const newReqPoint = useMemo(() => {
		if (me?.role !== 'volunteer') return null;
		if (!requestId) return null;
		if (!volDetail || volDetail.status !== 'new') return null;
		const lat = volDetail.lat;
		const lng = volDetail.lng;
		if (typeof lat !== 'number' || typeof lng !== 'number') return null;
		return { latitude: lat, longitude: lng };
	}, [me?.role, requestId, volDetail?.status, volDetail?.lat, volDetail?.lng]);

	const newReqDistance = useMemo(() => {
		if (!newReqPoint) return null;
		if (!myGeo) return null;
		const meters = haversineMeters(myGeo, { lat: newReqPoint.latitude, lng: newReqPoint.longitude });
		return formatDistance(lang, meters);
	}, [newReqPoint?.latitude, newReqPoint?.longitude, myGeo?.lat, myGeo?.lng, lang]);

	useEffect(() => {
		if (me?.role !== 'volunteer') return;
		if (!newReqPoint) return;
		const m = mapRef.current;
		if (!m) return;
		const coords = [{ latitude: newReqPoint.latitude, longitude: newReqPoint.longitude }];
		if (myGeo) coords.push({ latitude: myGeo.lat, longitude: myGeo.lng });
		try {
			m.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 120, left: 60 }, animated: true });
		} catch {
	
		}
	}, [me?.role, newReqPoint?.latitude, newReqPoint?.longitude, myGeo?.lat, myGeo?.lng]);

	useEffect(() => {
		if (me?.role !== 'volunteer') return;
		if (requestId) return;
		if (!openPoints.length) return;
		const m = mapRef.current;
		if (!m) return;
		try {
			const coords = [
				...openPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
				...(myGeo ? [{ latitude: myGeo.lat, longitude: myGeo.lng }] : []),
			];
			m.fitToCoordinates(
				coords,
				{ edgePadding: { top: 80, right: 60, bottom: 120, left: 60 }, animated: true }
			);
		} catch {

		}
	}, [me?.role, requestId, openPoints.length, myGeo?.lat, myGeo?.lng]);

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<ThemedText style={styles.backText}>←</ThemedText>
					</Pressable>
					<ThemedText style={styles.headerTitle}>{t(lang, 'map.title')}</ThemedText>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				{!token ? (
					<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText>{t(lang, 'map.need_sign_in')}</ThemedText>
						<Pressable onPress={() => router.push('/profile')} style={[styles.btn, { backgroundColor: primary }]}>
							<ThemedText style={styles.btnText}>{t(lang, 'common.open_profile')}</ThemedText>
						</Pressable>
					</View>
				) : me?.role === 'volunteer' && !requestId ? (
					<>
						<View style={[styles.mapWrap, { borderColor: border, backgroundColor: surface }]}>
							<MapView
								ref={(r) => {
									mapRef.current = r;
								}}
								style={styles.map}
								initialRegion={{
									latitude: 42.8746,
									longitude: 74.5698,
									latitudeDelta: 0.12,
									longitudeDelta: 0.12,
								}}
							>
								{myGeo ? (
									<Marker
										coordinate={{ latitude: myGeo.lat, longitude: myGeo.lng }}
										title={t(lang, 'common.you')}
										pinColor="#2E7D32"
									/>
								) : null}
								{openPoints.map((p) => (
									<Marker
										key={String(p.id)}
										coordinate={{ latitude: p.latitude, longitude: p.longitude }}
										title={requestKindTitle(lang, p.kind, p.severity)}
										pinColor={p.kind === 'sos' ? danger : primary}
									/>
								))}
							</MapView>
						</View>

						{openLoading && openItems.length === 0 ? (
							<View style={styles.center}>
								<ActivityIndicator />
							</View>
						) : openItems.length ? (
							<View style={styles.list}>
								{sortedOpenItems.map((x) => {
									const d =
										myGeo && typeof x.lat === 'number' && typeof x.lng === 'number'
											? formatDistance(lang, haversineMeters(myGeo, { lat: x.lat, lng: x.lng }))
											: null;
									const age = formatMinutesAgo(lang, x.created_at);
									return (
									<View key={String(x.id)} style={[styles.openItem, { backgroundColor: surface, borderColor: border }]}>
										<View style={[styles.openIconBox, { backgroundColor: bg }]}>
											<AppIcon name={kindIcon(x.kind)} size={20} color={titleColor} />
										</View>
										<Pressable
											onPress={() => focusOpenRequestOnMap(x)}
											style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.95 : 1 }]}
										>
											<ThemedText style={[styles.openTitle, { color: titleColor }]}>{requestKindTitle(lang, x.kind, x.severity)}</ThemedText>
													{x.user_name ? <ThemedText style={styles.openSub}>{x.user_name}</ThemedText> : null}
													{age ? <ThemedText style={styles.openSub}>{age}</ThemedText> : null}
													{d ? <ThemedText style={styles.openSub}>{d}</ThemedText> : null}
													{x.address ? <ThemedText style={styles.openSub}>{x.address}</ThemedText> : null}
													{x.symptoms ? <ThemedText style={styles.openSub} numberOfLines={2}>{x.symptoms}</ThemedText> : null}
											{x.comments ? <ThemedText style={styles.openSub} numberOfLines={2}>{x.comments}</ThemedText> : null}
										</Pressable>
										<Pressable
											onPress={() => acceptRequest(x.id)}
											disabled={acceptingId === x.id}
											style={({ pressed }) => [
												styles.acceptBtn,
												{ backgroundColor: primary, opacity: acceptingId === x.id ? 0.7 : pressed ? 0.9 : 1 },
											]}
										>
											<ThemedText style={styles.acceptBtnText}>{acceptingId === x.id ? '...' : t(lang, 'map.accept')}</ThemedText>
										</Pressable>
									</View>
								);
								})}
							</View>
						) : (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<ThemedText>{t(lang, 'map.no_new_requests')}</ThemedText>
								<Pressable onPress={() => loadOpenRequests()} style={[styles.refreshBtn, { borderColor: border }]}>
								<ThemedText style={{ color: titleColor, fontWeight: '700' }}>{t(lang, 'common.refresh')}</ThemedText>
								</Pressable>
							</View>
						)}
					</>
				) : !requestId ? (
					me?.role === 'user' && token && showNearbyVolunteers ? (
						<>
							<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								<ThemedText style={[styles.alertText, { color: titleColor }]}>{t(lang, 'map.nearby_volunteers')}</ThemedText>
							</View>

							<View style={[styles.mapWrap, { borderColor: border, backgroundColor: surface }]}>
								<MapView
									ref={(r) => {
										mapRef.current = r;
									}}
									style={styles.map}
									initialRegion={{
										latitude: nearbyCenter?.lat ?? 42.8746,
										longitude: nearbyCenter?.lng ?? 74.5698,
										latitudeDelta: 0.08,
										longitudeDelta: 0.08,
									}}
								>
									{nearbyCenter ? (
										<Marker coordinate={{ latitude: nearbyCenter.lat, longitude: nearbyCenter.lng }} title={t(lang, 'common.you')} />
									) : null}
									{nearbyVolunteers.map((v) => (
										<Marker
											key={String(v.id)}
											coordinate={{ latitude: v.lat, longitude: v.lng }}
											title={v.name}
											description={t(lang, 'map.volunteer_desc', { km: v.distance_km, minutes: v.online_minutes_ago })}
											pinColor={primary}
										/>
									))}
								</MapView>
							</View>

							{nearbyVolunteersLoading ? (
								<View style={styles.center}>
									<ActivityIndicator />
								</View>
							) : nearbyVolunteers.length ? (
								<View style={styles.list}>
									{nearbyVolunteers.map((v) => (
										<View key={String(v.id)} style={[styles.openItem, { backgroundColor: surface, borderColor: border }]}>
											<View style={[styles.openIconBox, { backgroundColor: bg }]}>
													<AppIcon name="nurse" size={20} color={titleColor} />
											</View>
											<View style={{ flex: 1 }}>
														<ThemedText style={[styles.openTitle, { color: titleColor }]}>{v.name}</ThemedText>
														<ThemedText style={styles.openSub}>{t(lang, 'common.distance_km', { km: v.distance_km })}</ThemedText>
												<ThemedText style={styles.openSub}>{t(lang, 'map.online_ago', { minutes: v.online_minutes_ago })}</ThemedText>
											</View>
										</View>
									))}
								</View>
							) : (
								<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
									<ThemedText>{t(lang, 'map.no_volunteers_online')}</ThemedText>
								</View>
							)}
						</>
					) : me?.role === 'user' && token && reviewAutoPickLoading ? (
						<View style={styles.center}>
							<ActivityIndicator />
						</View>
					) : (
						<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<ThemedText>{t(lang, 'map.no_active_request_hint')}</ThemedText>
						</View>
					)
				) : me?.role === 'volunteer' && requestId && !data && volDetail && volDetail.status === 'new' ? (
					<>
						<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
							<ThemedText style={[styles.alertText, { color: titleColor }]}>{t(lang, 'map.new_request')}</ThemedText>
						</View>

						{newReqPoint ? (
							<View style={[styles.mapWrap, { borderColor: border, backgroundColor: surface }]}>
								<MapView
									ref={(r) => {
										mapRef.current = r;
									}}
									style={styles.map}
									initialRegion={{
										latitude: newReqPoint.latitude,
										longitude: newReqPoint.longitude,
										latitudeDelta: 0.02,
										longitudeDelta: 0.02,
									}}
								>
									<Marker
										coordinate={newReqPoint}
										title={requestKindTitle(lang, volDetail.kind, volDetail.severity)}
										pinColor={volDetail.kind === 'sos' ? danger : primary}
									/>
									{myGeo ? (
										<Marker
											coordinate={{ latitude: myGeo.lat, longitude: myGeo.lng }}
											title={t(lang, 'common.you')}
										/>
									) : null}
								</MapView>
							</View>
						) : (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<ThemedText>{t(lang, 'map.no_request_coords')}</ThemedText>
							</View>
						)}

						<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{requestKindTitle(lang, volDetail.kind, volDetail.severity)}</ThemedText>
							{newReqDistance ? <ThemedText style={[styles.rowValue, { color: text }]}>{newReqDistance}</ThemedText> : null}
							{!volDetail.address && newReqPoint ? (
								<ThemedText style={[styles.rowValue, { color: text }]}>{newReqPoint.latitude.toFixed(6)}, {newReqPoint.longitude.toFixed(6)}</ThemedText>
							) : null}
							{volDetail.address ? <ThemedText style={[styles.rowValue, { color: text }]}>{volDetail.address}</ThemedText> : null}
							{volDetail.symptoms ? <ThemedText style={[styles.rowValue, { color: text }]}>{volDetail.symptoms}</ThemedText> : null}
							{volDetail.comments ? <ThemedText style={[styles.rowValue, { color: text }]}>{volDetail.comments}</ThemedText> : null}

							<Pressable
								onPress={() => acceptRequest(requestId)}
								disabled={acceptingId === requestId}
								style={({ pressed }) => [
									styles.acceptBtn,
									{ backgroundColor: primary, opacity: acceptingId === requestId ? 0.7 : pressed ? 0.9 : 1 },
								]}
							>
								<ThemedText style={styles.acceptBtnText}>{acceptingId === requestId ? '...' : t(lang, 'map.accept')}</ThemedText>
							</Pressable>
						</View>
					</>
				) : (loading && !data) || (!!requestId && !data) ? (
					<View style={styles.center}>
						<ActivityIndicator />
					</View>
				) : data ? (
					<>
						<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								<ThemedText style={[styles.alertText, { color: titleColor }]}>
								{statusText(lang, data.status, me?.role)}
							</ThemedText>
						</View>

						{me?.role === 'user' && data.status === 'completed' && reviewOpen ? (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.review_title')}</ThemedText>
								{volunteerName ? <ThemedText style={[styles.rowValue, { color: text }]}>{volunteerName}</ThemedText> : null}

								<View style={styles.starsRow}>
									{[1, 2, 3, 4, 5].map((n) => (
										<Pressable
											key={String(n)}
											onPress={() => setReviewRating(n)}
											style={({ pressed }) => [styles.starBtn, { borderColor: border, opacity: pressed ? 0.85 : 1 }]}
										>
											<ThemedText style={[styles.starText, { color: n <= reviewRating ? primary : text }]}>
												{n <= reviewRating ? '★' : '☆'}
											</ThemedText>
										</Pressable>
									))}
								</View>

								<TextInput
									value={reviewText}
									onChangeText={setReviewText}
									placeholder={t(lang, 'request.review_label')}
									multiline
									style={[styles.reviewInput, { borderColor: border, color: text }]}
								/>

								<View style={styles.actionsRow}>
									<Pressable
										onPress={reviewLater}
										disabled={reviewSubmitting}
										style={({ pressed }) => [styles.actionOutline, { borderColor: border, opacity: reviewSubmitting ? 0.6 : pressed ? 0.9 : 1 }]}
									>
										<ThemedText style={{ color: titleColor, fontWeight: '800' }}>{t(lang, 'common.later')}</ThemedText>
									</Pressable>
									<Pressable
										onPress={submitReview}
										disabled={reviewSubmitting}
										style={({ pressed }) => [styles.actionPrimary, { backgroundColor: primary, opacity: reviewSubmitting ? 0.7 : pressed ? 0.9 : 1 }]}
									>
										<ThemedText style={styles.actionPrimaryText}>{reviewSubmitting ? '...' : t(lang, 'common.send')}</ThemedText>
									</Pressable>
								</View>
							</View>
						) : null}

						{me?.role === 'volunteer' && data.status === 'in_progress' && etaText ? (
							<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								<ThemedText style={[styles.alertText, { color: titleColor }]}>{etaText}</ThemedText>
							</View>
						) : null}

						{canShowMap ? (
							<View style={[styles.mapWrap, { borderColor: border, backgroundColor: surface }]}>
								<MapView
									ref={(r) => {
											mapRef.current = r;
									}}
									style={styles.map}
									initialRegion={{
										latitude: userPoint!.latitude,
										longitude: userPoint!.longitude,
										latitudeDelta: 0.01,
										longitudeDelta: 0.01,
									}}
								>
									{route?.coords?.length ? (
										<Polyline coordinates={route.coords} strokeWidth={4} strokeColor={primary} />
									) : null}
									<Marker
										coordinate={userPoint!}
										title={me?.role === 'volunteer' ? (userName || t(lang, 'common.user')) : t(lang, 'common.you')}
									/>
									{volunteerPoint ? (
										<Marker
											coordinate={volunteerPoint}
											title={me?.role === 'volunteer' ? t(lang, 'common.you') : (volunteerName || t(lang, 'common.volunteer'))}
											pinColor={danger}
										/>
									) : null}
								</MapView>
							</View>
						) : (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<ThemedText>{t(lang, 'map.no_coords_hint')}</ThemedText>
							</View>
						)}

						<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<View style={styles.row}>
								<AppIcon name="pasteTick" size={18} color={titleColor} />
								<View style={{ flex: 1 }}>
									<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.status')}</ThemedText>
									<ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, `request.status.${data.status}`)}</ThemedText>
								</View>
							</View>

							{data.address ? (
								<View style={[styles.sep, { borderTopColor: border }]} />
							) : null}
							{data.address ? (
								<View style={styles.row}>
									<AppIcon name="mapPin" size={18} color={titleColor} />
									<View style={{ flex: 1 }}>
										<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.address')}</ThemedText>
										<ThemedText style={[styles.rowValue, { color: text }]}>{data.address}</ThemedText>
									</View>
								</View>
							) : null}

							{data.symptoms ? (
								<View style={[styles.sep, { borderTopColor: border }]} />
							) : null}
							{data.symptoms ? (
								<View style={styles.row}>
									<AppIcon name="firstAid" size={18} color={titleColor} />
									<View style={{ flex: 1 }}>
										<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.symptoms')}</ThemedText>
										<ThemedText style={[styles.rowValue, { color: text }]}>{data.symptoms}</ThemedText>
									</View>
								</View>
							) : null}

							{data.comments ? (
								<View style={[styles.sep, { borderTopColor: border }]} />
							) : null}
							{data.comments ? (
								<View style={styles.row}>
									<AppIcon name="chat" size={18} color={titleColor} />
									<View style={{ flex: 1 }}>
										<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.comment')}</ThemedText>
										<ThemedText style={[styles.rowValue, { color: text }]}>{data.comments}</ThemedText>
									</View>
								</View>
							) : null}
						</View>

						{me?.role === 'user' && data.accepted_by && (volunteerName || data.volunteer_phone) ? (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'common.volunteer')}</ThemedText>
								{volunteerName ? <ThemedText style={[styles.rowValue, { color: text }]}>{volunteerName}</ThemedText> : null}
								{data.volunteer_phone ? <ThemedText style={[styles.rowValue, { color: text }]}>{data.volunteer_phone}</ThemedText> : null}
								{data.volunteer_phone ? (
									<Pressable
										onPress={async () => {
											try {
												await Linking.openURL(`tel:${data.volunteer_phone}`);
											} catch {
												Alert.alert(t(lang, 'common.phone_unavailable_title'), t(lang, 'common.phone_unavailable_text'));
											}
										}}
										style={({ pressed }) => [styles.callBtn, { backgroundColor: primary, opacity: pressed ? 0.9 : 1 }]}
									>
										<View style={styles.callBtnContent}>
											<AppIcon name="phoneVolume" size={18} color="#fff" />
											<ThemedText style={styles.callBtnText}>{t(lang, 'common.call')}</ThemedText>
										</View>
									</Pressable>
								) : null}
								<Pressable
									onPress={() =>
										router.push({
											pathname: '/request-chat',
											params: {
												id: String(requestId),
												name: volunteerName || t(lang, 'common.volunteer'),
												role: 'volunteer',
												phone: data.volunteer_phone || '',
										},
									})
								}
									style={({ pressed }) => [styles.callBtn, { backgroundColor: primary, opacity: pressed ? 0.9 : 1 }]}
								>
									<View style={styles.callBtnContent}>
										<AppIcon name="comments" size={18} color="#fff" />
										<ThemedText style={styles.callBtnText}>{t(lang, 'common.chat')}</ThemedText>
									</View>
								</Pressable>
							</View>
						) : null}

							{me?.role === 'volunteer' && (userName || userPhone) ? (
								<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
									<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.user_card')}</ThemedText>
									{userName ? <ThemedText style={[styles.rowValue, { color: text }]}>{userName}</ThemedText> : null}
									{userPhone ? <ThemedText style={[styles.rowValue, { color: text }]}>{userPhone}</ThemedText> : null}
									{userPhone ? (
										<Pressable
											onPress={async () => {
												try {
													await Linking.openURL(`tel:${userPhone}`);
												} catch {
													Alert.alert(t(lang, 'common.phone_unavailable_title'), t(lang, 'common.phone_unavailable_text'));
												}
										}}
											style={({ pressed }) => [styles.callBtn, { backgroundColor: primary, opacity: pressed ? 0.9 : 1 }]}
										>
											<View style={styles.callBtnContent}>
												<AppIcon name="phoneVolume" size={18} color="#fff" />
												<ThemedText style={styles.callBtnText}>{t(lang, 'map.call_user')}</ThemedText>
											</View>
										</Pressable>
									) : null}
									<Pressable
										onPress={() =>
										router.push({
											pathname: '/request-chat',
											params: {
												id: String(requestId),
												name: userName || t(lang, 'common.user'),
												role: 'user',
												phone: userPhone || '',
										},
									})
									}
									style={({ pressed }) => [styles.callBtn, { backgroundColor: primary, opacity: pressed ? 0.9 : 1 }]}
								>
									<View style={styles.callBtnContent}>
										<AppIcon name="comments" size={18} color="#fff" />
										<ThemedText style={styles.callBtnText}>{t(lang, 'common.chat')}</ThemedText>
									</View>
								</Pressable>
								</View>
							) : null}

							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<View style={styles.timelineTitleRow}>
									<AppIcon name="clock" size={18} color={titleColor} />
									<ThemedText style={[styles.rowTitle, { color: titleColor }]}>{t(lang, 'map.timeline')}</ThemedText>
								</View>
								<ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, 'request.created', { time: fmtTimeIso(data.created_at) })}</ThemedText>
								{data.accepted_at ? <ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, 'request.accepted', { time: fmtTimeIso(data.accepted_at) })}</ThemedText> : null}
								{data.in_progress_at ? <ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, 'request.in_progress', { time: fmtTimeIso(data.in_progress_at) })}</ThemedText> : null}
								{data.completed_at ? <ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, 'request.completed', { time: fmtTimeIso(data.completed_at) })}</ThemedText> : null}
								{data.canceled_at ? <ThemedText style={[styles.rowValue, { color: text }]}>{t(lang, 'request.canceled', { time: fmtTimeIso(data.canceled_at) })}</ThemedText> : null}
							</View>

						<View style={{ gap: 10 }}>
							{(me?.role === 'volunteer' || Boolean(data.accepted_by)) ? (
								<Pressable
									onPress={openRouteByGps}
									style={({ pressed }) => [styles.routeBtn, { borderColor: border, opacity: pressed ? 0.9 : 1 }]}
								>
									<ThemedText style={{ color: titleColor, fontWeight: '800' }}>🧭 {t(lang, 'common.route_gps')}</ThemedText>
								</Pressable>
							) : null}

							{showVolunteerActions && data.status === 'accepted' ? (
								<View style={styles.actionsRow}>
									<Pressable
										onPress={() => setVolunteerStatus('in_progress')}
										style={({ pressed }) => [styles.actionOutline, { borderColor: border, opacity: pressed ? 0.9 : 1 }]}
									>
										<ThemedText style={{ color: titleColor, fontWeight: '800' }}>{t(lang, 'map.action_in_progress')}</ThemedText>
									</Pressable>
									<Pressable
										onPress={() => setVolunteerStatus('canceled')}
										style={({ pressed }) => [styles.actionOutline, { borderColor: danger, opacity: pressed ? 0.9 : 1 }]}
									>
										<ThemedText style={{ color: danger, fontWeight: '800' }}>{t(lang, 'map.action_cancel')}</ThemedText>
									</Pressable>
								</View>
							) : null}

							{showVolunteerActions && data.status === 'in_progress' ? (
								<View style={styles.actionsRow}>
									<Pressable
										onPress={() => setVolunteerStatus('completed')}
										style={({ pressed }) => [styles.actionPrimary, { backgroundColor: primary, opacity: pressed ? 0.9 : 1 }]}
									>
										<ThemedText style={styles.actionPrimaryText}>{t(lang, 'map.action_complete')}</ThemedText>
									</Pressable>
								</View>
							) : null}
						</View>
					</>
				) : (
					<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText>{t(lang, 'common.no_data')}</ThemedText>
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
	content: { padding: 24, gap: 12 },
	center: { paddingVertical: 20, alignItems: 'center' },
	list: { gap: 12 },
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
	alertBox: {
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
	},
	alertText: { lineHeight: 20, fontWeight: '600' },
	mapWrap: {
		height: 360,
		borderRadius: 16,
		overflow: 'hidden',
		borderWidth: 1,
	},
	map: { flex: 1 },
	openItem: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
	},
	openIconBox: {
		width: 42,
		height: 42,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	openIconText: { fontSize: 20 },
	openTitle: { fontWeight: '700' },
	openSub: { opacity: 0.75, fontSize: 12, marginTop: 4 },
	acceptBtn: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	acceptBtnText: { color: '#fff', fontWeight: '700' },
	refreshBtn: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	routeBtn: {
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 14,
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	actionOutline: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionPrimary: {
		flex: 1,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionPrimaryText: { color: '#fff', fontWeight: '800' },
	callBtn: {
		marginTop: 10,
		width: '100%',
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	callBtnText: { color: '#fff', fontWeight: '800' },
	starsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
	starBtn: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 44,
	},
	starText: { fontSize: 18, fontWeight: '800' },
	reviewInput: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		minHeight: 90,
		// Prevent iPhone Safari from auto-zooming focused inputs on web.
		fontSize: 16,
		textAlignVertical: 'top',
	},
	row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
	rowIcon: { width: 22, flex: 0 as any },
	rowTitle: { fontWeight: '700', marginBottom: 2 },
	rowValue: { lineHeight: 20 },
	timelineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
	callBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
	sep: { borderTopWidth: 1, marginVertical: 10 },
});

