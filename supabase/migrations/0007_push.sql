-- Phone notifications for the owner's app (/studio). Server only: RLS on and no policy,
-- so only the edge functions (service role) read or write these tables.

-- One row per phone / browser that turned notifications on.
create table public.push_subscription (
  id bigint generated always as identity primary key,
  created_date timestamptz not null default now(),
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_id text,
  orders_seen timestamptz,      -- newest order this device has seen (the red number on the app icon)
  last_ok timestamptz           -- last time a notification was accepted for it
);
alter table public.push_subscription enable row level security;

-- The site's own VAPID key pair, made by the edge function the first time it is needed.
create table public.push_config (
  id text primary key,
  created_date timestamptz not null default now(),
  public_key text not null,
  private_jwk jsonb not null
);
alter table public.push_config enable row level security;
