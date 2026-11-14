// Print-on-demand orders: what happens after a buyer pays (podShop capture, paypalWebhook) and when
// Printify reports progress (printifyWebhook). The site keeps its own pod_order row; Printify is
// told what to print and where to send it.
import { printify, shopId, errorOf } from './printify.js';
import { toCents, money } from './paypal.js';
import { notifyOwner, inBackground } from './push.js';

export const POD_PREFIX = 'pod_';   // PayPal custom_id of a print order (ebook checkouts use a bare uuid)

export const fullName = (a) => [a?.first_name, a?.last_name].filter(Boolean).join(' ').trim();

// Printify's address_to from the address the buyer typed (already checked by cleanAddress)
export const addressTo = (a) => ({
  first_name: a.first_name, last_name: a.last_name, email: a.email, phone: a.phone || '',
  country: a.country, region: a.region || '', address1: a.address1, address2: a.address2 || '',
  city: a.city, zip: a.zip,
});

const REGION_REQUIRED = new Set(['US', 'CA', 'AU']);
const str = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// -> { address } or { error }
export function cleanAddress(input) {
  const a = {
    first_name: str(input?.first_name, 60), last_name: str(input?.last_name, 60),
    email: str(input?.email, 120).toLowerCase(), phone: str(input?.phone, 30),
    country: str(input?.country, 2).toUpperCase(), region: str(input?.region, 60),
    address1: str(input?.address1), address2: str(input?.address2), city: str(input?.city, 80), zip: str(input?.zip, 20),
  };
  if (!a.first_name || !a.last_name) return { error: 'Please enter your first and last name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return { error: 'Please enter a valid email address.' };
  if (!/^[A-Z]{2}$/.test(a.country)) return { error: 'Please choose a country.' };
  if (!a.address1 || !a.city || !a.zip) return { error: 'Please enter your street address, city and ZIP / postal code.' };
  if (REGION_REQUIRED.has(a.country) && !a.region) return { error: 'Please choose your state / province.' };
  if (a.country === 'US' && !/^\d{5}(-\d{4})?$/.test(a.zip)) return { error: 'Please enter a valid US ZIP code.' };
  return { address: a };
}

// The buyer's cart -> priced line items, from the database only (never the browser's prices).
// -> { lines } or { error, status }
export async function priceCart(db, rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) return { error: 'Your cart is empty.', status: 400 };
  if (items.length > 30) return { error: 'Too many items in one order.', status: 400 };
  const lines = [];
  for (const it of items) {
    const qty = Math.floor(Number(it?.quantity));
    if (!(qty >= 1 && qty <= 20)) return { error: 'Quantity must be between 1 and 20.', status: 400 };
    const product = await db.Product.get(String(it?.product_id || '')).catch(() => null);
    if (!product || product.status !== 'published' || !product.printify_product_id) {
      return { error: 'One of the items is no longer available. Please refresh your cart.', status: 409 };
    }
    const variant = (product.variants || []).find((v) => String(v.id) === String(it?.variant_id));
    if (!variant || variant.available === false) {
      return { error: `"${product.title}" is not available in that size / colour any more.`, status: 409 };
    }
    const unit = toCents(product.price) + Number(variant.extra || 0);
    if (!(unit > 0)) return { error: `"${product.title}" has no price yet. Please contact us.`, status: 400 };
    const line = lines.find((l) => l.product_id === product.id && l.variant_id === variant.id);
    if (line) line.quantity += qty;
    else {
      lines.push({
        product_id: product.id,
        printify_product_id: product.printify_product_id,
        variant_id: variant.id,
        title: String(product.title || 'Product').slice(0, 120),
        variant_title: String(variant.title || '').slice(0, 120),
        image: imageFor(product, variant.id),
        quantity: qty,
        unit_price: unit,
      });
    }
  }
  return { lines };
}

export function imageFor(product, variantId) {
  const own = (product.variant_images || []).filter((img) => (img.variant_ids || []).includes(variantId));
  return (own.find((img) => img.is_default) || own[0])?.src || product.images?.[0] || '';
}

const printifyLines = (lines) => lines.map((l) => ({ product_id: l.printify_product_id, variant_id: Number(l.variant_id), quantity: l.quantity }));

// Standard shipping from Printify for these lines to this address. -> { cents } or { error }
export async function quoteShipping(lines, address) {
  const shop = await shopId();
  const r = await printify('POST', `/shops/${shop}/orders/shipping.json`, { line_items: printifyLines(lines), address_to: addressTo(address) });
  const cents = Number(r.data?.standard);
  if (!r.ok || !Number.isFinite(cents) || cents < 0) {
    console.error(`pod: shipping quote failed: ${errorOf(r)}`);
    return { error: r.status === 400 || r.status === 422
      ? "We can't ship these items to that address yet. Please check the address or contact us."
      : 'Could not calculate shipping right now. Please try again in a moment.' };
  }
  return { cents: Math.round(cents) };
}

export const subtotalOf = (lines) => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
export const orderLink = (order) => `/order/${order.id}?token=${order.access_token}`;

// What the buyer's order page may show (no PayPal or Printify internals).
export const publicOrder = (o) => ({
  id: o.id,
  created_date: o.created_date,
  status: o.status,
  items: (o.items || []).map(({ title, variant_title, image, quantity, unit_price, product_id }) => ({ title, variant_title, image, quantity, unit_price, product_id })),
  subtotal: o.subtotal, shipping: o.shipping, total: o.total,
  address: o.address ? { name: fullName(o.address), city: o.address.city, region: o.address.region, country: o.address.country, zip: o.address.zip, address1: o.address.address1, address2: o.address.address2 } : null,
  email: o.email,
  shipments: (o.shipments || []).map(({ carrier, number, url, shipped_at, delivered_at }) => ({ carrier, number, url, shipped_at, delivered_at })),
});

// Send a paid order to Printify and start production. Safe to call again (retry from Admin):
// an order Printify already has is only sent to production. -> updated order row
export async function submitToPrintify(db, order) {
  try {
    const shop = await shopId();
    let printifyId = order.printify_order_id;
    if (!printifyId) {
      const r = await printify('POST', `/shops/${shop}/orders.json`, {
        external_id: order.id,
        label: `DN-${order.id.slice(0, 8).toUpperCase()}`,
        line_items: printifyLines(order.items || []),
        shipping_method: 1,
        is_printify_express: false,
        is_economy_shipping: false,
        // Printify emails the buyer the tracking link (the site has no mail server of its own)
        send_shipping_notification: true,
        address_to: addressTo(order.address),
      });
      if (!r.ok || !r.data?.id) throw new Error(errorOf(r));
      printifyId = String(r.data.id);
      order = await db.PodOrder.update(order.id, { printify_order_id: printifyId, printify_status: 'pending', note: null });
    }
    const sent = await printify('POST', `/shops/${shop}/orders/${printifyId}/send_to_production.json`, {});
    if (!sent.ok) throw new Error(errorOf(sent));
    return await db.PodOrder.update(order.id, { status: 'in_production', printify_status: 'sending-to-production', note: null });
  } catch (error) {
    console.error(`pod: order ${order.id} not accepted by Printify: ${error.message}`);
    const updated = await db.PodOrder.update(order.id, { status: 'needs_attention', note: String(error.message).slice(0, 500) });
    await inBackground(notifyOwner(db, {
      title: 'Đơn áo cần xử lý',
      body: `Printify chưa nhận đơn ${order.id.slice(0, 8)}: ${String(error.message).slice(0, 120)}`,
      url: '/admin?tab=pod',
      tag: `pod-issue-${order.id}`,
    }));
    return updated;
  }
}

// A completed PayPal capture for a print order (browser capture or webhook). Safe to call twice.
// -> 'paid' | 'mismatch'
export async function completePodOrder(db, order, capture, payerEmail) {
  const amount = capture?.amount || {};
  if (amount.currency_code !== 'USD' || toCents(amount.value) !== Number(order.total)) {
    console.error(`pod: amount mismatch on order ${order.id}: got ${amount.value} ${amount.currency_code}, expected ${money(order.total)} USD`);
    await db.PodOrder.update(order.id, { capture_id: capture?.id || null, status: 'needs_attention', note: `Số tiền PayPal (${amount.value} ${amount.currency_code}) khác tổng đơn ($${money(order.total)}).` }).catch(() => {});
    return 'mismatch';
  }
  // claim the order in one statement: when the browser and the webhook arrive together, only one
  // of them moves it out of "started", so Printify gets exactly one order
  const [paid] = await db.PodOrder.updateMany({ id: order.id, status: 'started' }, {
    $set: { status: 'paid', capture_id: capture?.id || null, paid_date: new Date().toISOString(), email: order.email || payerEmail || null },
  });
  if (!paid) return 'paid';   // already handled by the other path
  const items = (order.items || []).map((l) => `${l.quantity}× ${l.title}${l.variant_title ? ` (${l.variant_title})` : ''}`).join(', ');
  await inBackground(notifyOwner(db, {
    title: `Đơn áo mới · $${money(order.total)}`,
    body: `${items}${order.email ? ` · ${order.email}` : ''}`.slice(0, 200),
    url: '/admin?tab=pod',
    tag: `pod-${order.id}`,
  }));
  await submitToPrintify(db, paid);
  return 'paid';
}

// Printify order status -> the site's status (null: leave as is)
export function siteStatusFor(printifyStatus, current) {
  const s = String(printifyStatus || '');
  if (s === 'canceled') return 'canceled';
  if (s === 'fulfilled') return current === 'delivered' ? 'delivered' : 'shipped';
  if (s === 'partially-fulfilled') return 'shipped';
  if (['has-issues', 'payment-not-received', 'unfulfillable', 'source-check-failed'].includes(s)) return 'needs_attention';
  if (['in-production', 'sending-to-production', 'sending_to_production_delegate', 'sending_to_production_delegate_sync'].includes(s)) {
    return ['shipped', 'delivered'].includes(current) ? null : 'in_production';
  }
  return null;
}

// Refund / chargeback of a print order's capture. -> number of orders changed
export async function refundPodCapture(db, captureId, full) {
  const [order] = await db.PodOrder.filter({ capture_id: captureId });
  if (!order) return 0;
  await db.PodOrder.update(order.id, { status: full ? 'refunded' : 'partially_refunded' });
  return 1;
}
