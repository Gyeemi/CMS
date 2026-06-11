-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run: drops policies first, skips objects that already exist.
--
-- After running:
-- 1. Create admin (pick one):
--    a) npm run create-admin  (add SUPABASE_SERVICE_ROLE_KEY to .env first)
--    b) Authentication → Users → Add user → admin@groovx.com / groovx
--       then run supabase/seed-admin.sql to confirm email
-- 2. Optional for dev: Authentication → Providers → Email → disable "Confirm email"
-- 3. admin@groovx.com is always super_admin; managers are added via Manage screen

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'client' check (role in ('super_admin', 'admin', 'client')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'client'));

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

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
  where id = target_id and role = 'admin';
end;
$$;

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
    where id = target_id and role in ('super_admin', 'admin')
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
    where id = target_id and role in ('super_admin', 'admin')
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

grant execute on function public.remove_manager(uuid) to authenticated;
grant execute on function public.change_manager_password(uuid, text) to authenticated;
grant execute on function public.update_manager_name(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pending managers (super admin pre-approves manager signups)
-- ---------------------------------------------------------------------------
create table if not exists public.pending_managers (
  email text primary key,
  full_name text not null default '',
  phone text not null default '',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.pending_managers enable row level security;

drop policy if exists "pending_managers_super_admin_all" on public.pending_managers;
create policy "pending_managers_super_admin_all"
  on public.pending_managers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  assigned_role := case
    when lower(new.email) = 'admin@groovx.com' then 'super_admin'
    when exists (
      select 1 from public.pending_managers pm
      where lower(pm.email) = lower(new.email)
    ) then 'admin'
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  client_name text not null,
  client_email text not null,
  artist_name text not null,
  project_type text not null,
  project_category text not null,
  preferred_date text not null default '',
  proposed_date text,
  proposed_date_status text check (
    proposed_date_status is null
    or proposed_date_status in ('pending', 'accepted', 'rejected')
  ),
  notes text not null default '',
  status text not null default 'pending' check (
    status in (
      'pending',
      'awaiting_advance',
      'awaiting_confirmation',
      'confirmed',
      'completed',
      'cancelled'
    )
  ),
  project_name text,
  producer_name text,
  project_details_submitted_at timestamptz,
  project_amount numeric,
  required_advance numeric,
  advance_paid numeric default 0,
  project_id uuid,
  payment_screenshot_url text,
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin"
  on public.bookings for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own"
  on public.bookings for insert
  with check (client_id = auth.uid());

drop policy if exists "bookings_update_own_or_admin" on public.bookings;
create policy "bookings_update_own_or_admin"
  on public.bookings for update
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin"
  on public.bookings for delete
  using (public.is_admin());

drop policy if exists "bookings_delete_own_cancelled" on public.bookings;
create policy "bookings_delete_own_cancelled"
  on public.bookings for delete
  using (client_id = auth.uid() and status = 'cancelled');

create or replace function public.purge_expired_cancelled_bookings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bookings
  where status = 'cancelled'
    and cancelled_at is not null
    and cancelled_at < now() - interval '7 days';
end;
$$;

grant execute on function public.purge_expired_cancelled_bookings() to authenticated;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  artist_name text not null,
  artist_phone text not null default '',
  producer text not null,
  project_type text not null,
  project_category text not null,
  project_amount numeric not null default 0,
  audio_amount numeric,
  video_amount numeric,
  advance_payment numeric not null default 0,
  discount numeric not null default 0,
  gst_enabled boolean not null default false,
  audio_copyright text not null default 'Authorized',
  balance_payment_method text,
  balance_payment_platform text,
  balance_payment_ref text,
  balance_paid_amount numeric,
  balance_paid_at timestamptz,
  studio_notes text not null default '',
  production_status text not null default 'project_registered' check (
    production_status in (
      'project_registered',
      'under_production',
      'post_production',
      'production_completed'
    )
  ),
  production_status_updated_at timestamptz,
  booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists balance_payment_method text,
  add column if not exists balance_payment_platform text,
  add column if not exists balance_payment_ref text,
  add column if not exists balance_paid_amount numeric,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists studio_notes text not null default '';

alter table public.projects enable row level security;

drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all"
  on public.projects for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "projects_client_read_linked" on public.projects;
create policy "projects_client_read_linked"
  on public.projects for select
  using (
    exists (
      select 1 from public.bookings b
      where b.project_id = projects.id and b.client_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_booking_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_booking_id_fkey
      foreign key (booking_id) references public.bookings (id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_project_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique,
  invoice_number text not null,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'invoices_project_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;
end $$;

drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Studio payment accounts
-- ---------------------------------------------------------------------------
create table if not exists public.studio_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  account_holder text not null,
  account_name text not null,
  bank_name text not null,
  branch text not null,
  account_number text not null,
  created_at timestamptz not null default now()
);

alter table public.studio_payment_accounts enable row level security;

drop policy if exists "payment_accounts_select_authenticated" on public.studio_payment_accounts;
create policy "payment_accounts_select_authenticated"
  on public.studio_payment_accounts for select
  to authenticated
  using (true);

drop policy if exists "payment_accounts_admin_write" on public.studio_payment_accounts;
create policy "payment_accounts_admin_write"
  on public.studio_payment_accounts for insert
  with check (public.is_admin());

drop policy if exists "payment_accounts_admin_update" on public.studio_payment_accounts;
create policy "payment_accounts_admin_update"
  on public.studio_payment_accounts for update
  using (public.is_admin());

drop policy if exists "payment_accounts_admin_delete" on public.studio_payment_accounts;
create policy "payment_accounts_admin_delete"
  on public.studio_payment_accounts for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: payment screenshots
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "payment_screenshots_read" on storage.objects;
create policy "payment_screenshots_read"
  on storage.objects for select
  using (bucket_id = 'payment-screenshots');

drop policy if exists "payment_screenshots_upload_own" on storage.objects;
create policy "payment_screenshots_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "payment_screenshots_admin_upload" on storage.objects;
create policy "payment_screenshots_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'payment-screenshots' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: profile avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "profile_avatars_read" on storage.objects;
create policy "profile_avatars_read"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "profile_avatars_upload_own" on storage.objects;
create policy "profile_avatars_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Studio settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_settings (
  id text primary key default 'default',
  licence_no text not null default 'XXXX',
  tpn_no text not null default 'XXXX',
  contact_no text not null default '+975 176 06 130',
  location text not null default 'Toribari (Pekherzing), Phuentsholing, Chukha 21101',
  updated_at timestamptz not null default now()
);

insert into public.studio_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.studio_settings enable row level security;

drop policy if exists "studio_settings_read_admin" on public.studio_settings;
create policy "studio_settings_read_admin"
  on public.studio_settings for select
  to authenticated
  using (public.is_admin());

drop policy if exists "studio_settings_update_super_admin" on public.studio_settings;
create policy "studio_settings_update_super_admin"
  on public.studio_settings for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Office expenses (super admin)
-- ---------------------------------------------------------------------------
create table if not exists public.office_expenses (
  id uuid primary key default gen_random_uuid(),
  category_group text not null,
  category_item text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null,
  description text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_expenses_expense_date_idx
  on public.office_expenses (expense_date desc);

alter table public.office_expenses enable row level security;

drop policy if exists "office_expenses_super_admin_all" on public.office_expenses;
create policy "office_expenses_super_admin_all"
  on public.office_expenses for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception
  when undefined_object then
    raise notice 'supabase_realtime publication not found — enable Realtime in Dashboard → Database → Replication';
end $$;
