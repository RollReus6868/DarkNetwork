-- Payments move from Lemon Squeezy (store closed by Lemon Squeezy in November 2026) to PayPal.
-- checkout_attempt (server only, no RLS policy) now carries what the paypalCheckout function needs
-- between "create order" and "capture": the guest's download key and PayPal's capture id.
alter table public.checkout_attempt
  add column provider text not null default 'lemon_squeezy',
  add column access_token text,
  add column capture_id text;
alter table public.checkout_attempt alter column provider set default 'paypal';

create index checkout_attempt_capture_idx on public.checkout_attempt (capture_id);

-- new purchases come from PayPal; Lemon Squeezy rows keep their provider
alter table public.ebook_purchase alter column provider set default 'paypal';
