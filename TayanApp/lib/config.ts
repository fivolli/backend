export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE && process.env.EXPO_PUBLIC_API_BASE.trim()) ||
  'https://backend-ae6h.onrender.com/';

export const DEFAULT_LANG: 'ru' | 'en' | 'kg' =
  (process.env.EXPO_PUBLIC_DEFAULT_LANG as any) || 'ru';
