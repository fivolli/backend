import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tayan.token';
const LAST_REQUEST_ID_KEY = 'tayan.lastRequestId';
const REVIEW_LATER_PREFIX = 'tayan.reviewLater.';
const LANG_KEY = 'tayan.lang';
const NOTIFICATIONS_KEY = 'tayan.notifications';
const AI_PENDING_JOB_KEY = 'tayan.aiPendingJobId';

export type AppLang = 'ru' | 'en' | 'kg';

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

export async function getToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return t || null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function getLastRequestId(): Promise<number | null> {
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
  await SecureStore.setItemAsync(LAST_REQUEST_ID_KEY, String(Math.floor(n)));
}

export async function clearLastRequestId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LAST_REQUEST_ID_KEY);
  } catch {
    // ignore
  }
}

export async function getReviewLater(requestId: number): Promise<boolean> {
  const id = Math.floor(Number(requestId));
  if (!Number.isFinite(id) || id <= 0) return false;
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
  try {
    await SecureStore.setItemAsync(REVIEW_LATER_PREFIX + String(id), value ? '1' : '0');
  } catch {
    // ignore
  }
}

export async function clearReviewLater(requestId: number): Promise<void> {
  const id = Math.floor(Number(requestId));
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    await SecureStore.deleteItemAsync(REVIEW_LATER_PREFIX + String(id));
  } catch {
    // ignore
  }
}

export async function getAppLang(): Promise<AppLang | null> {
  try {
    const v = await SecureStore.getItemAsync(LANG_KEY);
    if (v === 'ru' || v === 'en' || v === 'kg') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setAppLang(lang: AppLang): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
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
  try {
    await SecureStore.setItemAsync(NOTIFICATIONS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export async function getAiPendingJobId(): Promise<number | null> {
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
  try {
    await SecureStore.setItemAsync(AI_PENDING_JOB_KEY, String(Math.floor(n)));
  } catch {
    // ignore
  }
}

export async function clearAiPendingJobId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AI_PENDING_JOB_KEY);
  } catch {
    // ignore
  }
}
