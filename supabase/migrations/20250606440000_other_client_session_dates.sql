-- Lets clients see which session dates are taken by other clients (dates only, no PII).

create or replace function public.get_other_client_session_dates()
returns table(session_date text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select distinct d.session_date
  from (
    select trim(b.preferred_date) as session_date
    from public.bookings b
    where b.status <> 'cancelled'
      and b.client_id is distinct from auth.uid()
      and trim(coalesce(b.preferred_date, '')) <> ''
    union
    select trim(b.proposed_date) as session_date
    from public.bookings b
    where b.status <> 'cancelled'
      and b.client_id is distinct from auth.uid()
      and trim(coalesce(b.proposed_date, '')) <> ''
      and coalesce(b.proposed_date_status, '') = 'pending'
  ) d;
end;
$$;

grant execute on function public.get_other_client_session_dates() to authenticated;
