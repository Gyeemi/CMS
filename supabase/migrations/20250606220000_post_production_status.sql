alter table public.projects drop constraint if exists projects_production_status_check;

alter table public.projects
  add constraint projects_production_status_check
  check (
    production_status in ('under_production', 'post_production', 'production_completed')
  );

alter table public.projects
  add column if not exists production_status_updated_at timestamptz;

update public.projects
set production_status_updated_at = coalesce(production_status_updated_at, updated_at)
where production_status_updated_at is null;
