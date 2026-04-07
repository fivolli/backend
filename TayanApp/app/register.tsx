import { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { showAlert } from '@/lib/alerts';
import { t } from '@/lib/i18n';
import { useAuth, type UserRole } from '@/providers/auth-provider';

const LOGO = require('@/assets/images/logo2-removebg-preview.png');

const COPY = {
  ru: {
    welcome: '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c',
    name: '\u0418\u043c\u044f',
    namePh: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448\u0435 \u0438\u043c\u044f',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: '\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430',
    phonePh: '+996 XXX XXX XXX',
    allergies: '\u0410\u043b\u043b\u0435\u0440\u0433\u0438\u0438',
    allergiesPh: '\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u043f\u0435\u043d\u0438\u0446\u0438\u043b\u043b\u0438\u043d, \u043e\u0440\u0435\u0445\u0438',
    chronic: '\u0425\u0440\u043e\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0437\u0430\u0431\u043e\u043b\u0435\u0432\u0430\u043d\u0438\u044f',
    chronicPh: '\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0430\u0441\u0442\u043c\u0430, \u0434\u0438\u0430\u0431\u0435\u0442',
    role: '\u041a\u0442\u043e \u0432\u044b?',
    roleUser: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c',
    roleVolunteer: '\u0412\u043e\u043b\u043e\u043d\u0442\u0451\u0440',
    password: '\u041f\u0430\u0440\u043e\u043b\u044c',
    passwordPh: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c',
    register: '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f',
    haveAccount: '\u0423\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?',
    login: '\u0412\u043e\u0439\u0442\u0438',
    nameRequired: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043c\u044f',
    emailRequired: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 email',
    emailInvalid: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email (\u0434\u043e\u043b\u0436\u0435\u043d \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c @)',
    phoneRequired: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430',
    phoneInvalid: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430',
    passwordRequired: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c',
    passwordTooShort: '\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043d\u0435 \u043c\u0435\u043d\u0435\u0435 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432',
  },
  en: {
    welcome: 'Welcome',
    name: 'Name',
    namePh: 'Enter your name',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: 'Phone number',
    phonePh: '+996 XXX XXX XXX',
    allergies: 'Allergies',
    allergiesPh: 'For example: penicillin, nuts',
    chronic: 'Chronic conditions',
    chronicPh: 'For example: asthma, diabetes',
    role: 'Who are you?',
    roleUser: 'User',
    roleVolunteer: 'Volunteer',
    password: 'Password',
    passwordPh: 'Enter password',
    register: 'Sign up',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    nameRequired: 'Enter your name',
    emailRequired: 'Enter email',
    emailInvalid: 'Enter a valid email (must include @)',
    phoneRequired: 'Enter phone number',
    phoneInvalid: 'Enter a valid phone number',
    passwordRequired: 'Enter password',
    passwordTooShort: 'Password must be at least 8 characters',
  },
  kg: {
    welcome: '\u041a\u043e\u0448 \u043a\u0435\u043b\u0438\u04a3\u0438\u0437',
    name: '\u0410\u0442\u044b\u04a3\u044b\u0437',
    namePh: '\u0410\u0442\u044b\u04a3\u044b\u0437\u0434\u044b \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: '\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u043d\u043e\u043c\u0435\u0440\u0438',
    phonePh: '+996 XXX XXX XXX',
    allergies: '\u0410\u043b\u043b\u0435\u0440\u0433\u0438\u044f\u043b\u0430\u0440',
    allergiesPh: '\u041c\u0438\u0441\u0430\u043b\u044b: \u043f\u0435\u043d\u0438\u0446\u0438\u043b\u043b\u0438\u043d, \u0436\u0430\u04a3\u0433\u0430\u043a',
    chronic: '\u04e8\u043d\u04e9\u043a\u04e9\u0442 \u043e\u043e\u0440\u0443\u043b\u0430\u0440',
    chronicPh: '\u041c\u0438\u0441\u0430\u043b\u044b: \u0430\u0441\u0442\u043c\u0430, \u0434\u0438\u0430\u0431\u0435\u0442',
    role: '\u0421\u0438\u0437 \u043a\u0438\u043c\u0441\u0438\u0437?',
    roleUser: '\u041a\u043e\u043b\u0434\u043e\u043d\u0443\u0443\u0447\u0443',
    roleVolunteer: '\u042b\u043a\u0442\u044b\u044f\u0440\u0447\u044b',
    password: '\u0421\u044b\u0440 \u0441\u04e9\u0437',
    passwordPh: '\u0421\u044b\u0440 \u0441\u04e9\u0437\u0434\u04af \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    register: '\u041a\u0430\u0442\u0442\u0430\u043b\u0443\u0443',
    haveAccount: '\u0410\u043a\u043a\u0430\u0443\u043d\u0442\u0443\u04a3\u0443\u0437 \u0431\u0430\u0440\u0431\u044b?',
    login: '\u041a\u0438\u0440\u04af\u04af',
    nameRequired: '\u0410\u0442\u044b\u04a3\u044b\u0437\u0434\u044b \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    emailRequired: 'Email \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    emailInvalid: '\u0422\u0443\u0443\u0440\u0430 email \u0436\u0430\u0437\u044b\u04a3\u044b\u0437 (@ \u0431\u043e\u043b\u0443\u0448\u0443 \u043a\u0435\u0440\u0435\u043a)',
    phoneRequired: '\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u043d\u043e\u043c\u0435\u0440\u0438\u043d \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    phoneInvalid: '\u0422\u0443\u0443\u0440\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u043d\u043e\u043c\u0435\u0440\u0438\u043d \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    passwordRequired: '\u0421\u044b\u0440 \u0441\u04e9\u0437\u0434\u04af \u0436\u0430\u0437\u044b\u04a3\u044b\u0437',
    passwordTooShort: '\u0421\u044b\u0440 \u0441\u04e9\u0437 \u043a\u0435\u043c\u0438\u043d\u0434\u0435 8 \u0431\u0435\u043b\u0433\u0438\u0434\u0435\u043d \u0442\u0443\u0440\u0443\u0448\u0443 \u043a\u0435\u0440\u0435\u043a',
  },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const muted = useThemeColor({ light: '#666', dark: '#C3CCDA' }, 'tabIconDefault');

  const { register, lang } = useAuth();
  const copy = COPY[(lang as keyof typeof COPY) || 'ru'] ?? COPY.ru;

  const isCompact = width <= 480;
  const headerTopPad = 64;
  const headerHPad = 32;
  const headerBottomPad = 48;

  const contentPadV = isCompact ? 24 : 48;
  const contentPadH = isCompact ? 16 : 32;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'phone' | 'allergies' | 'chronic' | 'password' | null>(null);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    if (!phone.trim()) return false;
    if (!password) return false;
    return true;
  }, [busy, name, email, phone, password]);

  async function onSubmit() {
    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();
    const phoneTrimmed = phone.trim();
    const phoneDigits = phoneTrimmed.replace(/\D/g, '');

    if (!nameTrimmed) {
      showAlert(t(lang, 'common.error'), copy.nameRequired);
      return;
    }
    if (!emailTrimmed) {
      showAlert(t(lang, 'common.error'), copy.emailRequired);
      return;
    }
    if (!EMAIL_RE.test(emailTrimmed)) {
      showAlert(t(lang, 'common.error'), copy.emailInvalid);
      return;
    }
    if (!phoneTrimmed) {
      showAlert(t(lang, 'common.error'), copy.phoneRequired);
      return;
    }
    if (phoneDigits.length < 6) {
      showAlert(t(lang, 'common.error'), copy.phoneInvalid);
      return;
    }
    if (!password) {
      showAlert(t(lang, 'common.error'), copy.passwordRequired);
      return;
    }
    if (password.length < 8) {
      showAlert(t(lang, 'common.error'), copy.passwordTooShort);
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      await register({
        name: nameTrimmed,
        email: emailTrimmed,
        phone: phoneTrimmed,
        password,
        role,
        allergies,
        chronic_conditions: chronicConditions,
      });
      router.replace('/home');
      showAlert(t(lang, 'common.done'), t(lang, 'profile.register_success'));
    } catch (e: any) {
      showAlert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.operation_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: contentPadV, paddingHorizontal: contentPadH, flexGrow: 1 }}
        >
          <View
            style={[
              styles.authHeader,
              {
                backgroundColor: surface,
                paddingTop: insets.top + headerTopPad,
                paddingHorizontal: headerHPad,
                paddingBottom: headerBottomPad,
                marginHorizontal: -contentPadH,
                marginTop: -contentPadV,
                marginBottom: contentPadV,
              },
            ]}
          >
            <Image source={LOGO} style={{ width: 130, height: 150, resizeMode: 'contain' }} />
            <ThemedText style={[styles.welcomeTitle, { color: titleColor }]}>{copy.welcome}</ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.name}</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={copy.namePh}
              placeholderTextColor={muted}
              autoCapitalize="words"
              style={[styles.inputField, { borderColor: focused === 'name' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.email}</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={copy.emailPh}
              placeholderTextColor={muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputField, { borderColor: focused === 'email' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.phone}</ThemedText>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={copy.phonePh}
              placeholderTextColor={muted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.inputField, { borderColor: focused === 'phone' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.allergies}</ThemedText>
            <TextInput
              value={allergies}
              onChangeText={setAllergies}
              placeholder={copy.allergiesPh}
              placeholderTextColor={muted}
              multiline
              style={[styles.textAreaField, { borderColor: focused === 'allergies' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('allergies')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.chronic}</ThemedText>
            <TextInput
              value={chronicConditions}
              onChangeText={setChronicConditions}
              placeholder={copy.chronicPh}
              placeholderTextColor={muted}
              multiline
              style={[styles.textAreaField, { borderColor: focused === 'chronic' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('chronic')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.role}</ThemedText>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setRole('user')}
                style={[styles.roleBtn, { borderColor: role === 'user' ? primary : border, backgroundColor: surface }]}
              >
                <ThemedText style={[styles.roleText, { color: role === 'user' ? titleColor : muted }]}>{copy.roleUser}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setRole('volunteer')}
                style={[styles.roleBtn, { borderColor: role === 'volunteer' ? primary : border, backgroundColor: surface }]}
              >
                <ThemedText style={[styles.roleText, { color: role === 'volunteer' ? titleColor : muted }]}>{copy.roleVolunteer}</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{copy.password}</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={copy.passwordPh}
              placeholderTextColor={muted}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.inputField, { borderColor: focused === 'password' ? primary : border, color: text, backgroundColor: surface }]}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [styles.btn, { backgroundColor: danger, opacity: !canSubmit ? 0.65 : pressed ? 0.9 : 1 }]}
          >
            <ThemedText style={styles.btnText}>{busy ? t(lang, 'profile.please_wait') : copy.register}</ThemedText>
          </Pressable>

          <ThemedText style={[styles.authLink, { color: muted }]}>
            {copy.haveAccount}{' '}
            <ThemedText type="link" style={[styles.authLinkSpan, { color: titleColor }]} onPress={() => router.replace('/login')}>
              {copy.login}
            </ThemedText>
          </ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  authHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
    gap: 14,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  inputField: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 16,
  },
  textAreaField: {
    width: '100%',
    minHeight: 92,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    fontWeight: '600',
    fontSize: 14,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  authLink: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  authLinkSpan: {
    textDecorationLine: 'underline',
  },
});
