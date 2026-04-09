import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';
import { AppIcon, type AppIconName } from '@/components/app-icon';

export default function PrivacyScreen() {
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const mutedBg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const { token, lang, signOut } = useAuth();

	async function openAppSettings() {
		try {
			const openSettings = (Linking as any)?.openSettings;
			if (typeof openSettings !== 'function') {
				throw new Error('openSettings not supported');
			}
			await openSettings();
		} catch {
			Alert.alert(t(lang, 'common.error'), t(lang, 'common.unavailable'));
		}
	}

	function openDoc(kind: 'policy' | 'terms') {
		router.push(kind === 'policy' ? '/policy' : '/terms');
	}

	async function deleteMyData() {
		if (!token) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'notifications.not_authorized'));
			return;
		}

		Alert.alert(
			t(lang, 'privacy.delete_confirm_title'),
			t(lang, 'privacy.delete_confirm_text'),
			[
				{ text: t(lang, 'common.cancel'), style: 'cancel' },
				{
					text: t(lang, 'privacy.delete_confirm_button'),
					style: 'destructive',
					onPress: async () => {
						try {
							await api('/auth/me', { method: 'DELETE', token, lang });
							await signOut();
							router.replace('/login');
						} catch (e: any) {
							Alert.alert(t(lang, 'common.error'), String(e?.message || t(lang, 'privacy.delete_failed')));
						}
					},
				},
			]
		);
	}

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<ThemedText style={styles.backText}>←</ThemedText>
					</Pressable>
					<ThemedText style={styles.headerTitle}>{t(lang, 'settings.privacy')}</ThemedText>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'privacy.data_mgmt')}</ThemedText>

				<View style={styles.functionList}>
					<RowItem
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						subtitleColor={text}
						icon="mapPin"
						title={t(lang, 'privacy.location_title')}
						subtitle={t(lang, 'privacy.location_sub')}
						onPress={openAppSettings}
					/>
					<RowItem
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						subtitleColor={text}
						icon="chart"
						title={t(lang, 'privacy.analytics_title')}
						subtitle={t(lang, 'privacy.analytics_sub')}
						onPress={() => router.push('/policy')}
					/>
				</View>

				<ThemedText style={[styles.sectionTitle, { marginTop: 22, color: titleColor }]}>{t(lang, 'privacy.documents')}</ThemedText>
				<View style={styles.functionList}>
					<LinkRow
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						icon="news"
						title={t(lang, 'privacy.policy')}
						onPress={() => openDoc('policy')}
					/>
					<LinkRow
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						icon="clipboard"
						title={t(lang, 'privacy.terms')}
						onPress={() => openDoc('terms')}
					/>
				</View>

				<View style={styles.dangerBox}>
					<ThemedText style={styles.dangerTitle}>{t(lang, 'privacy.delete_section_title')}</ThemedText>
					<ThemedText style={styles.dangerText}>{t(lang, 'privacy.delete_section_text')}</ThemedText>
					<Pressable style={styles.dangerBtn} onPress={deleteMyData}>
						<ThemedText style={styles.dangerBtnText}>{t(lang, 'privacy.delete_button')}</ThemedText>
					</Pressable>
				</View>
			</ScrollView>
		</ThemedView>
	);
}

function RowItem(props: {
	surface: string;
	border: string;
	mutedBg: string;
	titleColor: string;
	subtitleColor: string;
	icon: AppIconName;
	title: string;
	subtitle: string;
	onPress?: () => void;
}) {
	const content = (
		<>
			<View style={[styles.iconBox, { backgroundColor: props.mutedBg }]}>
				<AppIcon name={props.icon} size={20} color={props.titleColor} />
			</View>
			<View style={{ flex: 1 }}>
				<ThemedText style={[styles.rowTitle, { color: props.titleColor }]}>{props.title}</ThemedText>
				<ThemedText style={[styles.rowSubtitle, { color: props.subtitleColor }]}>{props.subtitle}</ThemedText>
			</View>
			{props.onPress ? <ThemedText style={{ opacity: 0.7 }}>›</ThemedText> : null}
		</>
	);

	return props.onPress ? (
		<Pressable onPress={props.onPress} style={[styles.row, { backgroundColor: props.surface, borderColor: props.border }]}>
			{content}
		</Pressable>
	) : (
		<View style={[styles.row, { backgroundColor: props.surface, borderColor: props.border }]}>{content}</View>
	);
}

function LinkRow(props: {
	surface: string;
	border: string;
	mutedBg: string;
	titleColor: string;
	icon: AppIconName;
	title: string;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={props.onPress} style={[styles.row, { backgroundColor: props.surface, borderColor: props.border }]}>
			<View style={[styles.iconBox, { backgroundColor: props.mutedBg }]}>
				<AppIcon name={props.icon} size={20} color={props.titleColor} />
			</View>
			<ThemedText style={[styles.rowTitle, { flex: 1, color: props.titleColor }]}>{props.title}</ThemedText>
			<ThemedText style={{ opacity: 0.7 }}>›</ThemedText>
		</Pressable>
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
	sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
	functionList: { gap: 12 },
	row: {
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconBox: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: { fontSize: 18 },
	rowTitle: { fontSize: 15, fontWeight: '700' },
	rowSubtitle: { fontSize: 12, marginTop: 2 },

	dangerBox: {
		marginTop: 18,
		borderRadius: 16,
		backgroundColor: '#FFF1F1',
		padding: 14,
	},
	dangerTitle: { fontWeight: '800', color: '#B91717', marginBottom: 6 },
	dangerText: { color: '#7A1B1B', opacity: 0.9 },
	dangerBtn: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#B91717',
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: 'center',
	},
	dangerBtnText: { color: '#B91717', fontWeight: '800' },
});
