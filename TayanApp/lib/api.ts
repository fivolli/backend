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

const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_MAX_RETRIES = 1;
const AUTH_TIMEOUT_MS = 90000;
const AI_TIMEOUT_MS = 90000;

function normalizeLang(lang?: string) {
  const v = String(lang || '').toLowerCase();
  if (v === 'kg') return 'ky';
  if (v === 'ky') return 'ky';
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('en')) return 'en';
  return v || 'ru';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = (opts.method || 'GET') as HttpMethod;
  const normalizedBase = String(API_BASE || '').replace(/\/+$/, '');
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path)}`;
  const url = `${normalizedBase}${normalizedPath}`;
  const headers: Record<string, string> = {};

  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  headers['Accept-Language'] = normalizeLang(opts.lang);
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const autoTimeoutMs = normalizedPath.startsWith('/auth/')
    ? AUTH_TIMEOUT_MS
    : normalizedPath.startsWith('/ai/')
      ? AI_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.max(1000, opts.timeoutMs ?? autoTimeoutMs);
  const autoRetries = normalizedPath.startsWith('/auth/') || normalizedPath.startsWith('/ai/')
    ? 2
    : DEFAULT_MAX_RETRIES;
  const maxAttempts = Math.max(1, autoRetries + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      const isTimeout = e?.name === 'AbortError';
      const isNetworkError = e instanceof TypeError || String(e?.message || '').toLowerCase().includes('network request failed');
      const shouldRetry = attempt < maxAttempts && (isTimeout || isNetworkError);

      if (shouldRetry) {
        await sleep(1200 * attempt);
        continue;
      }

      if (isTimeout) {
        const uiLang: AppLang = opts.lang === 'en' || opts.lang === 'kg' || opts.lang === 'ru' ? opts.lang : 'ru';
        throw new Error(t(uiLang, 'api.timeout'));
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Request failed');
}
