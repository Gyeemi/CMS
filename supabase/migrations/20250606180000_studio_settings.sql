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
