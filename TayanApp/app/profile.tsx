import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';
import { AppIcon } from '@/components/app-icon';

export default function ProfileScreen() {
	const { loading, me, signIn, register, signOut, lang, token, refreshMe } = useAuth();
	const insets = useSafeAreaInsets();
	const primary = useThemeColor({}, 'primary');
	const danger = useThemeColor({}, 'danger');
	const surface = useThemeColor({}, 'surface');
	const mutedBg = useThemeColor({}, 'background');
	const border = useThemeColor({}, 'border');
	const text = useThemeColor({}, 'text');
	const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');

	const [mode, setMode] = useState<'login' | 'register'>('login');

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState<'user' | 'volunteer'>('user');
	const [busy, setBusy] = useState(false);
	const [saveBusy, setSaveBusy] = useState(false);
	const [avatarBusy, setAvatarBusy] = useState(false);
	const [focused, setFocused] = useState<string | null>(null);
	const [keyboardOpen, setKeyboardOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [avatarFailed, setAvatarFailed] = useState(false);

	const avatarUri = useMemo(() => {
		const v = String(me?.avatar_url || '').trim();
		if (!v) return null;
		if (v.startsWith('data:image/')) return v;
		if (v.startsWith('https://') || v.startsWith('http://')) return v;
		if (v.startsWith('/')) return `${API_BASE}${v}`;
		return null;
	}, [me?.avatar_url]);

	// When keyboard is open (especially on iOS), shrink auth headers so inputs remain visible.
	useEffect(() => {
		const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
		const subShow = Keyboard.addListener(showEvt as any, () => setKeyboardOpen(true));
		const subHide = Keyboard.addListener(hideEvt as any, () => setKeyboardOpen(false));
		return () => {
			subShow.remove();
			subHide.remove();
		};
	}, []);

	useEffect(() => {
		setAvatarFailed(false);
	}, [me?.avatar_url]);

	useEffect(() => {
		if (!me) return;
		if (editing) return;
		setEditName(me.name || '');
		setEditEmail(String(me.email || ''));
	}, [me, editing]);

	const canSubmit = useMemo(() => {
		if (!email.trim() || !password) return false;
		if (mode === 'register' && !name.trim()) return false;
		return true;
	}, [mode, email, password, name]);

	async function onSubmit() {
		if (!canSubmit || busy) return;
		setBusy(true);
		try {
			if (mode === 'login') {
				await signIn(email, password);
				Alert.alert(t(lang, 'common.done'), t(lang, 'profile.login_success'));
				if (Platform.OS === 'web') {
					router.replace('/home');
				} else {
					router.back();
				}
			} else {
				await register({ name, email, phone, password, role });
				Alert.alert(t(lang, 'common.done'), t(lang, 'profile.register_success'));
				if (Platform.OS === 'web') {
					router.replace('/home');
				} else {
					router.back();
				}
			}
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.operation_failed'));
		} finally {
			setBusy(false);
		}
	}

	async function onSaveProfile() {
		if (saveBusy) return;
		if (!token) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'profile.operation_failed'));
			return;
		}
		if (!editName.trim()) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'profile.name_required'));
			return;
		}

		setSaveBusy(true);
		try {
			await api('/auth/me', {
				method: 'PATCH',
				token,
				lang,
				body: {
					name: editName,
					email: editEmail,
				},
			});
			await refreshMe();
			setEditing(false);
			Alert.alert(t(lang, 'common.done'), t(lang, 'profile.profile_saved'));
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.operation_failed'));
		} finally {
			setSaveBusy(false);
		}
	}

	async function uploadAvatarFromAsset(asset: any) {
		if (!token) {
			Alert.alert(t(lang, 'common.error'), t(lang, 'profile.operation_failed'));
			return;
		}
		if (avatarBusy) return;
		const uri = String(asset?.uri || '');
		if (!uri) return;

		setAvatarBusy(true);
		try {
			const form = new FormData();
			const name = String(asset?.fileName || asset?.filename || 'avatar.jpg');
			const type = String(asset?.mimeType || 'image/jpeg');
			form.append('file', { uri, name, type } as any);

			const acceptLang = lang === 'kg' ? 'ky' : lang;
			const res = await fetch(`${API_BASE}/auth/me/avatar`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Accept-Language': acceptLang,
				},
				body: form,
			});

			const text = await res.text();
			let data: any = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				data = text;
			}
			if (!res.ok) {
				const message = (data && (data.detail || data.message)) ? String(data.detail || data.message) : `HTTP ${res.status}`;
				throw new Error(message);
			}

			await refreshMe();
			Alert.alert(t(lang, 'common.done'), t(lang, 'profile.avatar_updated'));
		} catch (e: any) {
			Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.avatar_upload_failed'));
		} finally {
			setAvatarBusy(false);
		}
	}

	async function onPickAvatarFromLibrary() {
		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) {
			Alert.alert(t(lang, 'common.unavailable'), t(lang, 'profile.avatar_upload_failed'));
			return;
		}
		const res = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});
		if (res.canceled) return;
		const asset = res.assets?.[0];
		if (!asset) return;
		await uploadAvatarFromAsset(asset);
	}

	async function onTakeAvatarPhoto() {
		const perm = await ImagePicker.requestCameraPermissionsAsync();
		if (!perm.granted) {
			Alert.alert(t(lang, 'common.unavailable'), t(lang, 'profile.avatar_upload_failed'));
			return;
		}
		const res = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});
		if (res.canceled) return;
		const asset = res.assets?.[0];
		if (!asset) return;
		await uploadAvatarFromAsset(asset);
	}

	function onPressAvatar() {
		if (avatarBusy) return;
		if (Platform.OS === 'web') {
			void onPickAvatarFromLibrary();
			return;
		}
		Alert.alert(t(lang, 'profile.avatar_action_title'), undefined, [
			{ text: t(lang, 'profile.avatar_choose_photo'), onPress: () => void onPickAvatarFromLibrary() },
			{ text: t(lang, 'profile.avatar_take_photo'), onPress: () => void onTakeAvatarPhoto() },
			{ text: t(lang, 'common.cancel'), style: 'cancel' },
		]);
	}

	function onCancelEdit() {
		if (!me) return;
		setEditing(false);
		setEditName(me.name || '');
		setEditEmail(String(me.email || ''));
	}

	if (!me) {
		const isRegister = mode === 'register';
		const headerTopPad = (keyboardOpen ? 24 : 64) + insets.top;
		const headerBottomPad = keyboardOpen ? 24 : 48;
		const formTopPad = keyboardOpen ? 24 : 48;
		return (
			<ThemedView style={[styles.container, isRegister ? { backgroundColor: primary } : { backgroundColor: 'white' }]}>
				<KeyboardAvoidingView
					style={styles.kav}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={0}
				>
				{isRegister ? (
					<>
						<View style={[styles.authHeader, styles.authHeaderWhite, { paddingTop: headerTopPad, paddingBottom: headerBottomPad }]}>
							<Pressable onPress={() => router.back()} style={[styles.authBackBtn, styles.authBackBtnOnWhite]}>
								<Text style={[styles.authBackText, { color: titleColor }]}>←</Text>
							</Pressable>
							<Image
								source={require('../assets/images/logo2-removebg-preview.png')}
								style={[styles.authLogoSmall, keyboardOpen ? styles.authLogoSmallCompact : null]}
								resizeMode="contain"
							/>
							<Text style={[styles.authWelcome, { color: titleColor }]}>{t(lang, 'profile.welcome')}</Text>
						</View>

						<ScrollView
							style={[styles.authForm, { backgroundColor: primary }]}
							contentContainerStyle={[styles.authFormInner, { paddingTop: formTopPad, paddingBottom: 32 + insets.bottom }]}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
							automaticallyAdjustKeyboardInsets
						>
							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, styles.inputLabelOnBlue]}>{t(lang, 'profile.name_label')}</Text>
								<TextInput
									style={[
										styles.inputField,
										styles.inputFieldOnBlue,
										focused === 'name' ? styles.inputFieldOnBlueFocused : null,
									]}
									value={name}
									onChangeText={setName}
									placeholder={t(lang, 'profile.name_placeholder')}
									placeholderTextColor="rgba(255,255,255,0.6)"
									autoCapitalize="words"
									onFocus={() => setFocused('name')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, styles.inputLabelOnBlue]}>{t(lang, 'profile.email_label')}</Text>
								<TextInput
									style={[
										styles.inputField,
										styles.inputFieldOnBlue,
										focused === 'email' ? styles.inputFieldOnBlueFocused : null,
									]}
									value={email}
									onChangeText={setEmail}
									placeholder="example@mail.com"
									placeholderTextColor="rgba(255,255,255,0.6)"
									autoCapitalize="none"
									keyboardType="email-address"
									onFocus={() => setFocused('email')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, styles.inputLabelOnBlue]}>{t(lang, 'profile.phone_label')}</Text>
								<TextInput
									style={[
										styles.inputField,
										styles.inputFieldOnBlue,
										focused === 'phone' ? styles.inputFieldOnBlueFocused : null,
									]}
									value={phone}
									onChangeText={setPhone}
									placeholder="+996 XXX XXX XXX"
									placeholderTextColor="rgba(255,255,255,0.6)"
									keyboardType="phone-pad"
									autoCapitalize="none"
									onFocus={() => setFocused('phone')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, styles.inputLabelOnBlue]}>{t(lang, 'profile.role_label')}</Text>
								<View style={styles.roleRowOnBlue}>
									<Pressable
										style={({ pressed }) => [
											styles.roleBtnOnBlue,
											role === 'user' ? styles.roleBtnOnBlueActive : null,
											pressed ? { opacity: 0.95 } : null,
										]}
										onPress={() => setRole('user')}
									>
										<Text style={[styles.roleTextOnBlue, role === 'user' ? styles.roleTextOnBlueActive : null]}>{t(lang, 'profile.role_user')}</Text>
									</Pressable>
									<Pressable
										style={({ pressed }) => [
											styles.roleBtnOnBlue,
											role === 'volunteer' ? styles.roleBtnOnBlueActive : null,
											pressed ? { opacity: 0.95 } : null,
										]}
										onPress={() => setRole('volunteer')}
									>
										<Text style={[styles.roleTextOnBlue, role === 'volunteer' ? styles.roleTextOnBlueActive : null]}>{t(lang, 'profile.role_volunteer')}</Text>
									</Pressable>
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, styles.inputLabelOnBlue]}>{t(lang, 'profile.password_label')}</Text>
								<TextInput
									style={[
										styles.inputField,
										styles.inputFieldOnBlue,
										focused === 'password' ? styles.inputFieldOnBlueFocused : null,
									]}
									value={password}
									onChangeText={setPassword}
									placeholder={t(lang, 'profile.password_placeholder')}
									placeholderTextColor="rgba(255,255,255,0.6)"
									secureTextEntry
									autoCapitalize="none"
									onFocus={() => setFocused('password')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<Pressable
								style={({ pressed }) => [
									styles.webBtn,
									{ backgroundColor: danger, opacity: !canSubmit || busy ? 0.6 : pressed ? 0.9 : 1 },
								]}
								onPress={onSubmit}
								disabled={!canSubmit || busy}
							>
								<Text style={styles.webBtnText}>{busy ? t(lang, 'profile.please_wait') : t(lang, 'profile.register_button')}</Text>
							</Pressable>

							<View style={styles.authLinkWrap}>
								<Text style={styles.authLinkOnBlue}>
									{t(lang, 'profile.have_account')}{' '}
									<Text style={styles.authLinkActionOnBlue} onPress={() => setMode('login')}>
										{t(lang, 'profile.sign_in_button')}
									</Text>
								</Text>
							</View>
						</ScrollView>
					</>
				) : (
					<>
						<View style={[styles.authHeader, { backgroundColor: primary, paddingTop: headerTopPad, paddingBottom: headerBottomPad }]}>
							<Pressable onPress={() => router.back()} style={[styles.authBackBtn, styles.authBackBtnOnBlue]}>
								<Text style={[styles.authBackText, { color: 'white' }]}>←</Text>
							</Pressable>
							<Image
								source={require('../assets/images/tayan_logo.jpg')}
								style={[styles.authLogoLarge, keyboardOpen ? styles.authLogoLargeCompact : null]}
								resizeMode="cover"
							/>
							<Text style={styles.loginTitle}>{t(lang, 'profile.sign_in_button')}</Text>
						</View>

						<ScrollView
							contentContainerStyle={[styles.authFormInner, { paddingTop: formTopPad, paddingBottom: 32 + insets.bottom }]}
							style={styles.authForm}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
							automaticallyAdjustKeyboardInsets
						>
							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, { color: titleColor }]}>{t(lang, 'profile.email_label')}</Text>
								<TextInput
									style={[styles.inputField, focused === 'email' ? [styles.inputFieldFocused, { borderColor: primary }] : null]}
									value={email}
									onChangeText={setEmail}
									placeholder="example@mail.com"
									placeholderTextColor="#999"
									keyboardType="email-address"
									autoCapitalize="none"
									onFocus={() => setFocused('email')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, { color: titleColor }]}>{t(lang, 'profile.password_label')}</Text>
								<TextInput
									style={[styles.inputField, focused === 'password' ? [styles.inputFieldFocused, { borderColor: primary }] : null]}
									value={password}
									onChangeText={setPassword}
									placeholder={t(lang, 'profile.password_placeholder')}
									placeholderTextColor="#999"
									secureTextEntry
									autoCapitalize="none"
									onFocus={() => setFocused('password')}
									onBlur={() => setFocused(null)}
								/>
							</View>

							<Pressable
								style={({ pressed }) => [
									styles.webBtn,
									{ backgroundColor: danger, opacity: !canSubmit || busy ? 0.6 : pressed ? 0.9 : 1 },
								]}
								onPress={onSubmit}
								disabled={!canSubmit || busy}
							>
								<Text style={styles.webBtnText}>{busy ? t(lang, 'profile.please_wait') : t(lang, 'profile.sign_in_button')}</Text>
							</Pressable>

							<View style={styles.authLinkWrap}>
								<Text style={styles.authLink}>
									{t(lang, 'profile.no_account')}{' '}
									<Text style={styles.authLinkAction} onPress={() => setMode('register')}>
										{t(lang, 'profile.register_button')}
									</Text>
								</Text>
							</View>
						</ScrollView>
					</>
				)}
				</KeyboardAvoidingView>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<View style={styles.profileHeaderWrap}>
					<View style={[styles.profileHeader, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
						<View style={styles.profileHeaderTop}>
							<Pressable onPress={() => router.back()} style={styles.headerIconBtn}>
								<ThemedText style={styles.headerIconText}>←</ThemedText>
							</Pressable>
							<ThemedText style={styles.profileHeaderTitle}>{t(lang, 'profile.title')}</ThemedText>
							<Pressable onPress={() => router.push('/settings')} style={styles.headerIconBtn}>
								<AppIcon name="lock" size={18} color="#fff" />
							</Pressable>
						</View>

						<View style={styles.profileHeaderCenter}>
							<Pressable
								onPress={onPressAvatar}
								disabled={avatarBusy}
								hitSlop={12}
								style={({ pressed }) => [
									styles.profileAvatar,
									pressed && !avatarBusy ? { opacity: 0.92 } : null,
								]}
							>
								{avatarUri && !avatarFailed ? (
									<Image
										source={{ uri: avatarUri }}
										style={styles.profileAvatarImage}
										onError={() => setAvatarFailed(true)}
									/>
								) : (
										<AppIcon name="profile" size={30} color="#fff" />
								)}
							</Pressable>
							<ThemedText style={styles.profileName}>{me.name || t(lang, 'common.user')}</ThemedText>
						</View>
					</View>
				</View>

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{loading ? (
					<ThemedText>{t(lang, 'common.loading')}</ThemedText>
				) : (
					<>
						{editing ? (
							<View style={[styles.card, { backgroundColor: surface }]}>
								<ThemedText style={[styles.label, { color: titleColor }]}>{t(lang, 'profile.name_label')}</ThemedText>
								<TextInput
									style={[styles.input, { backgroundColor: mutedBg, borderColor: border, color: text }]}
									value={editName}
									onChangeText={setEditName}
									placeholder={t(lang, 'profile.name_placeholder')}
									placeholderTextColor="#999"
									autoCapitalize="words"
									editable={!saveBusy}
								/>

								<ThemedText style={[styles.label, { color: titleColor }]}>{t(lang, 'profile.email_label')}</ThemedText>
								<TextInput
									style={[styles.input, { backgroundColor: mutedBg, borderColor: border, color: text }]}
									value={editEmail}
									onChangeText={setEditEmail}
									placeholder="example@mail.com"
									placeholderTextColor="#999"
									autoCapitalize="none"
									keyboardType="email-address"
									editable={!saveBusy}
								/>

								<View style={styles.editBtnRow}>
									<Pressable
										style={({ pressed }) => [
											styles.primaryBtn,
											{ backgroundColor: primary, opacity: saveBusy ? 0.7 : pressed ? 0.92 : 1 },
										]}
										onPress={onSaveProfile}
										disabled={saveBusy}
									>
										<Text style={styles.primaryBtnText}>{saveBusy ? t(lang, 'profile.please_wait') : t(lang, 'profile.save')}</Text>
									</Pressable>
									<Pressable
										style={({ pressed }) => [
											styles.secondaryBtn,
											{ borderColor: primary, backgroundColor: surface, opacity: saveBusy ? 0.6 : pressed ? 0.9 : 1 },
										]}
										onPress={onCancelEdit}
										disabled={saveBusy}
									>
									<Text style={[styles.secondaryBtnText, { color: titleColor }]}>{t(lang, 'profile.cancel')}</Text>
									</Pressable>
								</View>
							</View>
						) : (
							<Pressable
								style={({ pressed }) => [
									styles.editOutline,
									{ borderColor: primary, opacity: pressed ? 0.92 : 1 },
								]}
								onPress={() => setEditing(true)}
							>
								<ThemedText style={[styles.editOutlineText, { color: titleColor }]}>{t(lang, 'profile.edit')}</ThemedText>
							</Pressable>
						)}

						<View style={[styles.infoCard, { backgroundColor: surface }]}>
							<View style={styles.infoRow}>
								<View style={[styles.infoIcon, { backgroundColor: mutedBg }]}>
									<AppIcon name="email" size={22} color={titleColor} />
								</View>
								<View style={{ flex: 1 }}>
									<ThemedText style={styles.infoLabel}>{t(lang, 'profile.email_label')}</ThemedText>
									<ThemedText style={[styles.infoValue, { color: titleColor }]}>
										{me.email || 'email@example.com'}
									</ThemedText>
								</View>
							</View>
						</View>

						<View style={[styles.infoCard, { backgroundColor: surface }]}>
							<View style={styles.infoRow}>
								<View style={[styles.infoIcon, { backgroundColor: mutedBg }]}>
									<AppIcon name="phone" size={22} color={titleColor} />
								</View>
								<View style={{ flex: 1 }}>
									<ThemedText style={styles.infoLabel}>{t(lang, 'profile.phone_label')}</ThemedText>
									<ThemedText style={[styles.infoValue, { color: titleColor }]}>
										{me.phone || '+996 XXX XXX XXX'}
									</ThemedText>
								</View>
							</View>
						</View>

						<Pressable
							style={styles.logoutOutline}
							onPress={async () => {
								if (Platform.OS === 'web') {
									await signOut();
									router.replace('/login');
									return;
								}
								Alert.alert(t(lang, 'settings.logout_title'), t(lang, 'settings.logout_confirm'), [
									{ text: t(lang, 'common.cancel'), style: 'cancel' },
									{
										text: t(lang, 'common.sign_out'),
										style: 'destructive',
										onPress: async () => {
											await signOut();
											router.replace('/login');
										},
									},
								]);
							}}
						>
							<ThemedText style={styles.logoutOutlineText}>{t(lang, 'common.sign_out')}</ThemedText>
						</Pressable>
					</>
				)}
			</ScrollView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	kav: { flex: 1 },
	authHeader: {
		paddingHorizontal: 32,
		paddingBottom: 48,
		borderBottomLeftRadius: 40,
		borderBottomRightRadius: 40,
		flexDirection: 'column',
		alignItems: 'center',
	},
	authBackBtn: {
		position: 'absolute',
		left: 24,
		top: 24,
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
	},
	authBackBtnOnBlue: { backgroundColor: 'rgba(255,255,255,0.2)' },
	authBackBtnOnWhite: { backgroundColor: 'rgba(44,45,95,0.06)' },
	authBackText: { fontSize: 18 },
	authHeaderWhite: { backgroundColor: 'white' },
	authLogoSmall: { width: 130, height: 150 },
	authLogoSmallCompact: { width: 96, height: 112 },
	authLogoLarge: { width: 260, height: 260, borderRadius: 52 },
	authLogoLargeCompact: { width: 170, height: 170, borderRadius: 34 },
	authWelcome: { fontSize: 28, fontWeight: '700', marginTop: 8 },
	loginTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginTop: 12 },

	authForm: { flex: 1 },
	authFormInner: { paddingTop: 48, paddingHorizontal: 32, paddingBottom: 32 },

	inputGroup: { marginBottom: 20 },
	inputLabel: { fontWeight: '600', marginBottom: 8, fontSize: 14 },
	inputLabelOnBlue: { color: 'white' },
	inputField: {
		width: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 2,
		borderColor: '#e5e5e5',
		borderRadius: 12,
		// Prevent iPhone Safari from auto-zooming focused inputs on web.
		fontSize: 16,
		backgroundColor: 'white',
	},
	inputFieldFocused: { borderColor: '#2C2D5F' },
	inputFieldOnBlue: {
		backgroundColor: 'rgba(255,255,255,0.1)',
		borderColor: 'rgba(255,255,255,0.2)',
		color: 'white',
	},
	inputFieldOnBlueFocused: { borderColor: 'rgba(255,255,255,0.35)' },

	roleRowOnBlue: { flexDirection: 'row', gap: 10 },
	roleBtnOnBlue: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: 'rgba(255,255,255,0.2)',
		backgroundColor: 'rgba(255,255,255,0.08)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	roleBtnOnBlueActive: {
		borderColor: 'rgba(255,255,255,0.45)',
		backgroundColor: 'rgba(255,255,255,0.16)',
	},
	roleTextOnBlue: { color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
	roleTextOnBlueActive: { color: 'white', fontWeight: '800' },

	webBtn: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
	},
	webBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },

	authLinkWrap: { marginTop: 24, alignItems: 'center' },
	authLink: { color: '#666', fontSize: 14, textAlign: 'center' },
	authLinkAction: { color: '#2C2D5F', textDecorationLine: 'underline' },
	authLinkOnBlue: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
	authLinkActionOnBlue: { color: 'white', textDecorationLine: 'underline' },
	profileHeaderWrap: { paddingHorizontal: 0 },
	profileHeader: {
		paddingHorizontal: 24,
		paddingBottom: 22,
		borderBottomLeftRadius: 32,
		borderBottomRightRadius: 32,
	},
	profileHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerIconBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerIconText: { color: '#fff', fontSize: 18 },
	profileHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
	profileHeaderCenter: { alignItems: 'center', marginTop: 14, gap: 12 },
	profileAvatar: {
		width: 96,
		height: 96,
		borderRadius: 48,
		backgroundColor: 'rgba(255,255,255,0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	profileAvatarImage: { width: '100%', height: '100%', borderRadius: 48 },
	profileAvatarText: { fontSize: 44, lineHeight: 48, textAlign: 'center' },
	profileName: { color: '#fff', fontSize: 22, fontWeight: '800' },

	content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },

	card: {
		borderWidth: 1,
		borderColor: '#e5e5e5',
		borderRadius: 16,
		padding: 14,
		gap: 10,
	},

	infoCard: {
		borderRadius: 16,
		padding: 16,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	infoIcon: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	infoIconText: { fontSize: 18 },
	infoLabel: { opacity: 0.75, fontSize: 12 },
	infoValue: { fontWeight: '700', marginTop: 2 },
	logoutOutline: {
		marginTop: 12,
		width: '100%',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#B91717',
		paddingVertical: 14,
		alignItems: 'center',
	},
	logoutOutlineText: { color: '#B91717', fontWeight: '800' },

	label: { fontWeight: '600' },
	muted: { opacity: 0.7 },
	input: {
		borderWidth: 1,
		borderColor: '#e5e5e5',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
	primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	primaryBtnText: { color: 'white', fontWeight: '800' },
	secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
	secondaryBtnText: { fontWeight: '800' },
	editOutline: { width: '100%', borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
	editOutlineText: { fontWeight: '800' },
	avatarPreviewWrap: { marginTop: 10, alignItems: 'center' },
	avatarPreview: { width: 72, height: 72, borderRadius: 36 },

	roleRow: { flexDirection: 'row', gap: 8 },
	roleBtn: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e5e5',
		alignItems: 'center',
	},
	roleBtnActive: { borderColor: '#2C2D5F' },
	segmentTextActive: { color: '#2C2D5F', fontWeight: '700' },

	btn: {
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	btnPrimary: { backgroundColor: '#2C2D5F' },
	btnDanger: { backgroundColor: '#B91717', marginTop: 8 },
	btnDisabled: { backgroundColor: '#999' },
	btnTextLight: { color: 'white', fontWeight: '600' },
});
