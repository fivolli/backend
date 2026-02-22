import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_LANG } from '@/lib/config';
import { api } from '@/lib/api';
import { getGeoOrNull } from '@/lib/location';
import { clearLastRequestId, clearToken, getAppLang, getToken, setAppLang, setToken } from '@/lib/storage';

export type UserRole = 'user' | 'volunteer';

export type Me = {
  id: number;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  phone: string;
  role: UserRole;
};

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  me: Me | null;
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
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [lang, setLang] = useState<'ru' | 'en' | 'kg'>(DEFAULT_LANG);

  const setLangPersisted = useCallback((next: 'ru' | 'en' | 'kg') => {
    setLang(next);
    void setAppLang(next);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    const data = await api<Me>('/auth/me', { method: 'GET', token, lang });
    setMe(data);
  }, [token, lang]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedToken, savedLang] = await Promise.all([getToken(), getAppLang()]);
        if (!alive) return;
        if (savedLang) setLang(savedLang);
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
      } catch {
        await clearToken();
        await clearLastRequestId();
        setTokenState(null);
        setMe(null);
      }
    })();
  }, [token, loading, refreshMe]);

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
      const data = await api<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
        lang,
      });
      const t = data?.access_token || null;
      if (!t) throw new Error('Не удалось получить токен');
      await setToken(t);
      setTokenState(t);
      await refreshMe();
    },
    [lang, refreshMe]
  );

  const register = useCallback(
    async (data: { name: string; email: string; phone: string; password: string; role: UserRole }) => {
      const resp = await api<{ access_token: string; token_type: string }>('/auth/register', {
        method: 'POST',
        body: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone.trim(),
          password: data.password,
          role: data.role,
        },
        lang,
      });
      const t = resp?.access_token || null;
      if (!t) throw new Error('Не удалось получить токен');
      await setToken(t);
      setTokenState(t);
      await refreshMe();
    },
    [lang, refreshMe]
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
      lang,
      setLang: setLangPersisted,
      refreshMe,
      signIn,
      register,
      signOut,
    }),
    [loading, token, me, lang, setLangPersisted, refreshMe, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
