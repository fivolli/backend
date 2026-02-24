import { api } from '@/lib/api';

export type HospitalItem = {
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  address?: string | null;
  phone?: string | null;
  osm_type?: string | null;
  osm_id?: number | null;
};

type CacheEntry = {
  at: number;
  items: HospitalItem[];
};

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function keyOf(opts: { lat: number; lng: number; radius: number; limit: number }) {
  return `${opts.lat.toFixed(3)},${opts.lng.toFixed(3)}:${opts.radius}:${opts.limit}`;
}

export async function loadNearbyHospitals(opts: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  lang: 'ru' | 'en' | 'kg' | string;
  force?: boolean;
}): Promise<HospitalItem[]> {
  const radius = Math.max(200, Math.min(Number(opts.radius ?? 5000) || 5000, 30000));
  const limit = Math.max(1, Math.min(Number(opts.limit ?? 30) || 30, 100));
  const k = keyOf({ lat: opts.lat, lng: opts.lng, radius, limit });

  const now = Date.now();
  const cached = cache.get(k);
  if (!opts.force && cached && cached.items.length && now - cached.at < TTL_MS) {
    return cached.items;
  }

  try {
    
    const items = await api<HospitalItem[]>(
      `/geo/hospitals?lat=${encodeURIComponent(String(opts.lat))}&lng=${encodeURIComponent(String(opts.lng))}&radius=${encodeURIComponent(String(radius))}&limit=${encodeURIComponent(String(limit))}`,
      { method: 'GET', lang: opts.lang, timeoutMs: 30000 }
    );

    const list = Array.isArray(items) ? items : [];
    cache.set(k, { at: now, items: list });
    return list;
  } catch (e) {
    
    if (cached && Array.isArray(cached.items) && cached.items.length) {
      return cached.items;
    }
    throw e;
  }
}
