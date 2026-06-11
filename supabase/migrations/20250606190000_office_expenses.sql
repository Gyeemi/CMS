create table if not exists public.office_expenses (
  id uuid primary key default gen_random_uuid(),
  category_group text not null,
  category_item text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null,
  description text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_expenses_expense_date_idx
  on public.office_expenses (expense_date desc);

alter table public.office_expenses enable row level security;

drop policy if exists "office_expenses_super_admin_all" on public.office_expenses;
create policy "office_expenses_super_admin_all"
  on public.office_expenses for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
