import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';
import { paypal, paypalEnv, paypalConfigured, paypalClientId, money, firstCapture, issueOf } from '../_shared/paypal.js';
import {
  printify, printifyConfigured, shopId, errorOf, fromPrintify, guessCategory, slugify, webhookSecret, DEFAULT_PRICE,
} from '../_shared/printify.js';
import {
  POD_PREFIX, cleanAddress, priceCart, quoteShipping, subtotalOf, orderLink, publicOrder, completePodOrder,
  submitToPrintify, siteStatusFor, fullName,
} from '../_shared/pod.js';

// Print-on-demand shop: the site sells, PayPal takes the money, Printify prints and ships.
// Buyers:
//   { action: 'config' }                          -> { ready, env, client_id }
//   { action: 'quote', items, address }           -> { lines, subtotal, shipping, total }   (cents)
//   { action: 'create', items, address }          -> { id }   PayPal order id for the PayPal buttons
//   { action: 'capture', order_id }               -> { status: 'paid' | 'pending', after }
//   { action: 'track', id, token }                -> { order }  the buyer's order page
// Owner (admin login):
//   { action: 'status' }    is Printify connected, which shop, webhooks
//   { action: 'sync' }      copy / refresh products from the Printify shop (new ones as drafts)
//   { action: 'orders' }    list print orders           { action: 'refresh', id }  ask Printify again
//   { action: 'retry', id } send a paid order to Printify again        { action: 'webhooks' } connect them
// items = [{ product_id, variant_id, quantity }]; prices always come from the database.
const fail = (status, error, extra = {}) => Response.json({ error, ...extra }, { status });
const WEBHOOK_TOPICS = ['order:updated', 'order:sent-to-production', 'order:shipment:created', 'order:shipment:delivered'];

function paypalOrderBody(order, lines, address, origin) {
  return {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: 'merch',
      custom_id: `${POD_PREFIX}${order.id}`,
      invoice_id: `${POD_PREFIX}${order.id}`,
      // the buyer's way back to the order page, shown in PayPal's receipt (PayPal allows 127 characters)
      description: `Order: ${origin}${orderLink(order)}`.length <= 127 && origin
        ? `Order: ${origin}${orderLink(order)}`
        : `Dark Network order #${order.id.slice(0, 8).toUpperCase()}`,
      amount: {
        currency_code: 'USD',
        value: money(order.total),
        breakdown: {
          item_total: { currency_code: 'USD', value: money(order.subtotal) },
          shipping: { currency_code: 'USD', value: money(order.shipping) },
        },
      },
      items: lines.map((l) => ({
        name: `${l.title}${l.variant_title ? ` - ${l.variant_title}` : ''}`.slice(0, 127),
        quantity: String(l.quantity),
        unit_amount: { currency_code: 'USD', value: money(l.unit_price) },
        category: 'PHYSICAL_GOODS',
        sku: `${l.printify_product_id}-${l.variant_id}`.slice(0, 127),
      })),
      shipping: {
        name: { full_name: fullName(address).slice(0, 300) },
        address: {
          address_line_1: address.address1, ...(address.address2 ? { address_line_2: address.address2 } : {}),
          admin_area_2: address.city, ...(address.region ? { admin_area_1: address.region } : {}),
          postal_code: address.zip, country_code: address.country,
        },
      },
    }],
    application_context: { brand_name: 'Dark Network', shipping_preference: 'SET_PROVIDED_ADDRESS', user_action: 'PAY_NOW' },
  };
}

async function syncProducts(db) {
  const shop = await shopId();
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await printify('GET', `/shops/${shop}/products.json?page=${page}&limit=50`);
    if (!r.ok) throw new Error(errorOf(r));
    all.push(...(r.data?.data || []));
    if (!r.data?.last_page || page >= Number(r.data.last_page)) break;
  }
  const existing = (await db.Product.list()).filter((p) => p.printify_product_id);
  const slugs = new Set((await db.Product.list()).map((p) => p.slug));
  const result = { created: [], updated: [], skipped: [], missing: [] };
  for (const p of all) {
    const mine = existing.find((e) => e.printify_product_id === String(p.id));
    const price = Number(mine?.price) > 0 ? Number(mine.price) : DEFAULT_PRICE;
    const fields = fromPrintify(p, price);
    if (!fields.variants.length) { result.skipped.push(p.title); continue; }
    if (mine) {
      const oldMockups = new Set((mine.variant_images || []).map((i) => i.src));
      const ownPictures = (mine.images || []).some((src) => !oldMockups.has(src));
      await db.Product.update(mine.id, {
        options: fields.options, variants: fields.variants, variant_images: fields.variant_images,
        ...(ownPictures ? {} : { images: fields.images }),   // keep pictures the owner uploaded
      });
      result.updated.push(mine.title);
    } else {
      let slug = slugify(p.title);
      for (let i = 2; slugs.has(slug); i++) slug = `${slugify(p.title).slice(0, 74)}-${i}`;
      slugs.add(slug);
      await db.Product.create({
        title: p.title, slug, category: guessCategory(`${p.title} ${p.tags?.join(' ') || ''}`),
        price, description: p.description || '', status: 'draft', featured: false, sort_order: 0,
        printify_product_id: String(p.id), ...fields,
      });
      result.created.push(p.title);
    }
  }
  const ids = new Set(all.map((p) => String(p.id)));
  result.missing = existing.filter((e) => !ids.has(e.printify_product_id)).map((e) => e.title);
  return result;
}

async function refreshFromPrintify(db, order) {
  if (!order.printify_order_id) return order;
  const shop = await shopId();
  const r = await printify('GET', `/shops/${shop}/orders/${order.printify_order_id}.json`);
  if (!r.ok) throw new Error(errorOf(r));
  const shipments = (r.data?.shipments || []).map((s) => ({ carrier: s.carrier, number: s.number, url: s.url, delivered_at: s.delivered_at || null }));
  const delivered = shipments.length > 0 && shipments.every((s) => s.delivered_at);
  let status = siteStatusFor(r.data?.status, order.status);
  if (delivered && r.data?.status === 'fulfilled') status = 'delivered';
  if (['refunded', 'partially_refunded'].includes(order.status)) status = null;   // money state wins
  return db.PodOrder.update(order.id, {
    printify_status: r.data?.status || order.printify_status,
    ...(shipments.length ? { shipments } : {}),
    ...(status ? { status } : {}),
  });
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const env = paypalEnv();
    const ready = paypalConfigured() && printifyConfigured() && (env === 'live' || user?.role === 'admin');

    // ---------- buyers ----------
    if (action === 'config') {
      return Response.json(ready ? { ready, env, client_id: paypalClientId() } : { ready: false, env });
    }

    if (action === 'track') {
      const order = await db.PodOrder.get(String(body.id || '')).catch(() => null);
      const allowed = order && (
        (body.token && String(body.token) === order.access_token)
        || (user && (user.id === order.user_id || user.role === 'admin')));
      if (!allowed) return fail(404, 'Order not found');
      return Response.json({ order: publicOrder(order) });
    }

    if (action === 'quote' || action === 'create') {
      if (action === 'create' && !ready) return fail(503, 'Checkout is being upgraded. Please try again soon.');
      if (!printifyConfigured()) return fail(503, 'Our shop is being set up. Please try again soon.');
      const { address, error: addressError } = cleanAddress(body.address);
      const priced = await priceCart(db, body.items);
      if (priced.error) return fail(priced.status, priced.error);
      if (addressError) return fail(400, addressError);
      const quote = await quoteShipping(priced.lines, address);
      if (quote.error) return fail(422, quote.error);
      const subtotal = subtotalOf(priced.lines);
      const total = subtotal + quote.cents;
      if (action === 'quote') {
        return Response.json({
          lines: priced.lines.map(({ product_id, variant_id, title, variant_title, image, quantity, unit_price }) => ({ product_id, variant_id, title, variant_title, image, quantity, unit_price })),
          subtotal, shipping: quote.cents, total,
        });
      }

      const order = await db.PodOrder.create({
        status: 'started', user_id: user?.id || null, email: address.email,
        access_token: crypto.randomUUID().replaceAll('-', ''),   // 122 random bits, short enough for PayPal's receipt
        items: priced.lines, subtotal, shipping: quote.cents, total, address,
      });
      const origin = (secrets.get('SITE_URL') || req.headers.get('origin') || '').replace(/\/+$/, '');
      const pp = await paypal('POST', '/v2/checkout/orders', paypalOrderBody(order, priced.lines, address, origin), `pod-${order.id}`);
      if (!pp.ok || !pp.data?.id) {
        const issue = issueOf(pp.data);
        console.error(`pod: PayPal create failed for order ${order.id}: ${pp.status} ${JSON.stringify(pp.data).slice(0, 500)}`);
        const addressIssue = /ADDRESS|POSTAL|ZIP|STATE|COUNTRY|ADMIN_AREA/i.test(issue);
        return fail(addressIssue ? 422 : 502, addressIssue
          ? 'PayPal could not accept this shipping address. Please check the street, city, state and ZIP code.'
          : 'Could not start PayPal checkout. Please try again.', { details: issue || pp.status });
      }
      await db.PodOrder.update(order.id, { paypal_order_id: pp.data.id });
      return Response.json({ id: pp.data.id, env, total });
    }

    if (action === 'capture') {
      if (!ready) return fail(503, 'Checkout is being upgraded. Please try again soon.');
      const orderId = String(body.order_id || '');
      if (!/^[A-Z0-9]{5,40}$/.test(orderId)) return fail(400, 'Missing order_id');
      const [order] = await db.PodOrder.filter({ paypal_order_id: orderId });
      if (!order) return fail(404, 'Order not found');
      const after = orderLink(order);
      if (order.status !== 'started') return Response.json({ status: 'paid', after });

      let result = await paypal('POST', `/v2/checkout/orders/${orderId}/capture`, {}, `pod-capture-${order.id}`);
      const issue = issueOf(result.data);
      if (!result.ok && issue === 'ORDER_ALREADY_CAPTURED') result = await paypal('GET', `/v2/checkout/orders/${orderId}`);
      if (!result.ok) {
        if (issue === 'INSTRUMENT_DECLINED') return fail(402, 'Your payment method was declined. Please choose another one.', { restart: true });
        return fail(502, 'PayPal could not complete the payment. You have not been charged.', { details: issue || result.status });
      }
      const capture = firstCapture(result.data);
      if (!capture) return fail(502, 'PayPal did not return the payment. Please contact us.');
      if (capture.custom_id && capture.custom_id !== `${POD_PREFIX}${order.id}`) return fail(409, 'Order does not match this checkout.');
      const email = result.data?.payer?.email_address || null;
      if (capture.status === 'COMPLETED') {
        const outcome = await completePodOrder(db, order, capture, email);
        if (outcome !== 'paid') return fail(409, 'The paid amount does not match this order. Please contact us.');
        return Response.json({ status: 'paid', after });
      }
      if (capture.status === 'PENDING') {
        // PayPal is still checking the payment: paypalWebhook finishes the order once it completes
        await db.PodOrder.update(order.id, { capture_id: capture.id }).catch(() => {});
        return Response.json({ status: 'pending', after });
      }
      console.error(`pod: capture ${capture.id} of order ${order.id} is ${capture.status}`);
      return fail(402, 'PayPal did not accept this payment. You have not been charged.');
    }

    // ---------- owner ----------
    if (['status', 'sync', 'orders', 'refresh', 'retry', 'webhooks'].includes(action)) {
      if (!user) return fail(401, 'Sign in required');
      if (user.role !== 'admin') return fail(403, 'Admins only');
      if (!printifyConfigured() && action !== 'orders') return fail(503, 'Chưa có PRINTIFY_API_TOKEN trong Supabase > Edge Functions > Secrets.');
    }

    if (action === 'status') {
      const shop = await shopId();
      const hooks = await printify('GET', `/shops/${shop}/webhooks.json`);
      const url = `${String(secrets.get('SUPABASE_URL') || '').replace(/\/+$/, '')}/functions/v1/printifyWebhook`;
      const mine = (Array.isArray(hooks.data) ? hooks.data : []).filter((h) => h.url === url).map((h) => h.topic);
      return Response.json({ connected: true, shop_id: shop, webhooks: mine, webhooks_ok: WEBHOOK_TOPICS.every((t) => mine.includes(t)), paypal: { configured: paypalConfigured(), env } });
    }

    if (action === 'sync') return Response.json(await syncProducts(db));

    if (action === 'orders') {
      const items = await db.PodOrder.list('-created_date', Math.min(Number(body.limit) || 100, 500));
      return Response.json({ items: items.filter((o) => o.status !== 'started' || Date.now() - new Date(o.created_date).getTime() < 3 * 86400000) });
    }

    if (action === 'refresh' || action === 'retry') {
      const order = await db.PodOrder.get(String(body.id || '')).catch(() => null);
      if (!order) return fail(404, 'Order not found');
      if (action === 'refresh') return Response.json({ order: await refreshFromPrintify(db, order) });
      if (!['paid', 'needs_attention'].includes(order.status) || !order.capture_id) {
        return fail(400, 'Chỉ gửi lại được đơn đã thanh toán mà Printify chưa nhận.');
      }
      return Response.json({ order: await submitToPrintify(db, order) });
    }

    if (action === 'webhooks') {
      const shop = await shopId();
      const url = `${String(secrets.get('SUPABASE_URL') || '').replace(/\/+$/, '')}/functions/v1/printifyWebhook`;
      const secret = await webhookSecret();
      const list = await printify('GET', `/shops/${shop}/webhooks.json`);
      if (!list.ok) throw new Error(errorOf(list));
      for (const h of (Array.isArray(list.data) ? list.data : []).filter((x) => x.url === url)) {
        await printify('DELETE', `/shops/${shop}/webhooks/${h.id}.json?host=${encodeURIComponent(new URL(url).host)}`);
      }
      const made = [];
      for (const topic of WEBHOOK_TOPICS) {
        const r = await printify('POST', `/shops/${shop}/webhooks.json`, { topic, url, secret });
        if (!r.ok) throw new Error(`${topic}: ${errorOf(r)}`);
        made.push(topic);
      }
      return Response.json({ webhooks: made });
    }

    return fail(400, 'Unknown action');
  } catch (error) {
    console.error(`podShop: ${error.message}`);
    return fail(500, error.message || 'Shop request failed');
  }
}

serve(handler);
