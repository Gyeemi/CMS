-- Clients can delete their own cancelled bookings; purge cancelled rows after 7 days.

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
