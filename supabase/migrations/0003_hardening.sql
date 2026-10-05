-- Keep privileged helper code out of the public API (Supabase security advisor).
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- the real admin check runs with elevated rights, but lives where the API cannot call it directly
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- same name the policies already use, now a plain wrapper
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.is_admin();
$$;

-- only the sign-up trigger may run this
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.touch_updated_date() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_date = now();
  return new;
end;
$$;
