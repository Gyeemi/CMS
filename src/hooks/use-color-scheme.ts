import { useThemePreference } from '@/context/theme-context';

export function useColorScheme() {
  const { colorScheme, isReady } = useThemePreference();
  return isReady ? colorScheme : 'light';
}
