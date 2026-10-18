-- Site-wide switches the owner sets in Admin > Cài đặt (e.g. the NEW badge on books),
-- and a ban flag on accounts for Admin > Tài khoản.

-- One row per setting; id is the setting's name, value its JSON (e.g. new_badge = {"enabled": true, "days": 30}).
create table public.site_setting (
  id text primary key check (id ~ '^[a-z0-9_]{1,64}$'),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  value jsonb not null default '{}'::jsonb
);
create trigger site_setting_touch before update on public.site_setting for each row execute function public.touch_updated_date();
alter table public.site_setting enable row level security;
create policy "public read" on public.site_setting for select using (true);
create policy "admin insert" on public.site_setting for insert with check (public.is_admin());
create policy "admin update" on public.site_setting for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.site_setting for delete using (public.is_admin());

-- Set and cleared only by the adminUsers function (service role): profiles has no update policy,
-- so nobody can change their own role or lift their own ban. The sign-in ban itself lives in
-- Supabase Auth (banned_until); this copy lets the site sign a banned visitor out at once.
alter table public.profiles add column banned_at timestamptz;
