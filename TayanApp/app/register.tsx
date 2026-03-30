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
    welcome: 'Добро пожаловать',
    name: 'Имя',
    namePh: 'Введите ваше имя',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: 'Номер телефона',
    phonePh: '+996 XXX XXX XXX',
    role: 'Кто вы?',
    roleUser: 'Пользователь',
    roleVolunteer: 'Волонтёр',
    password: 'Пароль',
    passwordPh: 'Введите пароль',
    register: 'Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт?',
    login: 'Войти',
    nameRequired: 'Введите имя',
    emailRequired: 'Введите email',
    emailInvalid: 'Введите корректный email (должен содержать @)',
    phoneRequired: 'Введите номер телефона',
    phoneInvalid: 'Введите корректный номер телефона',
    passwordRequired: 'Введите пароль',
    passwordTooShort: 'Пароль должен быть не менее 8 символов',
  },
  en: {
    welcome: 'Welcome',
    name: 'Name',
    namePh: 'Enter your name',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: 'Phone number',
    phonePh: '+996 XXX XXX XXX',
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
    welcome: 'Кош келиңиз',
    name: 'Атыңыз',
    namePh: 'Атыңызды жазыңыз',
    email: 'Email',
    emailPh: 'example@mail.com',
    phone: 'Телефон номери',
    phonePh: '+996 XXX XXX XXX',
    role: 'Сиз кимсиз?',
    roleUser: 'Колдонуучу',
    roleVolunteer: 'Ыктыярчы',
    password: 'Сыр сөз',
    passwordPh: 'Сыр сөздү жазыңыз',
    register: 'Катталуу',
    haveAccount: 'Аккаунтуңуз барбы?',
    login: 'Кирүү',
    nameRequired: 'Атыңызды жазыңыз',
    emailRequired: 'Email жазыңыз',
    emailInvalid: 'Туура email жазыңыз (@ болушу керек)',
    phoneRequired: 'Телефон номерин жазыңыз',
    phoneInvalid: 'Туура телефон номерин жазыңыз',
    passwordRequired: 'Сыр сөздү жазыңыз',
    passwordTooShort: 'Сыр сөз кеминде 8 белгиден турушу керек',
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
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'phone' | 'password' | null>(null);

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
      await register({ name: nameTrimmed, email: emailTrimmed, phone: phoneTrimmed, password, role });
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
