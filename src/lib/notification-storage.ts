import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_READ_KEY = '@groovx/notifications/adminRead';
const CLIENT_READ_KEY = '@groovx/notifications/clientRead';

export type NotificationScope = 'admin' | 'client';

export async function loadReadNotificationKeys(scope: NotificationScope): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(scope === 'admin' ? ADMIN_READ_KEY : CLIENT_READ_KEY);
    if (!raw) return new Set();
    const keys = JSON.parse(raw) as string[];
    return new Set(keys);
  } catch {
    return new Set();
  }
}

export async function markNotificationKeysRead(
  scope: NotificationScope,
  keys: string[],
): Promise<Set<string>> {
  if (keys.length === 0) return loadReadNotificationKeys(scope);

  const existing = await loadReadNotificationKeys(scope);
  keys.forEach((key) => existing.add(key));
  await AsyncStorage.setItem(
    scope === 'admin' ? ADMIN_READ_KEY : CLIENT_READ_KEY,
    JSON.stringify([...existing]),
  );
  return existing;
}
