import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme as useSystemColorScheme, type ColorSchemeName } from 'react-native';

import { Colors } from '@/constants/theme';
import { loadThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme-storage';

type ThemeContextValue = {
  colorScheme: ThemePreference;
  isDark: boolean;
  isReady: boolean;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(preference: ThemePreference | null, system: ColorSchemeName): ThemePreference {
  if (preference) return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ThemePreference>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadThemePreference().then((saved) => {
      setColorSchemeState(resolveScheme(saved, systemScheme));
      setIsReady(true);
    });
  }, [systemScheme]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = colorScheme;
    document.body.style.backgroundColor =
      colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;
  }, [colorScheme]);

  const setColorScheme = useCallback((scheme: ThemePreference) => {
    setColorSchemeState(scheme);
    void saveThemePreference(scheme);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      void saveThemePreference(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      colorScheme,
      isDark: colorScheme === 'dark',
      isReady,
      toggleColorScheme,
      setColorScheme,
    }),
    [colorScheme, isReady, toggleColorScheme, setColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
