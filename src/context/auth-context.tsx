import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
    getHomeRouteForRole,
    type AuthSession,
    type UserRole,
} from '@/lib/auth-storage';
import { joinNameParts } from '@/lib/name-format';
import { navigateToLanding } from '@/lib/navigation';
import { getPhoneValidationError } from '@/lib/phone-format';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
    clearExpiredLocalSession,
    fetchProfile,
    getSessionFromSupabase,
    mapAuthSignInError,
    normalizeLoginEmail,
    profileToSession,
} from '@/lib/supabase/auth';
import { ensureUserProfile } from '@/lib/supabase/profiles-setup';
import { linkWalkInProjectsToClient } from '@/lib/supabase/walk-in-clients';
import type { ClientSignupData } from '@/types/client';

async function tryEnsureUserProfile() {
  try {
    await ensureUserProfile();
  } catch {
    // RPC missing until fix-signup-v3-drop-trigger.sql is applied.
  }
}

async function tryLinkWalkInProjects(clientId: string) {
  try {
    await linkWalkInProjectsToClient(clientId);
  } catch {
    // Linking is best-effort (e.g. migration not applied yet).
  }
}

type AuthContextValue = {
  user: AuthSession | null;
  isLoading: boolean;
  pendingLoginLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; role?: UserRole }>;
  signup: (data: ClientSignupData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  signOutToLanding: () => Promise<void>;
  isSigningOut: boolean;
  finishSigningOut: () => void;
  finishLoginLoading: () => void;
  getHomeRoute: () => string;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pendingLoginLoading, setPendingLoginLoading] = useState(false);
  const isSigningOutRef = useRef(false);
  const suppressSessionRefreshRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isSigningOutRef.current = isSigningOut;
  }, [isSigningOut]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetUser = useCallback((session: AuthSession | null) => {
    if (isMountedRef.current && !suppressSessionRefreshRef.current) {
      setUser(session);
    }
  }, []);

  const safeSetIsLoading = useCallback((loading: boolean) => {
    if (isMountedRef.current) {
      setIsLoading(loading);
    }
  }, []);

  const syncAutoRefresh = useCallback(async (active: boolean) => {
    if (!isSupabaseConfigured()) return;

    try {
      if (active) {
        await supabase.auth.startAutoRefresh();
      } else {
        await supabase.auth.stopAutoRefresh();
      }
    } catch {
      // Ignore auto-refresh control errors.
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (isSigningOutRef.current || suppressSessionRefreshRef.current) return;

    if (!isSupabaseConfigured()) {
      safeSetUser(null);
      await syncAutoRefresh(false);
      return;
    }

    try {
      const session = await getSessionFromSupabase();
      if (!isSigningOutRef.current && !suppressSessionRefreshRef.current) {
        if (session?.clientId) {
          void tryLinkWalkInProjects(session.clientId);
        }
        safeSetUser(session);
        await syncAutoRefresh(session !== null);
      }
    } catch {
      if (!isSigningOutRef.current && !suppressSessionRefreshRef.current) {
        safeSetUser(null);
        await syncAutoRefresh(false);
      }
    }
  }, [safeSetUser, syncAutoRefresh]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      safeSetIsLoading(false);
      return;
    }

    void clearExpiredLocalSession()
      .then(() => refreshSession())
      .finally(() => safeSetIsLoading(false));

    if (!isSupabaseConfigured()) return;

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (isSigningOutRef.current || suppressSessionRefreshRef.current) {
        return;
      }
      if (event === 'SIGNED_OUT') {
        safeSetUser(null);
        void syncAutoRefresh(false);
        return;
      }
      void refreshSession();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [refreshSession, safeSetIsLoading, safeSetUser, syncAutoRefresh]);

  useEffect(() => {
    if (!isSupabaseConfigured() || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: 'Supabase is not configured. Add your .env keys and restart the app.' };
    }

    const email = normalizeLoginEmail(username);
    const trimmedPassword = password.trim();
    if (!email || !trimmedPassword) {
      return { ok: false, error: 'Enter your email and password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: trimmedPassword,
    });

    if (error) {
      return { ok: false, error: mapAuthSignInError(error) };
    }

    if (!data.user) {
      return { ok: false, error: 'Unable to sign in. Please try again.' };
    }

    await tryEnsureUserProfile();

    let profile = await fetchProfile(data.user.id);
    if (!profile) {
      return {
        ok: false,
        error:
          'Profile not found. Run supabase/fix-signup-v3-drop-trigger.sql in Supabase SQL Editor, then sign in again.',
      };
    }

    const session = profileToSession(profile, data.user);
    if (session.clientId) {
      await tryLinkWalkInProjects(session.clientId);
    }
    setUser(session);
    setPendingLoginLoading(true);
    void syncAutoRefresh(true);
    return { ok: true, role: session.role };
  }, [syncAutoRefresh]);

  const signup = useCallback(async (data: ClientSignupData) => {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: 'Supabase is not configured. Add your .env keys and restart the app.' };
    }

    const firstName = data.firstName.trim();
    const middleName = data.middleName.trim();
    const lastName = data.lastName.trim();
    const fullName = joinNameParts({ firstName, middleName, lastName });
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();

    if (!firstName) return { ok: false, error: 'Enter your first name.' };
    if (!lastName) return { ok: false, error: 'Enter your last name.' };
    if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
    const phoneError = getPhoneValidationError(phone);
    if (phoneError) return { ok: false, error: phoneError };
    if (data.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          phone,
          username: firstName,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        return { ok: false, error: 'An account with this email already exists. Please sign in.' };
      }

      const authError = error as { message?: string; details?: string; code?: string };
      const detail = authError.details?.trim();
      const message = authError.message?.trim() ?? 'Sign up failed.';

      if (__DEV__) {
        console.error('Signup failed:', authError);
      }

      if (message.toLowerCase().includes('database error saving new user')) {
        return {
          ok: false,
          error: detail
            ? `Account setup failed: ${detail}`
            : 'Account setup failed in the database. In Supabase SQL Editor, run supabase/fix-signup-v3-drop-trigger.sql, then try signup again.',
        };
      }

      if (message.includes('handle_new_user failed:')) {
        return { ok: false, error: message };
      }

      return { ok: false, error: message };
    }

    if (!authData.user) {
      return { ok: false, error: 'Unable to create account. Please try again.' };
    }

    if (authData.session) {
      await tryEnsureUserProfile();
      await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', authData.user.id);
    }

    let profile = authData.session ? await fetchProfile(authData.user.id) : null;
    if (profile) {
      const session = profileToSession(profile, authData.user);
      if (session.clientId) {
        await tryLinkWalkInProjects(session.clientId);
      }
      setUser(session);
    } else if (!authData.session) {
      return {
        ok: true,
        error: 'Account created. Confirm your email, then sign in to see your projects.',
      };
    }

    return { ok: true };
  }, []);

  const finishSigningOut = useCallback(() => {
    isSigningOutRef.current = false;
    setIsSigningOut(false);
  }, []);

  const clearSupabaseSession = useCallback(async () => {
    try {
      await supabase.auth.stopAutoRefresh();
    } catch {
      // Ignore if auto-refresh was never started.
    }

    // Local sign-out avoids network calls during navigation teardown.
    await supabase.auth.signOut({ scope: 'local' });

    try {
      await supabase.removeAllChannels();
    } catch {
      // Realtime teardown can fail on mobile; continue signing out.
    }
  }, []);

  const finishLoginLoading = useCallback(() => {
    setPendingLoginLoading(false);
  }, []);

  const logout = useCallback(async () => {
    suppressSessionRefreshRef.current = true;
    isSigningOutRef.current = true;
    try {
      await clearSupabaseSession();
    } finally {
      setPendingLoginLoading(false);
      setUser(null);
      setTimeout(() => {
        suppressSessionRefreshRef.current = false;
        isSigningOutRef.current = false;
      }, 1500);
    }
  }, [clearSupabaseSession]);

  const signOutToLanding = useCallback(async () => {
    if (isSigningOutRef.current) return;

    suppressSessionRefreshRef.current = true;
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setPendingLoginLoading(false);

    try {
      await clearSupabaseSession();
      setUser(null);
      navigateToLanding();
    } catch {
      setUser(null);
      await supabase.auth.signOut({ scope: 'local' });
      navigateToLanding();
    } finally {
      setTimeout(() => {
        suppressSessionRefreshRef.current = false;
        isSigningOutRef.current = false;
        if (isMountedRef.current) {
          setIsSigningOut(false);
        }
      }, 1500);
    }
  }, [clearSupabaseSession]);

  const getHomeRoute = useCallback(() => {
    return user ? getHomeRouteForRole(user.role) : '/';
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      pendingLoginLoading,
      login,
      signup,
      logout,
      signOutToLanding,
      isSigningOut,
      finishSigningOut,
      finishLoginLoading,
      getHomeRoute,
      refreshUser: refreshSession,
    }),
    [
      user,
      isLoading,
      pendingLoginLoading,
      login,
      signup,
      logout,
      signOutToLanding,
      isSigningOut,
      finishSigningOut,
      finishLoginLoading,
      getHomeRoute,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
