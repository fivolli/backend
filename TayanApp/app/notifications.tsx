import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import { getNotificationPrefs, NotificationPrefs, setNotificationPrefs } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';

export default function NotificationsScreen() {
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const mutedBg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const muted = useThemeColor({ light: '#2C2D5F', dark: '#C3CCDA' }, 'tabIconDefault');
	const infoSurface = useThemeColor({ light: '#EAF2FF', dark: '#1A2236' }, 'surface');
	const { token, lang } = useAuth();

	const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
	const [sendingTest, setSendingTest] = useState(false);

	useEffect(() => {
		let alive = true;
		(async () => {
			const p = await getNotificationPrefs();
			if (alive) setPrefs(p);
			if (alive && token) {
				try {
					await api('/auth/me/notification-prefs', { method: 'PUT', token, lang, body: p });
				} catch {
				}
			}

			if (alive && (p.sos || p.volunteers || p.updates)) {
				void ensureRegistered();
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	async function ensureRegistered() {
		if (!token) return;
		try {
			const pushToken = await registerForPushNotificationsAsync();
			if (!pushToken) {
				Alert.alert(
					t(lang, 'notifications.permission_title'),
					t(lang, 'notifications.permission_text')
				);
				return;
			}
			await api('/auth/me/push-token', {
				method: 'PUT',
				token,
				lang,
				body: { token: pushToken, platform: String(Platform.OS) },
			});
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), String(e?.message || t(lang, 'notifications.enable_failed')));
		}
	}

	async function sendTestPush() {
		if (!token) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'notifications.not_authorized'));
			return;
		}
		setSendingTest(true);
		try {
			await ensureRegistered();
			await api('/auth/me/push/test', {
				method: 'POST',
				token,
				lang,
				body: { title: 'Tayan', body: t(lang, 'notifications.test_body') },
			});
			Alert.alert(t(lang, 'common.done'), t(lang, 'notifications.test_sent'));
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), String(e?.message || t(lang, 'notifications.test_failed')));
		} finally {
			setSendingTest(false);
		}
	}

	async function toggle(key: keyof NotificationPrefs) {
		if (!prefs) return;
		const next: NotificationPrefs = { ...prefs, [key]: !prefs[key] };
		setPrefs(next);
		await setNotificationPrefs(next);

		if (token) {
			try {
				await api('/auth/me/notification-prefs', { method: 'PUT', token, lang, body: next });
			} catch {
			}
		}

		if (next.sos || next.volunteers || next.updates) {
			await ensureRegistered();
		}
	}

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<ThemedText style={styles.backText}>←</ThemedText>
					</Pressable>
					<ThemedText style={styles.headerTitle}>{t(lang, 'settings.notifications')}</ThemedText>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View style={[styles.tipBox, { backgroundColor: infoSurface }]}>
					<ThemedText style={[styles.tipText, { color: text }]}>
						{t(lang, 'notifications.tip')}
					</ThemedText>
				</View>

				<View style={styles.functionList}>
					<NotifItem
						surface={surface}
						mutedBg={mutedBg}
						border={border}
						titleColor={titleColor}
						subtitleColor={muted}
						icon="🚨"
						title={t(lang, 'notifications.sos_title')}
						subtitle={t(lang, 'notifications.sos_sub')}
						enabled={!!prefs?.sos}
						onPress={() => toggle('sos')}
					/>
					<NotifItem
						surface={surface}
						mutedBg={mutedBg}
						border={border}
						titleColor={titleColor}
						subtitleColor={muted}
						icon="👥"
						title={t(lang, 'notifications.volunteers_title')}
						subtitle={t(lang, 'notifications.volunteers_sub')}
						enabled={!!prefs?.volunteers}
						onPress={() => toggle('volunteers')}
					/>
					<NotifItem
						surface={surface}
						mutedBg={mutedBg}
						border={border}
						titleColor={titleColor}
						subtitleColor={muted}
						icon="📢"
						title={t(lang, 'notifications.updates_title')}
						subtitle={t(lang, 'notifications.updates_sub')}
						enabled={!!prefs?.updates}
						onPress={() => toggle('updates')}
					/>
				</View>

				<Pressable
					disabled={sendingTest}
					onPress={sendTestPush}
					style={({ pressed }) => [
						styles.testBtn,
						{ borderColor: primary, backgroundColor: surface },
						sendingTest ? { opacity: 0.6 } : null,
						pressed ? { opacity: 0.9 } : null,
					]}
				>
					<ThemedText style={[styles.testBtnText, { color: titleColor }]}>
						{sendingTest ? t(lang, 'notifications.test_sending') : t(lang, 'notifications.test_send')}
					</ThemedText>
				</Pressable>
			</ScrollView>
		</ThemedView>
	);
}

function NotifItem(props: {
	surface: string;
	mutedBg: string;
	border: string;
	titleColor: string;
	subtitleColor: string;
	icon: string;
	title: string;
	subtitle: string;
	enabled: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={props.onPress} style={[styles.item, { backgroundColor: props.surface, borderColor: props.border }]}>
			<View style={[styles.iconBox, { backgroundColor: props.mutedBg }]}>
				<ThemedText style={styles.iconText}>{props.icon}</ThemedText>
			</View>
			<View style={{ flex: 1 }}>
				<ThemedText style={[styles.title, { color: props.titleColor }]}>{props.title}</ThemedText>
				<ThemedText style={[styles.subtitle, { color: props.subtitleColor }]}>{props.subtitle}</ThemedText>
			</View>
			<Toggle enabled={props.enabled} />
		</Pressable>
	);
}

function Toggle({ enabled }: { enabled: boolean }) {
	return (
		<View style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}>
			<View style={[styles.toggleKnob, enabled ? styles.knobOn : styles.knobOff]} />
		</View>
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
	tipBox: { borderRadius: 14, padding: 12, marginBottom: 12 },
	tipText: {},

	functionList: { gap: 12 },
	item: {
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
	title: { fontSize: 15, fontWeight: '700' },
	subtitle: { fontSize: 12, marginTop: 2 },

	toggle: {
		width: 48,
		height: 28,
		borderRadius: 14,
		padding: 3,
		justifyContent: 'center',
	},
	toggleOn: { backgroundColor: '#2C2D5F', alignItems: 'flex-end' },
	toggleOff: { backgroundColor: '#D0D5DD', alignItems: 'flex-start' },
	toggleKnob: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: 'white',
	},
	knobOn: {},
	knobOff: {},

	testBtn: {
		marginTop: 16,
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: 'center',
	},
	testBtnText: { fontWeight: '800' },
});
