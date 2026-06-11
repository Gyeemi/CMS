-- RUN THIS if client signup still shows "Database error saving new user".
-- Minimal, safe signup trigger — no walk-in linking here (app does that after login).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'client'));

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'client';
  profile_full_name text;
  profile_phone text;
begin
  if lower(coalesce(new.email, '')) = 'admin@groovx.com' then
    assigned_role := 'super_admin';
  elsif to_regclass('public.pending_managers') is not null then
  begin
    if exists (
      select 1 from public.pending_managers pm
      where lower(pm.email) = lower(new.email)
    ) then
      assigned_role := coalesce(
        (
          select pm.role::text
          from public.pending_managers pm
          where lower(pm.email) = lower(new.email)
          limit 1
        ),
        'manager'
      );
      delete from public.pending_managers where lower(email) = lower(new.email);
    end if;
  exception
    when undefined_column then
      assigned_role := 'admin';
      delete from public.pending_managers where lower(email) = lower(new.email);
    when undefined_table then
      null;
  end;
  end if;

  profile_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(concat_ws(
      ' ',
      nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'middle_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'last_name'), '')
    )), ''),
    ''
  );
  profile_phone := coalesce(new.raw_user_meta_data->>'phone', '');

  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email, profile_full_name, profile_phone, assigned_role)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = case
      when public.profiles.role = 'super_admin' then 'super_admin'
      else excluded.role
    end;

  return new;
exception
  when others then
    raise exception 'handle_new_user failed: %', SQLERRM;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verify: should show "OK: no walk-in link in trigger"
select case
  when pg_get_functiondef('public.handle_new_user()'::regprocedure) ilike '%link_walk_in%'
    then 'ERROR: trigger still links walk-ins — contact support'
  else 'OK: signup trigger is minimal'
end as signup_trigger_check;
