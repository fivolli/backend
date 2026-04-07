import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'tayan.token';
const LAST_REQUEST_ID_KEY = 'tayan.lastRequestId';
const REVIEW_LATER_PREFIX = 'tayan.reviewLater.';
const LANG_KEY = 'tayan.lang';
const NOTIFICATIONS_KEY = 'tayan.notifications';
const AI_PENDING_JOB_KEY = 'tayan.aiPendingJobId';
const THEME_KEY = 'tayan.theme';
const ONBOARDING_SEEN_KEY = 'tayan.onboardingSeen';

export type AppLang = 'ru' | 'en' | 'kg';
export type ThemePreference = 'system' | 'light' | 'dark';

export type NotificationPrefs = {
  sos: boolean;
  volunteers: boolean;
  updates: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  sos: true,
  volunteers: true,
  updates: true,
};

function webGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
  }
}

function webDelete(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const t = webGet(TOKEN_KEY);
    if (t) return t;
  }
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return t || null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    webSet(TOKEN_KEY, token);
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
  }
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webDelete(TOKEN_KEY);
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
  }
}

export async function getLastRequestId(): Promise<number | null> {
  if (Platform.OS === 'web') {
    const raw = webGet(LAST_REQUEST_ID_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  try {
    const v = await SecureStore.getItemAsync(LAST_REQUEST_ID_KEY);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function setLastRequestId(id: number): Promise<void> {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return;
  const value = String(Math.floor(n));
  if (Platform.OS === 'web') {
    webSet(LAST_REQUEST_ID_KEY, value);
  }
  try {
    await SecureStore.setItemAsync(LAST_REQUEST_ID_KEY, value);
  } catch {
  }
}

export async function clearLastRequestId(): Promise<void> {
  if (Platform.OS === 'web') {
    webDelete(LAST_REQUEST_ID_KEY);
  }
  try {
    await SecureStore.deleteItemAsync(LAST_REQUEST_ID_KEY);
  } catch {

  }
}

export async function getReviewLater(requestId: number): Promise<boolean> {
  const id = Math.floor(Number(requestId));
  if (!Number.isFinite(id) || id <= 0) return false;
  if (Platform.OS === 'web') {
    const v = webGet(REVIEW_LATER_PREFIX + String(id));
    if (v === '1' || v === 'true') return true;
  }
  try {
    const v = await SecureStore.getItemAsync(REVIEW_LATER_PREFIX + String(id));
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export async function setReviewLater(requestId: number, value: boolean = true): Promise<void> {
  const id = Math.floor(Number(requestId));
  if (!Number.isFinite(id) || id <= 0) return;
  if (Platform.OS === 'web') {
    webSet(REVIEW_LATER_PREFIX + String(id), value ? '1' : '0');
  }
  try {
    await SecureStore.setItemAsync(REVIEW_LATER_PREFIX + String(id), value ? '1' : '0');
  } catch {

  }
}

export async function clearReviewLater(requestId: number): Promise<void> {
  const id = Math.floor(Number(requestId));
  if (!Number.isFinite(id) || id <= 0) return;
  if (Platform.OS === 'web') {
    webDelete(REVIEW_LATER_PREFIX + String(id));
  }
  try {
    await SecureStore.deleteItemAsync(REVIEW_LATER_PREFIX + String(id));
  } catch {

  }
}

export async function getAppLang(): Promise<AppLang | null> {
  if (Platform.OS === 'web') {
    const v = webGet(LANG_KEY);
    if (v === 'ru' || v === 'en' || v === 'kg') return v;
  }
  try {
    const v = await SecureStore.getItemAsync(LANG_KEY);
    if (v === 'ru' || v === 'en' || v === 'kg') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setAppLang(lang: AppLang): Promise<void> {
  if (Platform.OS === 'web') {
    webSet(LANG_KEY, lang);
  }
  try {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {

  }
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  if (Platform.OS === 'web') {
    try {
      const raw = webGet(NOTIFICATIONS_KEY);
      if (!raw) return DEFAULT_NOTIFICATIONS;
      const parsed = JSON.parse(raw);
      return {
        sos: typeof parsed?.sos === 'boolean' ? parsed.sos : DEFAULT_NOTIFICATIONS.sos,
        volunteers: typeof parsed?.volunteers === 'boolean' ? parsed.volunteers : DEFAULT_NOTIFICATIONS.volunteers,
        updates: typeof parsed?.updates === 'boolean' ? parsed.updates : DEFAULT_NOTIFICATIONS.updates,
      };
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }
  try {
    const raw = await SecureStore.getItemAsync(NOTIFICATIONS_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw);
    const out: NotificationPrefs = {
      sos: typeof parsed?.sos === 'boolean' ? parsed.sos : DEFAULT_NOTIFICATIONS.sos,
      volunteers: typeof parsed?.volunteers === 'boolean' ? parsed.volunteers : DEFAULT_NOTIFICATIONS.volunteers,
      updates: typeof parsed?.updates === 'boolean' ? parsed.updates : DEFAULT_NOTIFICATIONS.updates,
    };
    return out;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  if (Platform.OS === 'web') {
    webSet(NOTIFICATIONS_KEY, JSON.stringify(prefs));
  }
  try {
    await SecureStore.setItemAsync(NOTIFICATIONS_KEY, JSON.stringify(prefs));
  } catch {

  }
}

export async function getAiPendingJobId(): Promise<number | null> {
  if (Platform.OS === 'web') {
    const raw = webGet(AI_PENDING_JOB_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  try {
    const v = await SecureStore.getItemAsync(AI_PENDING_JOB_KEY);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export async function setAiPendingJobId(jobId: number): Promise<void> {
  const n = Number(jobId);
  if (!Number.isFinite(n) || n <= 0) return;
  const value = String(Math.floor(n));
  if (Platform.OS === 'web') {
    webSet(AI_PENDING_JOB_KEY, value);
  }
  try {
    await SecureStore.setItemAsync(AI_PENDING_JOB_KEY, value);
  } catch {

  }
}

export async function clearAiPendingJobId(): Promise<void> {
  if (Platform.OS === 'web') {
    webDelete(AI_PENDING_JOB_KEY);
  }
  try {
    await SecureStore.deleteItemAsync(AI_PENDING_JOB_KEY);
  } catch {

  }
}

export async function getThemePreference(): Promise<ThemePreference | null> {
  if (Platform.OS === 'web') {
    const v = webGet(THEME_KEY);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
  }
  try {
    const v = await SecureStore.getItemAsync(THEME_KEY);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setThemePreference(theme: ThemePreference): Promise<void> {
  if (Platform.OS === 'web') {
    webSet(THEME_KEY, theme);
  }
  try {
    await SecureStore.setItemAsync(THEME_KEY, theme);
  } catch {

  }
}

export async function getOnboardingSeen(): Promise<boolean> {
  if (Platform.OS === 'web') {
    const raw = webGet(ONBOARDING_SEEN_KEY);
    if (raw === '1' || raw === 'true') return true;
  }
  try {
    const raw = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingSeen(value: boolean = true): Promise<void> {
  const raw = value ? '1' : '0';
  if (Platform.OS === 'web') {
    webSet(ONBOARDING_SEEN_KEY, raw);
  }
  try {
    await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, raw);
  } catch {
  }
}
