import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/storage';

type ThemeContextValue = {
  themePreference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setThemePreference: (next: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themePreferenceState, setThemePreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await getThemePreference();
      if (!alive) return;
      if (saved) setThemePreferenceState(saved);
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    themePreferenceState === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themePreferenceState;

  const updateThemePreference = async (next: ThemePreference) => {
    setThemePreferenceState(next);
    await setThemePreference(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference: themePreferenceState,
      colorScheme: resolvedScheme,
      setThemePreference: updateThemePreference,
    }),
    [themePreferenceState, resolvedScheme]
  );

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
