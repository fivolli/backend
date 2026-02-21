import { api } from '@/lib/api';
import { type AppLang, t } from '@/lib/i18n';

export type VideoItem = {
  id: number;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
};

export type NormalizedVideoItem = {
  id: number;
  title: string;
  video_url: string;
  thumbnail_url: string;
  youtube_id: string | null;
};

export function getYouTubeId(inputUrl?: string | null): string | null {
  if (!inputUrl) return null;
  try {
    const url = new URL(String(inputUrl));
    const host = (url.hostname || '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').trim();
      return id || null;
    }

    if (host.endsWith('youtube.com')) {
      const v = url.searchParams?.get('v');
      if (v) return v;
      const m = url.pathname.match(/\/(embed|shorts)\/([^/?#]+)/i);
      if (m && m[2]) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeVideoItem(v: any, lang: AppLang): NormalizedVideoItem | null {
  const id = Number(v && v.id) || 0;
  if (!id) return null;
  const title = v?.title ? String(v.title) : t(lang, 'video.item_fallback');
  const video_url = v?.video_url ? String(v.video_url) : '';
  const youtube_id = getYouTubeId(video_url);
  const thumbnail_from_api = v?.thumbnail_url ? String(v.thumbnail_url) : '';
  const thumbnail_url = thumbnail_from_api || (youtube_id ? `https://i.ytimg.com/vi/${youtube_id}/hqdefault.jpg` : '');

  return { id, title, video_url, thumbnail_url, youtube_id };
}

let cached: NormalizedVideoItem[] | null = null;
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export async function loadVideos(opts: { lang: 'ru' | 'en' | 'kg' | string; force?: boolean }): Promise<NormalizedVideoItem[]> {
  const lang: AppLang = opts.lang === 'en' || opts.lang === 'kg' || opts.lang === 'ru' ? opts.lang : 'ru';
  const now = Date.now();
  if (!opts.force && cached && cached.length && cachedAt && now - cachedAt < TTL_MS) {
    return cached;
  }

  const data = await api<VideoItem[]>('/videos', { method: 'GET', lang: opts.lang, timeoutMs: 8000 });
  const list = Array.isArray(data) ? data : [];

  cached = list.map((x) => normalizeVideoItem(x, lang)).filter(Boolean) as NormalizedVideoItem[];
  cachedAt = now;
  return cached;
}
