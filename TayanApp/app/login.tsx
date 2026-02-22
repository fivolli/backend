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
import { useAuth } from '@/providers/auth-provider';

const LOGO = require('@/assets/images/tayan_logo.jpg');

const COPY = {
  ru: {
    title: 'Вход',
    email: 'Email',
    emailPh: 'example@mail.com',
    password: 'Пароль',
    passwordPh: 'Введите пароль',
    login: 'Войти',
    noAccount: 'Нет аккаунта?',
    goRegister: 'Зарегистрироваться',
  },
  en: {
    title: 'Log in',
    email: 'Email',
    emailPh: 'example@mail.com',
    password: 'Password',
    passwordPh: 'Enter password',
    login: 'Log in',
    noAccount: "Don't have an account?",
    goRegister: 'Sign up',
  },
  kg: {
    title: 'Кирүү',
    email: 'Email',
    emailPh: 'example@mail.com',
    password: 'Сыр сөз',
    passwordPh: 'Сыр сөздү жазыңыз',
    login: 'Кирүү',
    noAccount: 'Аккаунт жокпу?',
    goRegister: 'Катталуу',
  },
} as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

  const { signIn, lang } = useAuth();

  const copy = COPY[(lang as keyof typeof COPY) || 'ru'] ?? COPY.ru;

  const isCompact = width <= 480;
  const headerTopPad = 64;
  const headerHPad = 32;
  const headerBottomPad = 48;

  const contentPadV = isCompact ? 24 : 48;
  const contentPadH = isCompact ? 16 : 32;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const canSubmit = useMemo(() => !!email.trim() && !!password && !busy, [email, password, busy]);

  async function onSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await signIn(email, password);
      Alert.alert(t(lang, 'common.done'), t(lang, 'profile.login_success'));
      router.replace('/home');
    } catch (e: any) {
      Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'profile.operation_failed'));
    } finally {
      setBusy(false);
    }
  }

  const imageSize = Math.min(385, Math.max(240, width - 2 * headerHPad));
  const imageRadius = Math.round(imageSize * 0.2);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View
          style={[
            styles.authHeader,
            {
              backgroundColor: primary,
              paddingTop: insets.top + headerTopPad,
              paddingHorizontal: headerHPad,
              paddingBottom: headerBottomPad,
            },
          ]}
        >
          <Image
            source={LOGO}
            style={{ width: imageSize, height: imageSize, borderRadius: imageRadius, resizeMode: 'cover' }}
          />
          <ThemedText style={styles.headerTitle}>{copy.title}</ThemedText>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: contentPadV, paddingHorizontal: contentPadH, flexGrow: 1 }}
        >
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: primary }]}>{copy.email}</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={copy.emailPh}
              placeholderTextColor="#9BA1A6"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.inputField,
                {
                  borderColor: focused === 'email' ? primary : border,
                  color: text,
                },
              ]}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: primary }]}>{copy.password}</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={copy.passwordPh}
              placeholderTextColor="#9BA1A6"
              secureTextEntry
              autoCapitalize="none"
              style={[
                styles.inputField,
                {
                  borderColor: focused === 'password' ? primary : border,
                  color: text,
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
              { backgroundColor: danger, opacity: !canSubmit ? 0.6 : pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText style={styles.btnText}>{busy ? t(lang, 'profile.please_wait') : copy.login}</ThemedText>
          </Pressable>

          <View style={{ flex: 1 }} />

          <ThemedText style={[styles.authLink, { color: '#666' }]}>
            {copy.noAccount}{' '}
            <ThemedText
              type="link"
              style={[styles.authLinkSpan, { color: primary }]}
              onPress={() => router.replace('/register')}
            >
              {copy.goRegister}
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

  headerTitle: {
    color: '#fff',
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
    fontSize: 14,
    backgroundColor: '#fff',
  },

  btn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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

