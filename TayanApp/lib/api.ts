import { API_BASE } from '@/lib/config';
import { type AppLang, t } from '@/lib/i18n';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type ApiOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  lang?: 'ru' | 'en' | 'kg' | string;
  timeoutMs?: number;
};

function normalizeLang(lang?: string) {
  const v = String(lang || '').toLowerCase();
  if (v === 'kg') return 'ky';
  if (v === 'ky') return 'ky';
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('en')) return 'en';
  return v || 'ru';
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = (opts.method || 'GET') as HttpMethod;
  const headers: Record<string, string> = {};

  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  headers['Accept-Language'] = normalizeLang(opts.lang);
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, opts.timeoutMs ?? 20000));

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
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

    return data as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const uiLang: AppLang = opts.lang === 'en' || opts.lang === 'kg' || opts.lang === 'ru' ? opts.lang : 'ru';
      throw new Error(t(uiLang, 'api.timeout'));
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
