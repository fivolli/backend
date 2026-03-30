import { useAppTheme } from '@/providers/theme-provider';

export function useColorScheme() {
  return useAppTheme().colorScheme;
}
