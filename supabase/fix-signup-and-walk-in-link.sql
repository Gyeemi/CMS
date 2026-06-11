-- Paste and run this entire file in Supabase Dashboard → SQL Editor.
-- Fixes walk-in project linking after signup/login.
--
-- If signup STILL fails, run fix-signup-v2-minimal.sql first, then run this file again.

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

create or replace function public.normalize_client_name(p text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p, '')));
$$;

create or replace function public.normalize_bhutan_phone_digits(p text)
returns text
language sql
immutable
as $$
  select case
    when length(d) > 3 and left(d, 3) = '975' then substr(d, 4)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create or replace function public.normalize_name_for_match(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(p, ''))), '\s+', ' ', 'g');
$$;

create or replace function public.name_first_token(p text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_name_for_match(p) = '' then ''
    else split_part(public.normalize_name_for_match(p), ' ', 1)
  end;
$$;

create or replace function public.name_last_token(p text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_name_for_match(p) = '' then ''
    when position(' ' in public.normalize_name_for_match(p)) = 0 then public.normalize_name_for_match(p)
    else reverse(split_part(reverse(public.normalize_name_for_match(p)), ' ', 1))
  end;
$$;

create or replace function public.client_names_match(a text, b text)
returns boolean
language sql
immutable
as $$
  select case
    when public.normalize_name_for_match(a) = '' or public.normalize_name_for_match(b) = '' then false
    when public.normalize_name_for_match(a) = public.normalize_name_for_match(b) then true
    else public.name_first_token(a) = public.name_first_token(b)
     and public.name_last_token(a) = public.name_last_token(b)
  end;
$$;

create or replace function public.profile_full_name_from_metadata(meta jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(concat_ws(
      ' ',
      nullif(trim(meta->>'first_name'), ''),
      nullif(trim(meta->>'middle_name'), ''),
      nullif(trim(meta->>'last_name'), '')
    )), ''),
    ''
  );
$$;

create or replace function public.link_walk_in_projects_to_client(p_client_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_project record;
  v_booking_id uuid;
  v_linked_count integer := 0;
  v_profile_phone text;
begin
  set local row_security = off;

  if auth.uid() is not null and p_client_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'You can only link walk-in projects to your own account';
  end if;

  select id, full_name, email, phone, role
  into v_profile
  from public.profiles
  where id = p_client_id;

  if not found or v_profile.role <> 'client' then
    return 0;
  end if;

  v_profile_phone := public.normalize_bhutan_phone_digits(v_profile.phone);
  if v_profile_phone = '' or length(v_profile_phone) <> 8 then
    return 0;
  end if;

  if public.normalize_name_for_match(v_profile.full_name) = '' then
    return 0;
  end if;

  for v_project in
    select p.*
    from public.projects p
    where public.client_names_match(p.artist_name, v_profile.full_name)
      and public.normalize_bhutan_phone_digits(p.artist_phone) = v_profile_phone
      and not exists (
        select 1
        from public.bookings b
        join public.profiles pr on pr.id = b.client_id
        where b.project_id = p.id
          and pr.role = 'client'
          and b.client_id <> p_client_id
      )
  loop
    if exists (
      select 1
      from public.bookings b
      where b.project_id = v_project.id
        and b.client_id = p_client_id
    ) then
      continue;
    end if;

    if v_project.booking_id is not null then
      select b.id
      into v_booking_id
      from public.bookings b
      where b.id = v_project.booking_id
        and not exists (
          select 1
          from public.profiles pr
          where pr.id = b.client_id
            and pr.role = 'client'
            and b.client_id <> p_client_id
        );

      if v_booking_id is not null then
        update public.bookings
        set
          client_id = p_client_id,
          client_name = v_profile.full_name,
          client_email = v_profile.email,
          project_id = v_project.id,
          project_name = coalesce(nullif(trim(project_name), ''), v_project.project_name),
          producer_name = coalesce(nullif(trim(producer_name), ''), v_project.producer),
          project_amount = coalesce(project_amount, v_project.project_amount),
          required_advance = coalesce(required_advance, v_project.advance_payment),
          advance_paid = coalesce(advance_paid, v_project.advance_payment),
          status = case when status = 'cancelled' then status else 'confirmed' end
        where id = v_booking_id;

        v_linked_count := v_linked_count + 1;
        continue;
      end if;
    end if;

    insert into public.bookings (
      client_id,
      client_name,
      client_email,
      artist_name,
      project_type,
      project_category,
      preferred_date,
      notes,
      status,
      project_name,
      producer_name,
      project_amount,
      required_advance,
      advance_paid,
      project_id
    )
    values (
      p_client_id,
      v_profile.full_name,
      v_profile.email,
      v_project.artist_name,
      v_project.project_type,
      v_project.project_category,
      '',
      '',
      'confirmed',
      v_project.project_name,
      v_project.producer,
      v_project.project_amount,
      v_project.advance_payment,
      v_project.advance_payment,
      v_project.id
    )
    returning id into v_booking_id;

    update public.projects
    set booking_id = v_booking_id,
        updated_at = now()
    where id = v_project.id;

    v_linked_count := v_linked_count + 1;
  end loop;

  return v_linked_count;
end;
$$;

grant execute on function public.link_walk_in_projects_to_client(uuid) to authenticated;

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

  profile_full_name := public.profile_full_name_from_metadata(new.raw_user_meta_data);
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
