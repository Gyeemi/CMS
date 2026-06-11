import { getSupabaseErrorMessage } from '@/lib/supabase/errors';
import {
  getNamePartsFromMetadata,
  joinNameParts,
  type NameParts,
} from '@/lib/name-format';
import { profileToClientAccount } from '@/lib/supabase/mappers';
import { supabase } from '@/lib/supabase';
import type { ClientAccount } from '@/types/client';

export async function fetchRegisteredClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findClientById(id: string): Promise<ClientAccount | undefined> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? profileToClientAccount(data) : undefined;
}

export async function findClientByEmail(email: string): Promise<ClientAccount | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? profileToClientAccount(data) : undefined;
}

export async function getClientUsername(): Promise<string | undefined> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const username = data.user?.user_metadata?.username;
  return typeof username === 'string' && username.trim() ? username.trim() : undefined;
}

export async function getClientNameParts(fullNameFallback: string): Promise<NameParts> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  return getNamePartsFromMetadata(data.user?.user_metadata, fullNameFallback);
}

export async function updateClientProfile(
  id: string,
  updates: NameParts & { username: string; phone: string },
) {
  const fullName = joinNameParts(updates);
  const { data: authData, error: authFetchError } = await supabase.auth.getUser();
  if (authFetchError) {
    throw new Error(getSupabaseErrorMessage(authFetchError, 'Unable to verify your session.'));
  }
  if (authData.user?.id !== id) {
    throw new Error('You can only update your own profile.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: updates.phone.trim(),
    })
    .eq('id', id);

  if (profileError) {
    throw new Error(getSupabaseErrorMessage(profileError, 'Unable to update profile.'));
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      ...authData.user?.user_metadata,
      username: updates.username.trim(),
      full_name: fullName,
      first_name: updates.firstName.trim(),
      middle_name: updates.middleName.trim(),
      last_name: updates.lastName.trim(),
      phone: updates.phone.trim(),
    },
  });

  if (authError) {
    throw new Error(getSupabaseErrorMessage(authError, 'Unable to save user name.'));
  }
}

export async function updateClientAvatarUrl(id: string, avatarUrl: string) {
  const { data: authData, error: authFetchError } = await supabase.auth.getUser();
  if (authFetchError) {
    throw new Error(getSupabaseErrorMessage(authFetchError, 'Unable to verify your session.'));
  }
  if (authData.user?.id !== id) {
    throw new Error('You can only update your own profile.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', id);

  if (profileError) {
    throw new Error(getSupabaseErrorMessage(profileError, 'Unable to save profile picture.'));
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      ...authData.user?.user_metadata,
      avatar_url: avatarUrl,
    },
  });

  if (authError) {
    throw new Error(getSupabaseErrorMessage(authError, 'Unable to save profile picture.'));
  }
}
