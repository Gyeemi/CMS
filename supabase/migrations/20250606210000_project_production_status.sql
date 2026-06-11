alter table public.projects
  add column if not exists production_status text not null default 'under_production' check (
    production_status in ('under_production', 'production_completed')
  );
