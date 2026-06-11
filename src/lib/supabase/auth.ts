import { ensureUserProfile } from '@/lib/supabase/profiles-setup';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, UserRole } from '@/types/database';
import type { AuthSession } from '@/lib/auth-storage';

export const ADMIN_EMAIL = 'admin@groovx.com';

export function normalizeLoginEmail(username: string) {
  const trimmed = username.trim();
  if (trimmed.toLowerCase() === 'admin') return ADMIN_EMAIL;
  return trimmed.toLowerCase();
}

export function mapAuthSignInError(error: { message?: string; code?: string }) {
  const code = error.code ?? '';
  const message = error.message ?? '';

  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
    return 'Email not confirmed. In Supabase Dashboard go to Authentication → Users, open admin@groovx.com, and confirm the email. Or run supabase/seed-admin.sql in the SQL Editor.';
  }

  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Create admin@groovx.com in Supabase Auth, or run: npm run create-admin';
  }

  return message || 'Sign in failed. Please try again.';
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function getMetadataUsername(authUser?: { user_metadata?: Record<string, unknown> } | null) {
  const value = authUser?.user_metadata?.username;
  return typeof value === 'string' ? value.trim() : '';
}

function getMetadataFullName(authUser?: { user_metadata?: Record<string, unknown> } | null) {
  const value = authUser?.user_metadata?.full_name;
  return typeof value === 'string' ? value.trim() : '';
}

export function profileToSession(
  profile: ProfileRow,
  authUser?: { user_metadata?: Record<string, unknown> } | null,
): AuthSession {
  const metadataUsername = getMetadataUsername(authUser);
  const metadataFullName = getMetadataFullName(authUser);

  return {
    username: profile.email,
    role: profile.role as UserRole,
    clientId: profile.role === 'client' ? profile.id : undefined,
    displayName:
      profile.full_name?.trim() || metadataFullName || metadataUsername || profile.email,
    avatarUrl: profile.avatar_url ?? undefined,
  };
}

export async function verifyCurrentUserPassword(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = password.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter your password.' };
  }

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { ok: false, error: userError.message };
  }

  const email = authData.user?.email;
  if (!email) {
    return { ok: false, error: 'No active session. Sign in again.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: trimmed,
  });

  if (error) {
    if (error.code === 'invalid_credentials' || error.message.includes('Invalid login credentials')) {
      return { ok: false, error: 'Incorrect password.' };
    }
    return { ok: false, error: mapAuthSignInError(error) };
  }

  return { ok: true };
}

export async function clearExpiredLocalSession() {
  try {
    const { data } = await supabase.auth.getSession();
    const expiresAt = data.session?.expires_at;
    if (expiresAt && expiresAt * 1000 <= Date.now()) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

export async function getSessionFromSupabase(): Promise<AuthSession | null> {
  try {
    const { data: authData, error } = await supabase.auth.getSession();
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
      return null;
    }

    const user = authData.session?.user;
    if (!user) return null;

    try {
      try {
        await ensureUserProfile();
      } catch {
        // Profile RPC may be missing until fix-signup-v3 SQL is applied.
      }

      const profile = await fetchProfile(user.id);
      if (!profile) return null;
      return profileToSession(profile, user);
    } catch {
      return null;
    }
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
}
