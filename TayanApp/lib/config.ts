export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE && process.env.EXPO_PUBLIC_API_BASE.trim()) ||
  'http://127.0.0.1:8000';

export const DEFAULT_LANG: 'ru' | 'en' | 'kg' =
  (process.env.EXPO_PUBLIC_DEFAULT_LANG as any) || 'ru';
