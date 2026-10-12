-- More visitor statistics for the DN Product Studio tool, in the spirit of Google Analytics.
-- Still no IP address and no personal data: the country comes from Cloudflare (2-letter code),
-- visitor_id / session_id are random numbers kept in the visitor's browser.

alter table public.page_view
  add column session_id text check (char_length(session_id) <= 64),
  add column country text check (char_length(country) <= 2),
  add column utm_source text check (char_length(utm_source) <= 100),
  add column utm_medium text check (char_length(utm_medium) <= 100),
  add column utm_campaign text check (char_length(utm_campaign) <= 100);

-- engage = time (ms) a page stayed on screen; add_to_cart = an ebook put in the cart.
create table public.site_event (
  id bigint generated always as identity primary key,
  created_date timestamptz not null default now(),
  name text not null check (name in ('engage', 'add_to_cart')),
  visitor_id text not null check (char_length(visitor_id) <= 64),
  session_id text check (char_length(session_id) <= 64),
  path text check (char_length(path) <= 300),
  item_id text check (char_length(item_id) <= 64),
  value integer check (value between 0 and 3600000)
);
create index site_event_created_idx on public.site_event (created_date);
alter table public.site_event enable row level security;
create policy "anyone adds" on public.site_event for insert with check (true);
create policy "admin reads" on public.site_event for select using (public.is_admin());

-- One row each time a buyer is sent to the Lemon Squeezy checkout (written by createEbookCheckout);
-- the webhook marks it paid. Server only: no policy, so the site's visitors can neither read nor write it.
create table public.checkout_attempt (
  id text primary key,                      -- also sent to Lemon Squeezy as custom data "checkout_ref"
  created_date timestamptz not null default now(),
  ebook_ids text[] not null,
  total integer not null default 0,         -- cents
  user_id text,
  email text,
  status text not null default 'started' check (status in ('started', 'paid', 'refunded', 'partially_refunded')),
  order_id text,
  paid_date timestamptz
);
create index checkout_attempt_created_idx on public.checkout_attempt (created_date);
create index checkout_attempt_order_idx on public.checkout_attempt (order_id);
alter table public.checkout_attempt enable row level security;

-- Default channel groups, as Google Analytics names them.
create function public.traffic_channel(ref text, src text, medium text) returns text
language sql immutable set search_path = '' as $$
  with h as (select coalesce(lower(substring(ref from '^[a-z][a-z0-9+.-]*://(?:www\.|m\.)?([^/:?#]+)')), '') as host,
                    lower(coalesce(src, '')) as src, lower(coalesce(medium, '')) as medium)
  select case
    when medium ~ '^(cpc|ppc|paid.*|retargeting)$' then 'Paid'
    when medium ~ 'e-?mail' then 'Email'
    when (host = '' or host ~ 'darknetwork') and src = '' then 'Direct'
    when host || ' ' || src ~ '(youtube|youtu\.be)' then 'Organic Video'
    when host || ' ' || src ~ '(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|naver|search)' then 'Organic Search'
    when host || ' ' || src ~ '(facebook|fb\.|instagram|(^|\.)t\.co|twitter|x\.com|tiktok|reddit|pinterest|linkedin|threads|messenger|zalo|telegram|whatsapp)' then 'Organic Social'
    else 'Referral' end
  from h
$$;

-- Everything the tool's analytics pages show, in one call. Days are Vietnam days; p_days = 7, 28 or 90.
-- Only the server (service role) may call it.
create function public.tool_analytics(p_days int default 7) returns jsonb
language sql stable security definer set search_path = public as $$
with p as (
  select greatest(1, least(coalesce(p_days, 7), 366)) as n, (now() at time zone 'Asia/Ho_Chi_Minh')::date as today
),
v as (
  select pv.*, (pv.created_date at time zone 'Asia/Ho_Chi_Minh')::date as d,
         coalesce(pv.session_id, pv.visitor_id || ':' || (pv.created_date at time zone 'Asia/Ho_Chi_Minh')::date) as sid
  from public.page_view pv, p where pv.created_date > now() - make_interval(days => 2 * p.n + 2)
),
vv as (
  select v.*, v.d > p.today - p.n as cur, v.d <= p.today - p.n and v.d > p.today - 2 * p.n as prev from v, p
),
eng as (
  select session_id, sum(value) as ms from public.site_event, p
  where name = 'engage' and created_date > now() - make_interval(days => 2 * p.n + 2) group by session_id
),
s as (   -- one row per session; where it came from = its first page
  select sid, bool_or(cur) as cur, bool_or(prev) as prev, min(visitor_id) as visitor_id, count(*) as views,
         (array_agg(referrer order by created_date))[1] as ref,
         (array_agg(utm_source order by created_date))[1] as us,
         (array_agg(utm_medium order by created_date))[1] as um
  from vv where cur or prev group by sid
),
se as (
  select s.*, coalesce(eng.ms, 0) as ms, public.traffic_channel(s.ref, s.us, s.um) as channel,
         case when public.traffic_channel(s.ref, s.us, s.um) = 'Direct' then '(direct)'
              else coalesce(nullif(s.us, ''), lower(substring(s.ref from '^[a-z][a-z0-9+.-]*://(?:www\.|m\.)?([^/:?#]+)')), '(direct)') end as source,
         coalesce(eng.ms, 0) >= 10000 or s.views >= 2 as engaged
  from s left join eng on eng.session_id = s.sid
),
names as (
  select '/books/' || slug as path, title from public.ebook
  union all select '/shop/' || slug, title from public.product
  union all select '/bible-studies/' || slug, title from public.bible_study
  union all select '/watch/' || slug, title from public.video
),
rt as (
  select visitor_id, created_date from public.page_view where created_date > now() - interval '30 minutes'
  union all select visitor_id, created_date from public.site_event where created_date > now() - interval '30 minutes'
),
ev as (
  select e.* from public.site_event e, p
  where e.name = 'add_to_cart' and (e.created_date at time zone 'Asia/Ho_Chi_Minh')::date > p.today - p.n
),
ca as (
  select c.* from public.checkout_attempt c, p where (c.created_date at time zone 'Asia/Ho_Chi_Minh')::date > p.today - p.n
),
bp as (
  select b.* from public.ebook_purchase b, p
  where b.payment_status = 'paid' and (coalesce(b.purchase_date, b.created_date) at time zone 'Asia/Ho_Chi_Minh')::date > p.today - p.n
)
select jsonb_build_object(
  'days_range', (select n from p),
  'summary', (select jsonb_build_object(
      'users', count(distinct visitor_id) filter (where cur),
      'sessions', count(*) filter (where cur),
      'views', coalesce(sum(views) filter (where cur), 0),
      'engaged', count(*) filter (where cur and engaged),
      'engage_ms', coalesce(sum(ms) filter (where cur), 0),
      'prev_users', count(distinct visitor_id) filter (where prev),
      'prev_sessions', count(*) filter (where prev),
      'prev_views', coalesce(sum(views) filter (where prev), 0),
      'new_users', (select count(*) from (select visitor_id from public.page_view group by visitor_id
                     having (min(created_date) at time zone 'Asia/Ho_Chi_Minh')::date > (select today - n from p)) f))
    from se),
  'days', (select jsonb_agg(jsonb_build_object('day', g.d::date,
      'users', (select count(distinct visitor_id) from vv where vv.d = g.d::date),
      'views', (select count(*) from vv where vv.d = g.d::date),
      'prev_users', (select count(distinct visitor_id) from vv where vv.d = g.d::date - p.n)) order by g.d)
    from p, generate_series(p.today - p.n + 1, p.today, interval '1 day') g(d)),
  'countries', (select coalesce(jsonb_agg(x order by x.users desc), '[]') from (
      select coalesce(country, '') as country, count(distinct visitor_id) as users from vv where cur group by 1 order by 2 desc limit 12) x),
  'pages', (select coalesce(jsonb_agg(x order by x.views desc), '[]') from (
      select vv.path, max(names.title) as title, count(*) as views, count(distinct visitor_id) as users
      from vv left join names on names.path = vv.path where cur group by vv.path order by 3 desc limit 12) x),
  'channels', (select coalesce(jsonb_agg(x order by x.sessions desc), '[]') from (
      select channel, count(*) as sessions, count(distinct visitor_id) as users, count(*) filter (where engaged) as engaged, sum(ms) as engage_ms
      from se where cur group by channel) x),
  'sources', (select coalesce(jsonb_agg(x order by x.sessions desc), '[]') from (
      select source, min(channel) as channel, count(*) as sessions, count(distinct visitor_id) as users,
             count(*) filter (where engaged) as engaged, sum(ms) as engage_ms
      from se where cur group by source order by 3 desc limit 15) x),
  'realtime', jsonb_build_object(
      'users_30m', (select count(distinct visitor_id) from rt),
      'users_5m', (select count(distinct visitor_id) from rt where created_date > now() - interval '5 minutes'),
      'minutes', (select jsonb_agg((select count(distinct visitor_id) from rt
                    where created_date > now() - make_interval(mins => m + 1) and created_date <= now() - make_interval(mins => m)) order by m desc)
                  from generate_series(0, 29) m),
      'countries', (select coalesce(jsonb_agg(x order by x.users desc), '[]') from (
          select country, count(*) as users from (
            select distinct on (visitor_id) visitor_id, coalesce(country, '') as country from public.page_view
            where visitor_id in (select visitor_id from rt) and created_date > now() - interval '1 day'
            order by visitor_id, created_date desc) l group by country) x)),
  'subscribers', jsonb_build_object(
      'total', (select count(*) from public.subscriber),
      'in_range', (select count(*) from public.subscriber, p where (created_date at time zone 'Asia/Ho_Chi_Minh')::date > p.today - p.n),
      'items', (select coalesce(jsonb_agg(x order by x.date desc), '[]') from (
          select email, source, created_date as date from public.subscriber order by created_date desc limit 100) x)),
  'funnel', jsonb_build_object(
      'book_views', (select count(*) from vv where cur and path like '/books/_%'),
      'add_to_cart', (select count(*) from ev),
      'checkouts', (select count(*) from ca),
      'checkouts_paid', (select count(*) from ca where status <> 'started'),
      'orders', (select count(distinct coalesce(provider_order_id, id)) from bp)),
  'books', (select coalesce(jsonb_agg(x order by x.add_to_cart desc, x.checkouts desc, x.views desc), '[]') from (
      select e.id, e.title,
             (select count(*) from vv where cur and vv.path = '/books/' || e.slug) as views,
             (select count(*) from ev where ev.item_id = e.id) as add_to_cart,
             (select count(*) from ca where e.id = any(ca.ebook_ids)) as checkouts,
             (select count(*) from bp where bp.ebook_id = e.id) as sold
      from public.ebook e) x where x.views + x.add_to_cart + x.checkouts + x.sold > 0),
  'checkouts', (select coalesce(jsonb_agg(x order by x.date desc), '[]') from (
      select ca.created_date as date, ca.total, ca.email, ca.status, ca.order_id, ca.user_id is not null as account,
             (select coalesce(jsonb_agg(coalesce(e.title, 'Ebook đã xoá')), '[]') from unnest(ca.ebook_ids) i left join public.ebook e on e.id = i) as items
      from ca order by ca.created_date desc limit 100) x)
)
$$;
revoke execute on function public.tool_analytics(int) from public, anon, authenticated;
grant execute on function public.tool_analytics(int) to service_role;
