-- Notify registered clients when admin creates a project under their name.

alter table public.bookings
  add column if not exists studio_registered_at timestamptz;

create or replace function public.link_project_to_registered_client(
  p_project_id uuid,
  p_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project record;
  v_profile record;
  v_booking_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  select id, full_name, email, phone, role
  into v_profile
  from public.profiles
  where id = p_client_id;

  if not found or v_profile.role <> 'client' then
    return;
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    return;
  end if;

  if v_project.booking_id is not null then
    select id
    into v_booking_id
    from public.bookings
    where id = v_project.booking_id;

    if v_booking_id is not null then
      update public.bookings
      set
        client_id = v_profile.id,
        client_name = v_profile.full_name,
        client_email = v_profile.email,
        artist_name = v_project.artist_name,
        project_type = v_project.project_type,
        project_category = v_project.project_category,
        project_name = v_project.project_name,
        producer_name = v_project.producer,
        project_amount = v_project.project_amount,
        required_advance = v_project.advance_payment,
        advance_paid = v_project.advance_payment,
        project_id = v_project.id,
        status = case when status = 'cancelled' then status else 'confirmed' end,
        studio_registered_at = case
          when client_id is distinct from v_profile.id or studio_registered_at is null then now()
          else studio_registered_at
        end
      where id = v_booking_id;
      return;
    end if;
  end if;

  select b.id
  into v_booking_id
  from public.bookings b
  where b.project_id = v_project.id
  limit 1;

  if v_booking_id is not null then
    update public.bookings
    set
      client_id = v_profile.id,
      client_name = v_profile.full_name,
      client_email = v_profile.email,
      artist_name = v_project.artist_name,
      project_type = v_project.project_type,
      project_category = v_project.project_category,
      project_name = v_project.project_name,
      producer_name = v_project.producer,
      project_amount = v_project.project_amount,
      required_advance = v_project.advance_payment,
      advance_paid = v_project.advance_payment,
      status = case when status = 'cancelled' then status else 'confirmed' end,
      studio_registered_at = case
        when client_id is distinct from v_profile.id or studio_registered_at is null then now()
        else studio_registered_at
      end
    where id = v_booking_id;

    update public.projects
    set booking_id = v_booking_id, updated_at = now()
    where id = v_project.id and booking_id is null;

    return;
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
    project_id,
    studio_registered_at
  )
  values (
    v_profile.id,
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
    v_project.id,
    now()
  )
  returning id into v_booking_id;

  update public.projects
  set booking_id = v_booking_id, updated_at = now()
  where id = v_project.id;
end;
$$;

grant execute on function public.link_project_to_registered_client(uuid, uuid) to authenticated;
