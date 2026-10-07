-- The site's own visit counter, read by the desktop tool. No IP address and no personal data:
-- visitor_id is a random number kept in the visitor's browser.
create table public.page_view (
  id bigint generated always as identity primary key,
  created_date timestamptz not null default now(),
  path text not null check (char_length(path) <= 300),
  visitor_id text not null check (char_length(visitor_id) <= 64),
  referrer text check (char_length(referrer) <= 300)
);
create index page_view_created_idx on public.page_view (created_date);
alter table public.page_view enable row level security;
create policy "anyone adds" on public.page_view for insert with check (true);
create policy "admin reads" on public.page_view for select using (public.is_admin());

-- Summaries for the tool (days in Vietnam time). security_invoker: the table's rules above still apply.
create view public.traffic_daily with (security_invoker = true) as
  select (created_date at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as views, count(distinct visitor_id) as visitors
  from public.page_view where created_date > now() - interval '31 days' group by 1;

create view public.traffic_page with (security_invoker = true) as
  select path, count(*) as views, count(distinct visitor_id) as visitors
  from public.page_view where created_date > now() - interval '30 days' group by path;

create view public.traffic_summary with (security_invoker = true) as
  select count(*) filter (where d = today) as views_today, count(distinct visitor_id) filter (where d = today) as visitors_today,
         count(*) filter (where d > today - 7) as views_7d, count(distinct visitor_id) filter (where d > today - 7) as visitors_7d,
         count(*) filter (where d > today - 30) as views_30d, count(distinct visitor_id) filter (where d > today - 30) as visitors_30d
  from (select visitor_id, (created_date at time zone 'Asia/Ho_Chi_Minh')::date as d, (now() at time zone 'Asia/Ho_Chi_Minh')::date as today
        from public.page_view where created_date > now() - interval '31 days') t;
