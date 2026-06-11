-- Staff roles: admin and manager (both studio access; assigned at invite time)

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'client'));

alter table public.pending_managers
  add column if not exists role text not null default 'manager';

alter table public.pending_managers drop constraint if exists pending_managers_role_check;
alter table public.pending_managers
  add constraint pending_managers_role_check
  check (role in ('admin', 'manager'));

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

create or replace function public.remove_manager(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admin can remove managers';
  end if;

  if exists (
    select 1 from public.profiles
    where id = target_id and role = 'super_admin'
  ) then
    raise exception 'Cannot remove super admin';
  end if;

  update public.profiles
  set role = 'client'
  where id = target_id and role in ('admin', 'manager');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
  pending_role text;
begin
  assigned_role := case
    when lower(new.email) = 'admin@groovx.com' then 'super_admin'
    when exists (
      select 1 from public.pending_managers pm
      where lower(pm.email) = lower(new.email)
    ) then coalesce(
      (
        select pm.role
        from public.pending_managers pm
        where lower(pm.email) = lower(new.email)
      ),
      'manager'
    )
    else 'client'
  end;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    assigned_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = case
      when public.profiles.role = 'super_admin' then 'super_admin'
      else excluded.role
    end;

  delete from public.pending_managers
  where lower(email) = lower(new.email);

  return new;
end;
$$;
