alter table public.projects drop constraint if exists projects_production_status_check;

alter table public.projects
  add constraint projects_production_status_check
  check (
    production_status in (
      'project_registered',
      'under_production',
      'post_production',
      'production_completed'
    )
  );

alter table public.projects
  alter column production_status set default 'project_registered';
