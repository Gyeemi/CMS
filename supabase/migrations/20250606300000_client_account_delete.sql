-- Client account deletion: remove auth/profile but keep projects + payment history.

alter table public.bookings drop constraint if exists bookings_client_id_fkey;

alter table public.bookings
  alter column client_id drop not null;

alter table public.bookings
  add constraint bookings_client_id_fkey
  foreign key (client_id) references public.profiles (id) on delete set null;

create or replace function public.delete_client_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id, full_name, phone, email, role
  into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.role <> 'client' then
    raise exception 'Only client accounts can be deleted from the client portal';
  end if;

  update public.projects p
  set
    artist_name = coalesce(nullif(trim(p.artist_name), ''), v_profile.full_name),
    artist_phone = coalesce(nullif(trim(p.artist_phone), ''), v_profile.phone),
    updated_at = now()
  where exists (
    select 1
    from public.bookings b
    where b.project_id = p.id
      and b.client_id = v_uid
  );

  update public.bookings
  set
    client_id = null,
    client_email = '',
    client_name = coalesce(nullif(trim(client_name), ''), v_profile.full_name)
  where client_id = v_uid
    and project_id is not null;

  delete from public.bookings
  where client_id = v_uid
    and project_id is null;

  delete from auth.users
  where id = v_uid;
end;
$$;

grant execute on function public.delete_client_account() to authenticated;
