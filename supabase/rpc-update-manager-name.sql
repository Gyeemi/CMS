-- Run in Supabase SQL Editor if Manage → Edit Name is unavailable.
-- Safe to re-run (create or replace).

create or replace function public.update_manager_name(target_id uuid, new_full_name text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  trimmed_name text := trim(new_full_name);
begin
  if not public.is_super_admin() then
    raise exception 'Only super admin can edit manager names';
  end if;

  if trimmed_name = '' then
    raise exception 'Name cannot be empty';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_id and role in ('super_admin', 'admin', 'manager')
  ) then
    raise exception 'User is not a studio manager';
  end if;

  update public.profiles
  set full_name = trimmed_name
  where id = target_id;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('full_name', trimmed_name)
  where id = target_id;
end;
$$;

grant execute on function public.update_manager_name(uuid, text) to authenticated;
