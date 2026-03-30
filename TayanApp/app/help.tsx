import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

const FAQ: { qKey: string; aKey: string }[] = [
	{ qKey: 'help.faq.q1', aKey: 'help.faq.a1' },
	{ qKey: 'help.faq.q2', aKey: 'help.faq.a2' },
	{ qKey: 'help.faq.q3', aKey: 'help.faq.a3' },
	{ qKey: 'help.faq.q4', aKey: 'help.faq.a4' },
];

export default function HelpScreen() {
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
	const surface = useThemeColor({}, 'surface');
	const border = useThemeColor({}, 'border');
	const mutedBg = useThemeColor({}, 'background');
	const text = useThemeColor({}, 'text');
	const muted = useThemeColor({ light: '#555', dark: '#C3CCDA' }, 'tabIconDefault');
	const { lang } = useAuth();

	return (
		<ThemedView style={styles.container}>
			<View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
				<View style={styles.headerTop}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<ThemedText style={styles.backText}>←</ThemedText>
					</Pressable>
					<ThemedText style={styles.headerTitle}>{t(lang, 'settings.help')}</ThemedText>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<ThemedText style={[styles.sectionTitle, { color: titleColor }]}>{t(lang, 'help.faq')}</ThemedText>
				{FAQ.map((x, idx) => (
					<View key={idx} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
						<ThemedText style={[styles.q, { color: titleColor }]}>❓ {t(lang, x.qKey)}</ThemedText>
						<ThemedText style={[styles.a, { color: muted }]}>{t(lang, x.aKey)}</ThemedText>
					</View>
				))}

				<ThemedText style={[styles.sectionTitle, { marginTop: 18, color: titleColor }]}>{t(lang, 'help.contacts')}</ThemedText>
				<View style={styles.functionList}>
					<ContactItem
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						subtitleColor={text}
						icon="📞"
						title={t(lang, 'help.phone')}
						subtitle="+996 555 000 000"
						onPress={() => Linking.openURL('tel:+996555000000')}
					/>
					<ContactItem
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						subtitleColor={text}
						icon="📧"
						title={t(lang, 'help.email')}
						subtitle="fiptayan@gmail.com"
						onPress={() => Linking.openURL('mailto:fiptayan@gmail.com')}
					/>
					<ContactItem
						surface={surface}
						border={border}
						mutedBg={mutedBg}
						titleColor={titleColor}
						subtitleColor={text}
						icon="🌐"
						title={t(lang, 'help.website')}
						subtitle="www.tayan.kg"
						onPress={() => Linking.openURL('https://tayantsi.netlify.app/')}
					/>
				</View>
			</ScrollView>
		</ThemedView>
	);
}

function ContactItem(props: {
	surface: string;
	border: string;
	mutedBg: string;
	titleColor: string;
	subtitleColor: string;
	icon: string;
	title: string;
	subtitle: string;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={props.onPress} style={[styles.row, { backgroundColor: props.surface, borderColor: props.border }]}>
			<View style={[styles.iconBox, { backgroundColor: props.mutedBg }]}>
				<ThemedText style={styles.iconText}>{props.icon}</ThemedText>
			</View>
			<View style={{ flex: 1 }}>
				<ThemedText style={[styles.rowTitle, { color: props.titleColor }]}>{props.title}</ThemedText>
				<ThemedText style={[styles.rowSubtitle, { color: props.subtitleColor }]}>{props.subtitle}</ThemedText>
			</View>
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
	card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
	q: { fontWeight: '800', marginBottom: 6 },
	a: { lineHeight: 20 },

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
});
