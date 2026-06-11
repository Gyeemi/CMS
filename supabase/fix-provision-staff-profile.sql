-- Run in Supabase SQL Editor if staff invite fails after signUp.
-- Same as migration 20250606420000_provision_staff_profile.sql

create or replace function public.provision_staff_profile(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_meta jsonb;
  v_pending record;
  v_role text := 'manager';
  v_full_name text := '';
  v_phone text := '';
begin
  if not public.is_super_admin() then
    raise exception 'Only super admin can provision staff';
  end if;

  select u.id, u.raw_user_meta_data
  into v_uid, v_meta
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if v_uid is null then
    raise exception 'Auth user not found for this email';
  end if;

  begin
    select pm.full_name, pm.phone, pm.role
    into v_pending
    from public.pending_managers pm
    where lower(pm.email) = lower(trim(p_email));
  exception
    when undefined_column then
      select pm.full_name, pm.phone
      into v_pending
      from public.pending_managers pm
      where lower(pm.email) = lower(trim(p_email));
      v_role := 'manager';
  end;

  if found then
    v_role := coalesce(v_pending.role, 'manager');
    v_full_name := coalesce(v_pending.full_name, '');
    v_phone := coalesce(v_pending.phone, '');
  elsif exists (
    select 1
    from public.profiles p
    where p.id = v_uid and p.role in ('admin', 'manager')
  ) then
    return;
  else
    raise exception 'No pending staff invite for this email';
  end if;

  if v_role not in ('admin', 'manager') then
    raise exception 'Invalid staff role';
  end if;

  v_full_name := coalesce(
    nullif(trim(v_full_name), ''),
    nullif(trim(v_meta->>'full_name'), ''),
    ''
  );
  v_phone := coalesce(
    nullif(trim(v_phone), ''),
    nullif(trim(v_meta->>'phone'), ''),
    ''
  );

  insert into public.profiles (id, email, full_name, phone, role)
  values (v_uid, lower(trim(p_email)), v_full_name, v_phone, v_role)
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    phone = case
      when excluded.phone <> '' then excluded.phone
      else public.profiles.phone
    end,
    role = case
      when public.profiles.role = 'super_admin' then 'super_admin'
      when excluded.role in ('admin', 'manager') then excluded.role
      else public.profiles.role
    end;

  delete from public.pending_managers
  where lower(email) = lower(trim(p_email));
end;
$$;

grant execute on function public.provision_staff_profile(text) to authenticated;
