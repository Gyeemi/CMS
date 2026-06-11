-- Keep registered clients from reappearing as walk-ins after a phone or name change.

create or replace function public.sync_registered_client_contact(
  p_client_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_old_full_name text default '',
  p_old_phone text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_digits text;
  v_new_digits text;
begin
  if auth.uid() is distinct from p_client_id then
    raise exception 'You can only sync your own profile';
  end if;

  v_old_digits := public.normalize_bhutan_phone_digits(p_old_phone);
  v_new_digits := public.normalize_bhutan_phone_digits(p_phone);

  update public.projects p
  set
    artist_name = trim(p_full_name),
    artist_phone = trim(p_phone),
    updated_at = now()
  where exists (
    select 1
    from public.bookings b
    where b.project_id = p.id
      and b.client_id = p_client_id
  );

  delete from public.walk_in_clients w
  where (
      public.client_names_match(w.full_name, p_full_name)
      or (
        trim(coalesce(p_old_full_name, '')) <> ''
        and public.client_names_match(w.full_name, p_old_full_name)
      )
    )
    and (
      (
        v_old_digits <> ''
        and length(v_old_digits) = 8
        and public.normalize_bhutan_phone_digits(w.phone) = v_old_digits
      )
      or (
        v_new_digits <> ''
        and length(v_new_digits) = 8
        and public.normalize_bhutan_phone_digits(w.phone) = v_new_digits
      )
      or (
        trim(coalesce(p_email, '')) <> ''
        and lower(trim(coalesce(w.email, ''))) = lower(trim(p_email))
      )
    );
end;
$$;

grant execute on function public.sync_registered_client_contact(uuid, text, text, text, text, text) to authenticated;
