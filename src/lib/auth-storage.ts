import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@groovx/session';

export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = 'groovx';

export const DEMO_CLIENT_EMAIL = 'client@groovx.com';
export const DEMO_CLIENT_PASSWORD = 'groovx';
export const DEMO_CLIENT_ID = 'demo-client';

import { getHomeRouteForRole } from '@/lib/roles';
import type { UserRole } from '@/types/database';

export type { UserRole };

export type AuthSession = {
  username: string;
  role: UserRole;
  clientId?: string;
  displayName?: string;
  avatarUrl?: string;
};

export { getHomeRouteForRole };

export function isValidAdminCredentials(username: string, password: string) {
  return username.trim() === DEMO_USERNAME && password.trim() === DEMO_PASSWORD;
}

export function isValidDemoClientCredentials(username: string, password: string) {
  return (
    username.trim().toLowerCase() === DEMO_CLIENT_EMAIL &&
    password.trim() === DEMO_CLIENT_PASSWORD
  );
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.role) {
      return { ...session, role: 'super_admin' };
    }
    return session;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
