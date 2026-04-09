import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Gradients } from '@/constants/gradients';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { getGeoOrNull } from '@/lib/location';
import { setLastRequestId } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE } from '@/lib/config';
import { AppIcon, type AppIconName } from '@/components/app-icon';

const DEFAULT_LAT = 42.8746;
const DEFAULT_LNG = 74.5698;

export default function HomeScreen() {
	const { me, token, lang } = useAuth();
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const mutedBg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const colorScheme = useColorScheme();
	const unstableColors = colorScheme === 'dark' ? ['#2B2C22', '#3A3928'] as const : Gradients.unstableState;
	const avatarUri = (() => {
		const v = String(me?.avatar_url || '').trim();
		if (!v) return null;
		if (v.startsWith('data:image/')) return v;
		if (v.startsWith('https://') || v.startsWith('http://')) return v;
		if (v.startsWith('/')) return `${API_BASE}${v}`;
		return null;
	})();

	const isUser = me?.role === 'user';

	async function createSosRequest() {
		try {
			const geo = await getGeoOrNull();
			const lat = geo?.lat ?? DEFAULT_LAT;
			const lng = geo?.lng ?? DEFAULT_LNG;

			const created = await api<{ id: number; status: string }>('/requests', {
				method: 'POST',
				token,
				lang,
				body: {
					kind: 'sos',
					lat,
					lng,
					address: '',
					severity: 'critical',
				},
			});

			const id = created?.id;
			if (id) {
				await setLastRequestId(id);
				router.push({ pathname: '/map', params: { id: String(id) } });
			} else {
				Alert.alert(t(lang, 'common.done'), t(lang, 'home.sos_sent'));
			}
		} catch (e: any) {
			Alert.alert(t(lang, 'home.sos_error_title'), e?.message ? String(e.message) : t(lang, 'home.sos_error_fallback'));
		}
	}

	async function sendSos() {
		if (!token) {
			if (typeof window !== 'undefined' && Platform.OS === 'web') {
				const goProfile = window.confirm(`${t(lang, 'home.need_sign_in')}\n\n${t(lang, 'home.sign_in_first')}`);
				if (goProfile) router.push('/profile');
				return;
			}
			Alert.alert(t(lang, 'home.need_sign_in'), t(lang, 'home.sign_in_first'), [
				{ text: t(lang, 'common.cancel'), style: 'cancel' },
				{ text: t(lang, 'common.open_profile'), onPress: () => router.push('/profile') },
			]);
			return;
		}

		if (typeof window !== 'undefined' && Platform.OS === 'web') {
			const confirmed = window.confirm(`${t(lang, 'home.sos_title')}\n\n${t(lang, 'home.sos_confirm')}`);
			if (!confirmed) return;
			await createSosRequest();
			return;
		}

		Alert.alert(t(lang, 'home.sos_title'), t(lang, 'home.sos_confirm'), [
			{ text: t(lang, 'common.cancel'), style: 'cancel' },
			{
				text: t(lang, 'common.send'),
				style: 'destructive',
				onPress: async () => {
					await createSosRequest();
				},
			},
		]);
	}

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<View style={{ flex: 1 }}>
						<ThemedText style={[styles.headerHello, { color: 'rgba(255,255,255,0.6)' }]}>{t(lang, 'home.hello')}</ThemedText>
						<ThemedText style={[styles.headerName, { color: '#fff' }]}>
							{me?.name || t(lang, 'home.user_fallback')}
						</ThemedText>
					</View>
					<Pressable
						onPress={() => router.push('/profile')}
						style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
					>
						{avatarUri ? (
							<Image source={{ uri: avatarUri }} style={styles.avatarImage} />
						) : (
							<AppIcon name="profile" size={22} color="#fff" />
						)}
					</Pressable>
				</View>

				<Pressable onPress={sendSos} style={styles.sosWrap}>
					<LinearGradient colors={[...Gradients.sos]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sosBtn}>
						<ThemedText style={[styles.sosText, { color: '#fff' }]}>{t(lang, 'home.sos_button')}</ThemedText>
					</LinearGradient>
				</Pressable>
			</View>

			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				{isUser ? (
					<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'home.quick_access')}</ThemedText>
				) : null}

				{isUser ? (
					<Pressable style={styles.quickActionWrap} onPress={() => router.push('/symptom')}>
						<LinearGradient
							colors={[...unstableColors]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.categoryCard}
						>
							<View style={styles.categoryTitleRow}>
								<AppIcon name="sos" size={24} color={titleColor} />
								<ThemedText numberOfLines={2} style={[styles.categoryTitle, { color: titleColor }] }>
									{t(lang, 'category.call_volunteer')}
								</ThemedText>
							</View>
						</LinearGradient>
					</Pressable>
				) : null}

				<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'home.main_features')}</ThemedText>
				<View style={styles.functionList}>
					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="mapPin"
						title={t(lang, 'home.my_request_map')}
						onPress={() => router.push('/map')}
					/>

					{me?.role === 'volunteer' ? (
						<FunctionItem
							surface={surface}
							mutedBg={mutedBg}
							textColor={text}
							primary={titleColor}
							icon="pasteTick"
							title={t(lang, 'home.my_accepted')}
							onPress={() => router.push('/volunteer-my')}
						/>
					) : null}

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="clipboard"
						title={t(lang, 'home.categories')}
						onPress={() => router.push('/categories')}
					/>

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="video"
						title={t(lang, 'home.videos')}
						onPress={() => router.push('/video')}
					/>

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="map"
						title={t(lang, 'home.hospitals_map')}
						onPress={() => router.push('/hospitals-map')}
					/>

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="chat"
						title={t(lang, 'home.ai_assistant')}
						onPress={() => router.push('/chat')}
					/>

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="star"
						title={t(lang, 'home.volunteer_reviews')}
						onPress={() => router.push('/reviews')}
					/>

					<FunctionItem
						surface={surface}
						mutedBg={mutedBg}
						textColor={text}
						primary={titleColor}
						icon="news"
						title={t(lang, 'home.my_requests')}
						onPress={() => router.push('/my-requests')}
					/>
				</View>
			</ScrollView>
		</ThemedView>
	);
}

function FunctionItem(props: {
	surface: string;
	mutedBg: string;
	textColor: string;
	primary: string;
	icon: AppIconName;
	title: string;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={props.onPress} style={[styles.functionItem, { backgroundColor: props.surface }]}>
			<View style={[styles.functionIconBox, { backgroundColor: props.mutedBg }]}
			>
				<AppIcon name={props.icon} size={22} color={props.primary} />
			</View>
			<ThemedText style={[styles.functionTitle, { color: props.primary }]}>{props.title}</ThemedText>
			<ThemedText style={[styles.functionChevron, { color: props.textColor }]}>›</ThemedText>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		paddingHorizontal: 24,
		paddingBottom: 24,
		borderBottomLeftRadius: 32,
		borderBottomRightRadius: 32,
	},
	headerTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginBottom: 24,
	},
	headerHello: { fontSize: 14 },
	headerName: { fontSize: 20, fontWeight: '700' },
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: { fontSize: 18 },
	avatarImage: { width: '100%', height: '100%', borderRadius: 24 },

	sosWrap: { width: '100%' },
	sosBtn: {
		width: '100%',
		paddingVertical: 20,
		paddingHorizontal: 18,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#B91717',
		shadowOpacity: 0.3,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	sosText: { fontSize: 18, fontWeight: '700' },

	scroll: { flex: 1 },
	content: { padding: 24, paddingBottom: 24 },

	sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
	quickActionWrap: {
		marginBottom: 24,
		width: '100%',
		alignSelf: 'stretch',
	},
	categoryCard: {
		width: '100%',
		paddingHorizontal: 20,
		paddingVertical: 18,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 96,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},
	categoryIcon: {
		width: 64,
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	categoryIconText: { fontSize: 32, lineHeight: 36, textAlign: 'center' },
	categoryTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
	categoryTitle: { textAlign: 'center', fontWeight: '700' },

	functionList: { gap: 12 },
	functionItem: {
		padding: 16,
		borderRadius: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	functionIconBox: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	functionIconText: { fontSize: 20 },
	functionTitle: { flex: 1, fontWeight: '700' },
	functionChevron: { fontSize: 18, opacity: 0.7 },

});
