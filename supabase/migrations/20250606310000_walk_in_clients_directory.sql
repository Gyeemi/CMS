-- Persistent walk-in customer directory (survives project deletion).

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

-- Backfill from existing studio projects (walk-ins only).
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
