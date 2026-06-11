-- FIX for "Database error saving new user"
-- Removes the broken auth trigger and creates profiles via app RPC instead.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'client'));

drop trigger if exists on_auth_user_created on auth.users;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager', 'super_admin')
  );
$$;

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_role text := 'client';
  v_full_name text;
  v_phone text;
begin
  if v_uid is null then
    return;
  end if;

  select u.email, u.raw_user_meta_data
  into v_email, v_meta
  from auth.users u
  where u.id = v_uid;

  if v_email is null then
    return;
  end if;

  if lower(v_email) = 'admin@groovx.com' then
    v_role := 'super_admin';
  elsif to_regclass('public.pending_managers') is not null then
  begin
    if exists (
      select 1 from public.pending_managers pm
      where lower(pm.email) = lower(v_email)
    ) then
      begin
        v_role := coalesce(
          (
            select pm.role::text
            from public.pending_managers pm
            where lower(pm.email) = lower(v_email)
            limit 1
          ),
          'manager'
        );
      exception
        when undefined_column then
          v_role := 'admin';
      end;
      delete from public.pending_managers where lower(email) = lower(v_email);
    end if;
  exception when undefined_table then
    null;
  end;
  end if;

  v_full_name := coalesce(
    nullif(trim(v_meta->>'full_name'), ''),
    nullif(trim(concat_ws(
      ' ',
      nullif(trim(v_meta->>'first_name'), ''),
      nullif(trim(v_meta->>'middle_name'), ''),
      nullif(trim(v_meta->>'last_name'), '')
    )), ''),
    ''
  );
  v_phone := coalesce(v_meta->>'phone', '');

  insert into public.profiles (id, email, full_name, phone, role)
  values (v_uid, v_email, v_full_name, v_phone, v_role)
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
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;

select case
  when exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_auth_user_created'
      and n.nspname = 'auth'
      and c.relname = 'users'
  ) then 'ERROR: auth trigger still exists'
  else 'OK: auth trigger removed — signup should work'
end as signup_status;
