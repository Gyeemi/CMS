-- Run in Supabase SQL Editor so walk-in customers stay in Manage → Clients after project delete.

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

create table if not exists public.walk_in_clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.walk_in_clients enable row level security;

drop policy if exists "walk_in_clients_admin_all" on public.walk_in_clients;
create policy "walk_in_clients_admin_all"
  on public.walk_in_clients for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.upsert_walk_in_client(
  p_full_name text,
  p_phone text,
  p_email text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := public.normalize_bhutan_phone_digits(p_phone);
  v_email text := trim(coalesce(p_email, ''));
begin
  if v_name = '' then
    return null;
  end if;

  select w.id
  into v_id
  from public.walk_in_clients w
  where public.client_names_match(w.full_name, v_name)
    and (
      (v_phone <> '' and length(v_phone) = 8
        and public.normalize_bhutan_phone_digits(w.phone) = v_phone)
      or (v_phone = '' and public.normalize_name_for_match(w.full_name) = public.normalize_name_for_match(v_name))
    )
  order by w.created_at asc
  limit 1;

  if v_id is not null then
    update public.walk_in_clients
    set
      full_name = v_name,
      phone = case when trim(coalesce(p_phone, '')) <> '' then trim(p_phone) else phone end,
      email = case when v_email <> '' then v_email else email end,
      updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  insert into public.walk_in_clients (full_name, phone, email)
  values (v_name, trim(coalesce(p_phone, '')), v_email)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_walk_in_client(text, text, text) to authenticated;

insert into public.walk_in_clients (full_name, phone, email, created_at)
select
  p.artist_name,
  coalesce(p.artist_phone, ''),
  coalesce(nullif(trim(b.client_email), ''), ''),
  min(p.created_at)
from public.projects p
left join public.bookings b on b.id = p.booking_id
where trim(coalesce(p.artist_name, '')) <> ''
  and not exists (
    select 1
    from public.bookings lb
    join public.profiles pr on pr.id = lb.client_id
    where lb.project_id = p.id
      and pr.role = 'client'
  )
  and not exists (
    select 1
    from public.walk_in_clients w
    where public.client_names_match(w.full_name, p.artist_name)
      and public.normalize_bhutan_phone_digits(w.phone) = public.normalize_bhutan_phone_digits(p.artist_phone)
  )
group by p.artist_name, p.artist_phone, coalesce(nullif(trim(b.client_email), ''), '');
