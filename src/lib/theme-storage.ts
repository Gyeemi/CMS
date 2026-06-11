import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@groovx/theme';

export type ThemePreference = 'light' | 'dark';

export async function loadThemePreference(): Promise<ThemePreference | null> {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') return value;
    return null;
  } catch {
    return null;
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, preference);
}
