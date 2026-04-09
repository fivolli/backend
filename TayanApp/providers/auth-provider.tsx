import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { DEFAULT_LANG } from '@/lib/config';
import { api } from '@/lib/api';
import { getGeoOrNull } from '@/lib/location';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import {
  clearLastRequestId,
  clearToken,
  getAppLang,
  getFamilyContactPhone,
  getNotificationPrefs,
  getSubscriptionPlan,
  getToken,
  setAppLang,
  setFamilyContactPhone as setFamilyContactPhoneStored,
  setSubscriptionPlan as setSubscriptionPlanStored,
  setToken,
  type SubscriptionPlan,
} from '@/lib/storage';

export type UserRole = 'user' | 'volunteer';

export type Me = {
  id: number;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  phone: string;
  role: UserRole;
  allergies?: string | null;
  chronic_conditions?: string | null;
};

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  me: Me | null;
  subscriptionPlan: SubscriptionPlan | null;
  setSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  familyContactPhone: string;
  setFamilyContactPhone: (phone: string) => Promise<void>;
  lang: 'ru' | 'en' | 'kg';
  setLang: (lang: 'ru' | 'en' | 'kg') => void;
  refreshMe: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    allergies?: string;
    chronic_conditions?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeAuthErrorMessage(rawError: unknown, lang: 'ru' | 'en' | 'kg'): string {
  const fallback = lang === 'en'
    ? 'Failed to complete the operation'
    : lang === 'kg'
      ? 'Аракетти аткаруу мүмкүн болгон жок'
      : 'Не удалось выполнить операцию';

  const raw = String((rawError as any)?.message || rawError || '').trim();
  if (!raw) return fallback;

  const msg = raw.toLowerCase();

  if (msg.includes('invalid email or password')) {
    return lang === 'en'
      ? 'Invalid email or password'
      : lang === 'kg'
        ? 'Email же сыр сөз туура эмес'
        : 'Неверный email или пароль';
  }

  if (msg.includes('password must be at least')) {
    return lang === 'en'
      ? 'Password must be at least 8 characters'
      : lang === 'kg'
        ? 'Сыр сөз кеминде 8 белгиден турушу керек'
        : 'Пароль должен быть не менее 8 символов';
  }

  if (msg.includes('email is invalid')) {
    return lang === 'en'
      ? 'Invalid email'
      : lang === 'kg'
        ? 'Email туура эмес'
        : 'Некорректный email';
  }

  if (msg.includes('phone is invalid')) {
    return lang === 'en'
      ? 'Invalid phone number'
      : lang === 'kg'
        ? 'Телефон номери туура эмес'
        : 'Некорректный номер телефона';
  }

  if (
    msg.includes('email is already in use')
    || (msg.includes('email') && (msg.includes('already') || msg.includes('exists') || msg.includes('taken')))
  ) {
    return lang === 'en'
      ? 'This email is already registered'
      : lang === 'kg'
        ? 'Бул email мурунтан катталган'
        : 'Этот email уже зарегистрирован';
  }

  if (
    (msg.includes('phone') || msg.includes('телефон') || msg.includes('номер'))
    && (msg.includes('already') || msg.includes('exists') || msg.includes('taken') || msg.includes('зарегистр'))
  ) {
    return lang === 'en'
      ? 'This phone number is already registered'
      : lang === 'kg'
        ? 'Бул телефон номери мурунтан катталган'
        : 'Этот номер телефона уже зарегистрирован';
  }

  return raw;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [subscriptionPlan, setSubscriptionPlanState] = useState<SubscriptionPlan | null>(null);
  const [familyContactPhone, setFamilyContactPhoneState] = useState('');
  const [lang, setLang] = useState<'ru' | 'en' | 'kg'>(DEFAULT_LANG);

  const setLangPersisted = useCallback((next: 'ru' | 'en' | 'kg') => {
    setLang(next);
    void setAppLang(next);
  }, []);

  const setSubscriptionPlanPersisted = useCallback(async (plan: SubscriptionPlan) => {
    setSubscriptionPlanState(plan);
    await setSubscriptionPlanStored(plan);
  }, []);

  const setFamilyContactPhonePersisted = useCallback(async (phone: string) => {
    const v = String(phone || '').trim();
    setFamilyContactPhoneState(v);
    await setFamilyContactPhoneStored(v);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    const data = await api<Me>('/auth/me', { method: 'GET', token, lang });
    setMe(data);
  }, [token, lang]);

  const syncPushRegistration = useCallback(
    async (authToken: string) => {
      if (!authToken) return;
      try {
        const prefs = await getNotificationPrefs();
        await api('/auth/me/notification-prefs', {
          method: 'PUT',
          token: authToken,
          lang,
          body: prefs,
        });

        if (!(prefs.sos || prefs.volunteers || prefs.updates)) return;

        const pushToken = await registerForPushNotificationsAsync();
        if (!pushToken) return;

        await api('/auth/me/push-token', {
          method: 'PUT',
          token: authToken,
          lang,
          body: { token: pushToken, platform: String(Platform.OS) },
        });
      } catch {
        // keep auth flow uninterrupted if push registration fails
      }
    },
    [lang]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedToken, savedLang, savedPlan, savedFamilyPhone] = await Promise.all([
          getToken(),
          getAppLang(),
          getSubscriptionPlan(),
          getFamilyContactPhone(),
        ]);
        if (!alive) return;
        if (savedLang) setLang(savedLang);
        setSubscriptionPlanState(savedPlan || null);
        setFamilyContactPhoneState(savedFamilyPhone || '');
        if (!savedToken) {
          setTokenState(null);
          setMe(null);
          return;
        }
        setTokenState(savedToken);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!token) return;
      try {
        await refreshMe();
        await syncPushRegistration(token);
      } catch {
        await clearToken();
        await clearLastRequestId();
        setTokenState(null);
        setMe(null);
      }
    })();
  }, [token, loading, refreshMe, syncPushRegistration]);

  useEffect(() => {
    if (!token) return;

    const onActive = (state: string) => {
      if (state === 'active') {
        void syncPushRegistration(token);
      }
    };

    const sub = AppState.addEventListener('change', onActive);
    const t = setInterval(() => {
      void syncPushRegistration(token);
    }, 5 * 60 * 1000);

    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, [token, syncPushRegistration]);

  useEffect(() => {
    // Keep volunteers "online" server-side (updates User.volunteer_online_at) on all screens.
    // Mirrors web behavior: PATCH /volunteer/me/geo every ~30s.
    if (!token) return;
    if (me?.role !== 'volunteer') return;

    let alive = true;
    const tick = async () => {
      try {
        const geo = await getGeoOrNull();
        if (!alive || !geo) return;
        await api('/volunteer/me/geo', {
          method: 'PATCH',
          token,
          lang,
          body: { volunteer_lat: geo.lat, volunteer_lng: geo.lng },
        });
      } catch {
        // ignore
      }
    };

    tick();
    const t = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token, lang, me?.role]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const data = await api<{ access_token: string; token_type: string }>('/auth/login', {
          method: 'POST',
          body: { email: email.trim().toLowerCase(), password },
          lang,
        });
        const t = data?.access_token || null;
        if (!t) throw new Error('Не удалось получить токен');
        await setToken(t);
        setTokenState(t);
        try {
          await refreshMe();
        } catch {
          // ignore
        }
        void syncPushRegistration(t);
      } catch (e) {
        throw new Error(normalizeAuthErrorMessage(e, lang));
      }
    },
    [lang, refreshMe, syncPushRegistration]
  );

  const register = useCallback(
    async (data: { name: string; email: string; phone: string; password: string; role: UserRole; allergies?: string; chronic_conditions?: string }) => {
      try {
        const resp = await api<{ access_token: string; token_type: string }>('/auth/register', {
          method: 'POST',
          body: {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
            password: data.password,
            role: data.role,
            allergies: (data.allergies || '').trim(),
            chronic_conditions: (data.chronic_conditions || '').trim(),
          },
          lang,
        });
        const t = resp?.access_token || null;
        if (!t) throw new Error('Не удалось получить токен');
        await setToken(t);
        setTokenState(t);
        try {
          await refreshMe();
        } catch {
          // ignore
        }
        void syncPushRegistration(t);
      } catch (e) {
        throw new Error(normalizeAuthErrorMessage(e, lang));
      }
    },
    [lang, refreshMe, syncPushRegistration]
  );

  const signOut = useCallback(async () => {
    await clearToken();
    await clearLastRequestId();
    setTokenState(null);
    setMe(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      me,
      subscriptionPlan,
      setSubscriptionPlan: setSubscriptionPlanPersisted,
      familyContactPhone,
      setFamilyContactPhone: setFamilyContactPhonePersisted,
      lang,
      setLang: setLangPersisted,
      refreshMe,
      signIn,
      register,
      signOut,
    }),
    [
      loading,
      token,
      me,
      subscriptionPlan,
      setSubscriptionPlanPersisted,
      familyContactPhone,
      setFamilyContactPhonePersisted,
      lang,
      setLangPersisted,
      refreshMe,
      signIn,
      register,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
