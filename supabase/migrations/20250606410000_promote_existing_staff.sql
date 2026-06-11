-- Promote an existing auth user (e.g. former client portal signup) to studio staff.

create or replace function public.promote_existing_user_to_staff(
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admin can promote staff';
  end if;

  if p_role not in ('admin', 'manager') then
    raise exception 'Invalid staff role';
  end if;

  select *
  into v_profile
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if not found then
    raise exception 'No account found for this email';
  end if;

  if v_profile.role = 'super_admin' then
    raise exception 'Cannot change super admin role';
  end if;

  update public.profiles
  set
    role = p_role,
    full_name = case
      when coalesce(trim(p_full_name), '') <> '' then trim(p_full_name)
      else full_name
    end,
    phone = case
      when coalesce(trim(p_phone), '') <> '' then trim(p_phone)
      else phone
    end
  where id = v_profile.id;

  delete from public.pending_managers
  where lower(email) = lower(trim(p_email));
end;
$$;

grant execute on function public.promote_existing_user_to_staff(text, text, text, text) to authenticated;
