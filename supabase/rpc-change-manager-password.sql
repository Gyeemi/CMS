-- Run in Supabase SQL Editor if Manage → Change Password is unavailable.
-- Safe to re-run (create or replace).

create or replace function public.change_manager_password(target_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admin can change passwords';
  end if;

  if char_length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_id and role in ('super_admin', 'admin', 'manager')
  ) then
    raise exception 'User is not a studio manager';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'Auth user not found';
  end if;
end;
$$;
