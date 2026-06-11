alter table public.projects
  add column if not exists artist_phone text not null default '';
