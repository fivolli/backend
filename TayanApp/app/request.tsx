import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { setLastRequestId } from '@/lib/storage';
import { open2GisRoute, open2GisSearch } from '@/lib/two-gis';
import { useAuth } from '@/providers/auth-provider';

type RequestDetail = {
	id: number;
	kind: string;
	status: string;
	created_at?: string;
	accepted_by?: number | null;
	accepted_at?: string | null;
	in_progress_at?: string | null;
	completed_at?: string | null;
	canceled_at?: string | null;
	reaction_minutes?: number | null;
	address?: string | null;
	lat?: number | null;
	lng?: number | null;
	symptoms?: string | null;
	comments?: string | null;
	user_name?: string | null;
	user_phone?: string | null;
	volunteer_name?: string | null;
	volunteer_phone?: string | null;
	volunteer_lat?: number | null;
	volunteer_lng?: number | null;
	rating?: number | null;
	review_text?: string | null;
	reviewed_at?: string | null;
};

type VolunteerRating = {
	volunteer_id: number;
	avg_rating: number;
	reviews_count: number;
};

type EtaInfo = {
	minutes: number;
	km: number;
};

function fmtTimeIso(iso?: string | null) {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleString();
}

function requestKindLabel(lang: 'ru' | 'en' | 'kg', kind?: string | null) {
	if (!kind) return '—';
	if (kind === 'sos') return t(lang, 'request.kind.sos');
	if (kind === 'symptom') return t(lang, 'request.kind.symptom');
	return kind;
}

function requestStatusLabel(lang: 'ru' | 'en' | 'kg', status?: string | null) {
	if (!status) return '—';
	if (status === 'new') return t(lang, 'request.status.new');
	if (status === 'accepted') return t(lang, 'request.status.accepted');
	if (status === 'in_progress') return t(lang, 'request.status.in_progress');
	if (status === 'completed') return t(lang, 'request.status.completed');
	if (status === 'canceled') return t(lang, 'request.status.canceled');
	return status;
}

function iconFor(kind: string) {
	return kind === 'sos' ? '🚨' : '🩹';
}

function computeReactionMinutes(createdAt?: string, acceptedAt?: string | null) {
	if (!createdAt || !acceptedAt) return null;
	const c = new Date(createdAt);
	const a = new Date(acceptedAt);
	if (Number.isNaN(c.getTime()) || Number.isNaN(a.getTime())) return null;
	return Math.max(0, Math.round((a.getTime() - c.getTime()) / 60000));
}

function renderStars(rating: number) {
	const full = Math.floor(Number.isFinite(rating) ? rating : 0);
	const empty = Math.max(0, 5 - full);
	return '★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, Math.min(5, empty)));
}

async function osrmEta(volLat: number, volLng: number, userLat: number, userLng: number): Promise<EtaInfo | null> {
	const url = `https://router.project-osrm.org/route/v1/driving/${volLng},${volLat};${userLng},${userLat}?overview=false`;
	const res = await fetch(url);
	if (!res.ok) return null;
	const json = await res.json();
	const route = json?.routes?.[0];
	const durationSec = Number(route?.duration);
	const distanceM = Number(route?.distance);
	if (!Number.isFinite(durationSec) || !Number.isFinite(distanceM)) return null;
	return {
		minutes: Math.max(1, Math.round(durationSec / 60)),
		km: Math.max(0, Math.round((distanceM / 1000) * 10) / 10),
	};
}

export default function RequestScreen() {
	const params = useLocalSearchParams<{ id?: string }>();
	const id = params.id ? Number(params.id) : 0;
	const { token, lang, me } = useAuth();
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const bg = useThemeColor({}, 'background');
	const tint = useThemeColor({}, 'tint');
	const text = useThemeColor({}, 'text');
	const danger = useThemeColor({}, 'danger');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<RequestDetail | null>(null);
	const [loadError, setLoadError] = useState<string>('');
	const [vRating, setVRating] = useState<VolunteerRating | null>(null);
	const [eta, setEta] = useState<EtaInfo | null>(null);
	const [etaLoading, setEtaLoading] = useState(false);
	const [reviewRating, setReviewRating] = useState<number>(5);
	const [reviewText, setReviewText] = useState<string>('');
	const [reviewSending, setReviewSending] = useState(false);
	const etaInFlight = useRef(false);

	const endpoint = useMemo(() => {
		return me?.role === 'volunteer' ? `/volunteer/requests/${id}` : `/requests/${id}`;
	}, [me?.role, id]);

	const isVolunteer = me?.role === 'volunteer';
	const reactionMinutes = useMemo(() => {
		const fromBackend = data?.reaction_minutes;
		if (fromBackend != null && Number.isFinite(Number(fromBackend))) return Number(fromBackend);
		return computeReactionMinutes(data?.created_at, data?.accepted_at ?? null);
	}, [data?.reaction_minutes, data?.created_at, data?.accepted_at]);

	const mutedTextStyle = useMemo(() => ({ opacity: 0.75, fontSize: 13 }), []);

	async function load() {
		if (!id || !token) return;
		setLoadError('');
		setLoading(true);
		try {
			setLastRequestId(id).catch(() => {});
			const r = await api<RequestDetail>(endpoint, { method: 'GET', token, lang });
			setData(r);
			if (r?.id) {
				setReviewRating(5);
				setReviewText('');
			}
		} catch (e: any) {
			const msg = e?.message ? String(e.message) : t(lang, 'request.load_failed');
			setLoadError(msg);
			setData(null);
			Alert.alert(t(lang, 'common.error'), msg);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		let alive = true;
		(async () => {
			if (!id || !token) return;
			if (!alive) return;
			await load();
		})();
		return () => {
			alive = false;
		};
	}, [id, token, lang, endpoint]);

	useEffect(() => {
		let alive = true;
		(async () => {
			setVRating(null);
			if (isVolunteer) return;
			const volunteerId = data?.accepted_by;
			if (!volunteerId || !token) return;
			try {
				const r = await api<VolunteerRating>(`/volunteer/${volunteerId}/rating`, { method: 'GET', token, lang });
				if (alive) setVRating(r || null);
			} catch {
				if (alive) setVRating(null);
			}
		})();
		return () => {
			alive = false;
		};
	}, [data?.accepted_by, isVolunteer, token, lang]);

	useEffect(() => {
		let alive = true;
		let timer: any = null;
		setEta(null);
		if (isVolunteer) return;
		const canShowEta = data && (data.status === 'accepted' || data.status === 'in_progress');
		const uLat = data?.lat;
		const uLng = data?.lng;
		const vLat = data?.volunteer_lat;
		const vLng = data?.volunteer_lng;
		if (!canShowEta || uLat == null || uLng == null || vLat == null || vLng == null) return;

		const tick = async () => {
			if (etaInFlight.current) return;
			etaInFlight.current = true;
			setEtaLoading(true);
			try {
				const next = await osrmEta(Number(vLat), Number(vLng), Number(uLat), Number(uLng));
				if (alive) setEta(next);
			} catch {
				if (alive) setEta(null);
			} finally {
				etaInFlight.current = false;
				if (alive) setEtaLoading(false);
			}
		};

		void tick();
		timer = setInterval(tick, 15000);
		return () => {
			alive = false;
			if (timer) clearInterval(timer);
		};
	}, [data?.status, data?.lat, data?.lng, data?.volunteer_lat, data?.volunteer_lng, isVolunteer]);

	async function callPhone(phone?: string | null) {
		const p = (phone || '').trim();
		if (!p) return;
		try {
			await Linking.openURL(`tel:${p}`);
		} catch {
			Alert.alert(t(lang, 'common.error'), t(lang, 'common.phone_unavailable_text'));
		}
	}

	async function openRoute(lat?: number | null, lng?: number | null, address?: string | null) {
		try {
			if (lat != null && lng != null) {
				const ok = await open2GisRoute({ toLat: Number(lat), toLng: Number(lng) });
				if (!ok) throw new Error('open_2gis_failed');
				return;
			}
			if (address && address.trim()) {
				const ok = await open2GisSearch(address);
				if (!ok) throw new Error('open_2gis_failed');
				return;
			}
			Alert.alert(t(lang, 'common.route'), t(lang, 'common.no_route_data'));
		} catch {
			Alert.alert(t(lang, 'common.error'), t(lang, 'common.open_2gis_failed'));
		}
	}

	async function cancelRequest() {
		if (!id || !token) return;
		let confirmed = false;
		if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
			confirmed = window.confirm(`${t(lang, 'request.cancel_confirm_title')}\n\n${t(lang, 'request.cancel_confirm_text')}`);
		} else {
			confirmed = await new Promise<boolean>((resolve) => {
				Alert.alert(
					t(lang, 'request.cancel_confirm_title'),
					t(lang, 'request.cancel_confirm_text'),
					[
						{ text: t(lang, 'request.cancel_no'), style: 'cancel', onPress: () => resolve(false) },
						{ text: t(lang, 'request.cancel_yes'), style: 'destructive', onPress: () => resolve(true) },
					],
					{ cancelable: true, onDismiss: () => resolve(false) }
				);
			});
		}
		if (!confirmed) return;

		try {
			await api<RequestDetail>(`/requests/${id}/status`, { method: 'PATCH', token, lang, body: { status: 'canceled' } });
			await load();
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'request.cancel_failed'));
		}
	}

	async function submitReview() {
		if (!id || !token) return;
		if (!Number.isFinite(reviewRating) || reviewRating < 1 || reviewRating > 5) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'request.review_rating_invalid'));
			return;
		}
		setReviewSending(true);
		try {
			await api<RequestDetail>(`/requests/${id}/review`, {
				method: 'POST',
				token,
				lang,
				body: { rating: reviewRating, review_text: reviewText },
			});
			await load();
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'request.review_send_failed'));
		} finally {
			setReviewSending(false);
		}
	}

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<ThemedText style={styles.backText}>←</ThemedText>
					</Pressable>
					<ThemedText style={styles.headerTitle}>{t(lang, 'request.title')}</ThemedText>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				{!id ? (
					<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText>{t(lang, 'request.no_id')}</ThemedText>
						<Pressable onPress={() => router.push('/home')} style={[styles.btn, { backgroundColor: tint }]}>
							<ThemedText lightColor="#fff" darkColor="#151718" style={styles.btnText}>
								{t(lang, 'common.go_home')}
							</ThemedText>
						</Pressable>
					</View>
				) : !token ? (
					<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText>{t(lang, 'request.need_sign_in')}</ThemedText>
						<Pressable onPress={() => router.push('/profile')} style={[styles.btn, { backgroundColor: tint }]}>
							<ThemedText lightColor="#fff" darkColor="#151718" style={styles.btnText}>
								{t(lang, 'common.open_profile')}
							</ThemedText>
						</Pressable>
					</View>
				) : loading && !data ? (
					<View style={styles.center}>
						<ActivityIndicator />
					</View>
				) : data ? (
					<>
						<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<ThemedText style={[styles.h3, { color: titleColor }]}>
								{iconFor(data.kind)} {requestKindLabel(lang, data.kind)} • {requestStatusLabel(lang, data.status)}
							</ThemedText>
							<ThemedText style={mutedTextStyle}>{fmtTimeIso(data.created_at)}</ThemedText>

							{!isVolunteer && (data.status === 'accepted' || data.status === 'in_progress' || data.status === 'completed') && (data.volunteer_name || data.volunteer_phone) ? (
								<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
									<ThemedText style={[styles.alertTitle, { color: titleColor }]}>{t(lang, 'request.volunteer_accepted')}</ThemedText>
									{data.volunteer_name ? <ThemedText style={[styles.alertLine, { color: text }]}>👤 {data.volunteer_name}</ThemedText> : null}
									{data.volunteer_phone ? <ThemedText style={[styles.alertLine, { color: text }]}>📞 {data.volunteer_phone}</ThemedText> : null}
									{vRating ? (
										<ThemedText style={[styles.alertSmall, { color: text }]}>
											{t(lang, 'request.volunteer_rating_label')}{' '}
											<ThemedText style={{ fontWeight: '800', color: titleColor }}>{(vRating.avg_rating ?? 0).toFixed(1)}</ThemedText> / 5{' '}
											<ThemedText style={mutedTextStyle}>
												{t(lang, 'request.reviews_count', { count: String(vRating.reviews_count ?? 0) })}
											</ThemedText>
										</ThemedText>
									) : null}
									{data.accepted_by ? (
										<Pressable
											onPress={() =>
												router.push({
													pathname: '/volunteer-profile',
													params: {
														volunteerId: String(data.accepted_by),
														name: data.volunteer_name || t(lang, 'common.volunteer'),
													},
											})
										}
										style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
									>
											<ThemedText style={styles.btnPrimaryText}>{t(lang, 'request.volunteer_profile')}</ThemedText>
									</Pressable>
									) : null}
								</View>
							) : null}

							{(data.address || (data.lat != null && data.lng != null)) ? (
								<View style={[styles.innerCard, { backgroundColor: surface, borderColor: border }]}>
									<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'request.location')}</ThemedText>
									{data.address ? (
										<ThemedText style={[styles.paragraph, { color: text }]}>
											<ThemedText style={[styles.strong, { color: titleColor }]}>{t(lang, 'request.address')}</ThemedText> {data.address}
										</ThemedText>
									) : null}
									{(data.lat != null && data.lng != null) ? (
										<ThemedText style={[styles.paragraph, { color: text }]}>
											<ThemedText style={[styles.strong, { color: titleColor }]}>{t(lang, 'request.coords')}</ThemedText> {Number(data.lat).toFixed(6)}, {Number(data.lng).toFixed(6)}
										</ThemedText>
									) : null}
								</View>
							) : null}

							{isVolunteer ? (
								<>
									{data.user_phone ? (
										<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
											<ThemedText style={[styles.alertTitle, { color: titleColor }]}>{t(lang, 'request.user_contact')}</ThemedText>
											{data.user_name ? <ThemedText style={[styles.alertLine, { color: text }]}>👤 {data.user_name}</ThemedText> : null}
											<ThemedText style={[styles.alertLine, { color: text }]}>📞 {data.user_phone}</ThemedText>
											<Pressable
												onPress={() => void callPhone(data.user_phone)}
												style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
											>
													<ThemedText style={styles.btnPrimaryText}>📞 {t(lang, 'common.call')}</ThemedText>
											</Pressable>
											<Pressable
												onPress={() =>
													router.push({
														pathname: '/request-chat',
														params: {
															id: String(id),
															name: data.user_name || t(lang, 'common.user'),
															role: 'user',
															phone: data.user_phone || '',
														},
													})
												}
												style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
											>
												<ThemedText style={styles.btnPrimaryText}>💬 {t(lang, 'common.chat')}</ThemedText>
											</Pressable>
										</View>
									) : null}

									{(data.lat != null && data.lng != null) || (data.address && data.address.trim()) ? (
										<Pressable
											onPress={() => void openRoute(data.lat, data.lng, data.address)}
											style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
										>
											<ThemedText style={styles.btnPrimaryText}>
												{(data.lat != null && data.lng != null) ? t(lang, 'common.route_gps') : t(lang, 'common.route_address')}
											</ThemedText>
										</Pressable>
									) : (
										<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
											<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.no_route_data')}</ThemedText>
										</View>
									)}
								</>
							) : (
								<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
									{reactionMinutes != null ? (
										<>
											<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.reaction_minutes', { minutes: String(reactionMinutes) })}</ThemedText>
											{data.volunteer_phone ? (
												<Pressable
													onPress={() => void callPhone(data.volunteer_phone)}
													style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
												>
													<ThemedText style={styles.btnPrimaryText}>📞 {t(lang, 'common.call')}</ThemedText>
												</Pressable>
											) : null}
											{data.accepted_by ? (
												<Pressable
													onPress={() =>
													router.push({
														pathname: '/request-chat',
														params: {
															id: String(id),
															name: data.volunteer_name || t(lang, 'common.volunteer'),
															role: 'volunteer',
															phone: data.volunteer_phone || '',
														},
													})
												}
												style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, pressed ? { opacity: 0.9 } : null]}
											>
												<ThemedText style={styles.btnPrimaryText}>💬 {t(lang, 'common.chat')}</ThemedText>
											</Pressable>
										) : null}
										</>
									) : (
										<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.searching_volunteer')}</ThemedText>
									)}
								</View>
							)}

							{data.symptoms ? (
								<ThemedText style={[styles.paragraph, { color: text }]}>
									<ThemedText style={[styles.strong, { color: titleColor }]}>{t(lang, 'request.symptoms')}</ThemedText>{'\n'}
									{data.symptoms}
								</ThemedText>
							) : null}
							{data.comments ? (
								<ThemedText style={[styles.paragraph, { color: text }]}>
									<ThemedText style={[styles.strong, { color: titleColor }]}>{t(lang, 'request.comment')}</ThemedText>{'\n'}
									{data.comments}
								</ThemedText>
							) : null}
						</View>

						<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
							<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'request.timeline')}</ThemedText>
							<ThemedText style={styles.timelineLine}>{t(lang, 'request.created', { time: fmtTimeIso(data.created_at) })}</ThemedText>
							{data.accepted_at ? <ThemedText style={styles.timelineLine}>{t(lang, 'request.accepted', { time: fmtTimeIso(data.accepted_at) })}</ThemedText> : null}
							{data.in_progress_at ? <ThemedText style={styles.timelineLine}>{t(lang, 'request.in_progress', { time: fmtTimeIso(data.in_progress_at) })}</ThemedText> : null}
							{data.completed_at ? <ThemedText style={styles.timelineLine}>{t(lang, 'request.completed', { time: fmtTimeIso(data.completed_at) })}</ThemedText> : null}
							{data.canceled_at ? <ThemedText style={styles.timelineLine}>{t(lang, 'request.canceled', { time: fmtTimeIso(data.canceled_at) })}</ThemedText> : null}
						</View>

						{!isVolunteer && (data.status === 'accepted' || data.status === 'in_progress') && (data.lat != null && data.lng != null && data.volunteer_lat != null && data.volunteer_lng != null) ? (
							<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								{etaLoading ? (
									<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.eta_calculating')}</ThemedText>
								) : eta ? (
									<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.eta_text', { minutes: String(eta.minutes), km: String(eta.km) })}</ThemedText>
								) : (
									<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.eta_unavailable')}</ThemedText>
								)}
							</View>
						) : null}

						{!isVolunteer && data.status === 'new' ? (
							<Pressable
								onPress={() => void cancelRequest()}
								style={({ pressed }) => [styles.btnOutline, { borderColor: danger }, pressed ? { opacity: 0.9 } : null]}
							>
								<ThemedText style={[styles.btnOutlineText, { color: danger }]}>{t(lang, 'request.cancel_button')}</ThemedText>
							</Pressable>
						) : null}

						{!isVolunteer && data.status === 'completed' && data.rating == null ? (
							<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
								<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'request.rate_volunteer')}</ThemedText>
								<ThemedText style={styles.inputLabel}>{t(lang, 'request.rating_label')}</ThemedText>
								<View style={styles.starsRow}>
									{[1, 2, 3, 4, 5].map((n) => (
										<Pressable key={String(n)} onPress={() => setReviewRating(n)} style={({ pressed }) => [styles.starBtn, pressed ? { opacity: 0.85 } : null]}>
											<ThemedText style={[styles.starText, { color: n <= reviewRating ? primary : text }]}>{n <= reviewRating ? '★' : '☆'}</ThemedText>
										</Pressable>
									))}
								</View>
								<ThemedText style={styles.inputLabel}>{t(lang, 'request.review_label')}</ThemedText>
								<TextInput
									value={reviewText}
									onChangeText={setReviewText}
									placeholder={t(lang, 'request.review_placeholder')}
									placeholderTextColor={String(border)}
									multiline
									style={[styles.textarea, { backgroundColor: bg, borderColor: border, color: text }]}
								/>
								<Pressable
									onPress={() => void submitReview()}
									disabled={reviewSending}
									style={({ pressed }) => [styles.btnPrimary, { backgroundColor: primary }, (reviewSending ? { opacity: 0.6 } : null), pressed ? { opacity: 0.9 } : null]}
								>
									<ThemedText style={styles.btnPrimaryText}>{t(lang, 'request.review_submit')}</ThemedText>
								</Pressable>
							</View>
						) : null}

						{!isVolunteer && data.status === 'completed' && data.rating != null ? (
							<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.review_yours', { rating: String(data.rating) })}</ThemedText>
								{data.review_text ? <ThemedText style={[styles.alertLine, { color: text }]}>💬 {data.review_text}</ThemedText> : null}
							</View>
						) : null}

						{isVolunteer && (data.status === 'completed' || data.status === 'canceled') ? (
							<View style={[styles.alertBox, { backgroundColor: bg, borderColor: border }]}>
								<ThemedText style={[styles.alertLine, { color: text }]}>{t(lang, 'request.closed')}</ThemedText>
							</View>
						) : null}
					</>
				) : (
					<View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText style={{ opacity: 0.85 }}>{t(lang, 'request.no_request_data')}</ThemedText>
						{loadError ? <ThemedText style={{ opacity: 0.75 }}>{loadError}</ThemedText> : null}
						<Pressable onPress={load} style={[styles.btn, { backgroundColor: bg, borderColor: border }]}>
						<ThemedText style={[styles.btnTextAlt, { color: titleColor }]}>{t(lang, 'common.refresh')}</ThemedText>
						</Pressable>
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
	card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
	btn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
	btnText: { fontWeight: '800' },
	btnTextAlt: { fontWeight: '800' },
	h3: { fontWeight: '800', fontSize: 16 },
	muted: { opacity: 0.75, fontSize: 13 },
	alertBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
	alertTitle: { fontWeight: '800' },
	alertLine: { lineHeight: 20 },
	alertSmall: { fontSize: 13, lineHeight: 18 },
	innerCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
	sectionTitle: { fontWeight: '800', marginBottom: 2 },
	paragraph: { lineHeight: 20 },
	strong: { fontWeight: '800' },
	timelineLine: { opacity: 0.75, fontSize: 13, lineHeight: 18 },
	btnPrimary: { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	btnPrimaryText: { color: '#fff', fontWeight: '800' },
	btnOutline: { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
	btnOutlineText: { fontWeight: '800' },
	inputLabel: { fontWeight: '700' },
	starsRow: { flexDirection: 'row', gap: 6 },
	starBtn: { paddingVertical: 6, paddingHorizontal: 6 },
	starText: { fontSize: 20, fontWeight: '800' },
	textarea: {
		minHeight: 96,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		// Prevent iPhone Safari from auto-zooming focused inputs on web.
		fontSize: 16,
		textAlignVertical: 'top',
	},
});
