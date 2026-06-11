alter table public.projects
  add column if not exists studio_notes text not null default '';
