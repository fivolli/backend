import { useMemo, useState } from 'react';
import {
  Alert,
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
  },
} as const;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

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
    if (!canSubmit) return;
    setBusy(true);
    try {
      await register({ name, email, phone, password, role });
      router.replace('/home');
      if (Platform.OS !== 'web') {
        Alert.alert(t(lang, 'common.done'), t(lang, 'profile.register_success'));
      }
    } catch (e: any) {
      Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.operation_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: contentPadV, paddingHorizontal: contentPadH, flexGrow: 1 }}
        >
          <View
            style={[
              styles.authHeader,
              {
                backgroundColor: '#fff',
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
            <ThemedText style={[styles.welcomeTitle, { color: primary }]}>{copy.welcome}</ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: '#fff' }]}>{copy.name}</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={copy.namePh}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="words"
              style={[
                styles.inputFieldBlue,
                {
                  borderColor: focused === 'name' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                },
              ]}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: '#fff' }]}>{copy.email}</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={copy.emailPh}
              placeholderTextColor="rgba(255,255,255,0.7)"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.inputFieldBlue,
                {
                  borderColor: focused === 'email' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                },
              ]}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: '#fff' }]}>{copy.phone}</ThemedText>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={copy.phonePh}
              placeholderTextColor="rgba(255,255,255,0.7)"
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[
                styles.inputFieldBlue,
                {
                  borderColor: focused === 'phone' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                },
              ]}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: '#fff' }]}>{copy.role}</ThemedText>
            <View style={[styles.roleRow, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Pressable
                onPress={() => setRole('user')}
                style={[styles.roleBtn, role === 'user' ? [styles.roleBtnActive, { borderColor: '#fff' }] : null]}
              >
                <ThemedText style={[styles.roleText, { color: '#fff', opacity: role === 'user' ? 1 : 0.8 }]}
                >
                  {copy.roleUser}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setRole('volunteer')}
                style={[styles.roleBtn, role === 'volunteer' ? [styles.roleBtnActive, { borderColor: '#fff' }] : null]}
              >
                <ThemedText style={[styles.roleText, { color: '#fff', opacity: role === 'volunteer' ? 1 : 0.8 }]}
                >
                  {copy.roleVolunteer}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: '#fff' }]}>{copy.password}</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={copy.passwordPh}
              placeholderTextColor="rgba(255,255,255,0.7)"
              secureTextEntry
              autoCapitalize="none"
              style={[
                styles.inputFieldBlue,
                {
                  borderColor: focused === 'password' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                },
              ]}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: danger, opacity: !canSubmit ? 0.65 : pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText style={styles.btnText}>{busy ? t(lang, 'profile.please_wait') : copy.register}</ThemedText>
          </Pressable>

          <ThemedText style={[styles.authLink, { color: 'rgba(255,255,255,0.7)' }]}>
            {copy.haveAccount}{' '}
            <ThemedText
              type="link"
              style={[styles.authLinkSpan, { color: '#fff' }]}
              onPress={() => router.replace('/login')}
            >
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

  inputFieldBlue: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: {
    borderWidth: 2,
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
