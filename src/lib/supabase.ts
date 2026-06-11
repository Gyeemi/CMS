import '@/lib/supabase/install-global-resilient-fetch';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { createResilientFetch } from '@/lib/supabase/resilient-fetch';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Expo static web SSR runs with Platform.OS === 'web' but no window. */
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';
const isBrowser = typeof window !== 'undefined';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your .env file.',
  );
}

const noopStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

function createAuthStorage() {
  if (isServerRender) {
    return noopStorage;
  }

  if (Platform.OS === 'web' && isBrowser) {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

const configured = Boolean(supabaseUrl && supabaseAnonKey);

const nativeFetch =
  typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;

const resilientFetch = nativeFetch ? createResilientFetch(nativeFetch) : undefined;

export const supabase = createClient<Database>(
  configured ? supabaseUrl! : 'http://127.0.0.1',
  configured ? supabaseAnonKey! : 'not-configured',
  {
    global: {
      fetch: resilientFetch,
    },
    auth: {
      storage: createAuthStorage(),
      // Started manually after sign-in; avoids background refresh on the login screen.
      autoRefreshToken: false,
      persistSession: configured && !isServerRender,
      detectSessionInUrl: Platform.OS === 'web' && configured && isBrowser,
      // Expo static web SSR must not auto-initialize auth (causes "Failed to fetch" on server).
      skipAutoInitialize: isServerRender,
    },
  },
);

export function isSupabaseConfigured() {
  return configured;
}
