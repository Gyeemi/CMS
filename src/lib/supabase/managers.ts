import { ADMIN_EMAIL } from '@/lib/supabase/auth';
import { getSupabaseErrorMessage } from '@/lib/supabase/errors';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, StaffInviteRole } from '@/types/database';

export type ManagerInviteInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: StaffInviteRole;
};

export async function fetchStudioManagers(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['super_admin', 'admin', 'manager'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function inviteManager(input: ManagerInviteInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const phone = input.phone?.trim() ?? '';

  if (!fullName) throw new Error('Enter the manager full name.');
  if (!email) throw new Error('Enter the manager email.');
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (email === ADMIN_EMAIL.toLowerCase()) {
    throw new Error('admin@groovx.com is reserved for the super admin account.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const superSession = sessionData.session;
  if (!superSession) throw new Error('You must be signed in as super admin.');

  const { error: pendingError } = await supabase.from('pending_managers').insert({
    email,
    full_name: fullName,
    phone,
    role: input.role,
    created_by: superSession.user.id,
  });

  if (pendingError) {
    if (pendingError.message.toLowerCase().includes('duplicate')) {
      throw new Error('This email is already pending or registered.');
    }
    throw pendingError;
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already')) {
      const { error: promoteError } = await supabase.rpc('promote_existing_user_to_staff', {
        p_email: email,
        p_full_name: fullName,
        p_phone: phone,
        p_role: input.role,
      });
      await supabase.from('pending_managers').delete().eq('email', email);

      if (promoteError) {
        throw new Error(
          getSupabaseErrorMessage(
            promoteError,
            'This email already has an account, but it could not be promoted to staff. Run migration 20250606410000_promote_existing_staff.sql in Supabase.',
          ),
        );
      }

      return;
    }

    await supabase.from('pending_managers').delete().eq('email', email);
    throw signUpError;
  }

  await supabase.auth.setSession({
    access_token: superSession.access_token,
    refresh_token: superSession.refresh_token,
  });
}

export async function removeManager(managerId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_manager', { target_id: managerId });
  if (error) throw error;
}

export async function changeManagerPassword(
  targetUserId: string,
  password: string,
): Promise<void> {
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { error } = await supabase.rpc('change_manager_password', {
    target_id: targetUserId,
    new_password: trimmed,
  });

  if (error) throw error;
}

export async function updateManagerName(
  targetUserId: string,
  fullName: string,
): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed) throw new Error('Enter a name.');

  const { error: rpcError } = await supabase.rpc('update_manager_name', {
    target_id: targetUserId,
    new_full_name: trimmed,
  });

  if (!rpcError) return;

  if (rpcError.code !== 'PGRST202') {
    throw new Error(getSupabaseErrorMessage(rpcError, 'Unable to update name.'));
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', targetUserId)
    .in('role', ['super_admin', 'admin', 'manager'])
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error, 'Unable to update name.'));
  }

  if (!data) {
    throw new Error('User is not a studio manager or you do not have permission.');
  }
}
