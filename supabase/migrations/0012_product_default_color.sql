-- The colour a Printify product shows first (cards on the home page and the shop, and the colour the
-- product page starts on). A colour name from product.options, e.g. "Black". Empty = automatic:
-- black when the product is made in black, otherwise Printify's default (src/lib/podCart.js).
alter table public.product add column if not exists default_color text;
