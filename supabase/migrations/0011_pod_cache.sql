-- Printify catalog answers kept for a while (server only): the list of product types (1 day) and,
-- per product type, colours / sizes / costs read through a short-lived probe product (7 days).
create table public.pod_cache (
  id text primary key,               -- 'blueprints' or 'bp:<blueprint id>'
  data jsonb not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create trigger pod_cache_touch before update on public.pod_cache for each row execute function public.touch_updated_date();
alter table public.pod_cache enable row level security;   -- no policy: only the edge functions read it
