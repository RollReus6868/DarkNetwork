-- Print on demand through Printify, sold and paid on this site (PayPal), printed and shipped by Printify.
-- Products are designed in Printify and copied here by the podShop function ("sync", admin only).

-- What the product page needs to sell a Printify product. No cost price is stored here (public table):
--   options         [{ name, type, values: [{ id, title, colors }] }]   only the values on sale
--   variants        [{ id, title, options: [value ids], extra, available }]
--                   extra = cents added to product.price for this variant (bigger sizes cost more)
--   variant_images  [{ src, variant_ids, is_default }]                  mockups per colour
alter table public.product
  add column printify_product_id text,
  add column options jsonb,
  add column variants jsonb,
  add column variant_images jsonb;
create unique index product_printify_key on public.product (printify_product_id) where printify_product_id is not null;

-- One order of printed goods. Written only by the server (podShop, printifyWebhook, paypalWebhook);
-- a signed-in buyer reads their own orders, a guest reads theirs through podShop with access_token.
create table public.pod_order (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  status text not null default 'started' check (status in (
    'started',            -- checkout opened, not paid
    'paid',               -- paid, not yet accepted by Printify
    'in_production',      -- sent to Printify for printing
    'shipped', 'delivered',
    'needs_attention',    -- paid but Printify could not take it (see note): the owner acts
    'canceled', 'refunded', 'partially_refunded')),
  user_id text,
  email text,
  access_token text not null,
  items jsonb not null,           -- [{ product_id, printify_product_id, variant_id, title, variant_title, image, quantity, unit_price }]
  subtotal integer not null,      -- cents
  shipping integer not null,      -- cents
  total integer not null,         -- cents
  address jsonb not null,         -- { first_name, last_name, email, phone, country, region, address1, address2, city, zip }
  paypal_order_id text,
  capture_id text,
  paid_date timestamptz,
  printify_order_id text,
  printify_status text,
  shipments jsonb,                -- [{ carrier, number, url, shipped_at, delivered_at }]
  note text
);
create trigger pod_order_touch before update on public.pod_order for each row execute function public.touch_updated_date();
create index pod_order_paypal_idx on public.pod_order (paypal_order_id);
create index pod_order_capture_idx on public.pod_order (capture_id);
create index pod_order_printify_idx on public.pod_order (printify_order_id);
create index pod_order_user_idx on public.pod_order (user_id);
create index pod_order_created_idx on public.pod_order (created_date);
alter table public.pod_order enable row level security;
create policy "read own or admin" on public.pod_order for select using (user_id = auth.uid()::text or public.is_admin());
