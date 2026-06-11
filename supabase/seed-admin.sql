-- Run in Supabase Dashboard → SQL Editor after schema.sql
-- Fixes super admin login when the user exists but email is not confirmed,
-- or when the profile role was not set to super_admin.
--
-- Note: confirmed_at on auth.users is a generated column — only set email_confirmed_at.

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = 'admin@groovx.com';

update public.profiles
set role = 'super_admin'
where lower(email) = 'admin@groovx.com';
