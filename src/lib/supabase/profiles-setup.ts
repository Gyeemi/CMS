import { supabase } from '@/lib/supabase';

/** Creates or updates the signed-in user's profile row (replaces the auth.users trigger). */
export async function ensureUserProfile(): Promise<void> {
  const { error } = await supabase.rpc('ensure_user_profile');
  if (error) throw error;
}
