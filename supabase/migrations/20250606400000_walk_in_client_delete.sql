-- Password-protected walk-in delete from the app uses this RPC after admin re-auth.
-- Exclusions prevent project-fallback rows from reappearing after delete.

create table if not exists public.walk_in_client_exclusions (
  id uuid primary key default gen_random_uuid(),
  match_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.walk_in_client_exclusions enable row level security;

drop policy if exists "walk_in_client_exclusions_admin_all" on public.walk_in_client_exclusions;
create policy "walk_in_client_exclusions_admin_all"
  on public.walk_in_client_exclusions for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.walk_in_client_match_key(
  p_full_name text,
  p_phone text default '',
  p_email text default ''
)
returns text
language sql
immutable
as $$
  select case
    when length(public.normalize_bhutan_phone_digits(p_phone)) = 8 then
      'phone:' || public.normalize_bhutan_phone_digits(p_phone)
    when trim(coalesce(p_email, '')) <> '' then
      'email:' || lower(trim(p_email))
    else
      'name:' || lower(trim(coalesce(p_full_name, '')))
  end;
$$;

create or replace function public.delete_walk_in_manage_client(
  p_directory_id uuid default null,
  p_full_name text default '',
  p_phone text default '',
  p_email text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  if p_directory_id is not null then
    delete from public.walk_in_clients where id = p_directory_id;
  end if;

  v_key := public.walk_in_client_match_key(p_full_name, p_phone, p_email);

  if trim(coalesce(p_full_name, '')) <> ''
     or length(public.normalize_bhutan_phone_digits(p_phone)) = 8
     or trim(coalesce(p_email, '')) <> '' then
    insert into public.walk_in_client_exclusions (match_key)
    values (v_key)
    on conflict (match_key) do nothing;
  end if;
end;
$$;

grant execute on function public.delete_walk_in_manage_client(uuid, text, text, text) to authenticated;
