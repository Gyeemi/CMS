alter table public.bookings
  add column if not exists proposed_date text,
  add column if not exists proposed_date_status text check (
    proposed_date_status is null
    or proposed_date_status in ('pending', 'accepted', 'rejected')
  );
