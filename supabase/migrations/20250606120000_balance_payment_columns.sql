alter table public.projects
  add column if not exists balance_payment_method text,
  add column if not exists balance_payment_platform text,
  add column if not exists balance_payment_ref text,
  add column if not exists balance_paid_amount numeric,
  add column if not exists balance_paid_at timestamptz;
