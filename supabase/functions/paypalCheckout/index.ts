import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';
import {
  paypal, paypalEnv, paypalConfigured, money, toCents, firstCapture, issueOf, afterPaid, grantPurchase,
} from '../_shared/paypal.js';

// Ebook checkout with PayPal, driven by the PayPal buttons on the site:
//   { action: 'config' }                -> { ready, client_id, env }   (may this visitor pay with PayPal now?)
//   { action: 'create', ebook_ids }     -> { id }                      (PayPal order id for the buttons)
//   { action: 'capture', order_id }     -> { status: 'paid' | 'pending', after }
// While PAYPAL_ENV is "sandbox" only admins can buy (test money); everyone else keeps the old checkout.
const MAX_BOOKS = 50;
const fail = (status, error, extra = {}) => Response.json({ error, ...extra }, { status });

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }

    const body = await req.json().catch(() => ({}));
    const env = paypalEnv();
    const ready = paypalConfigured() && (env === 'live' || user?.role === 'admin');

    if (body?.action === 'config') {
      return Response.json(ready ? { ready, env, client_id: secrets.get('PAYPAL_CLIENT_ID') } : { ready: false, env });
    }
    if (!ready) return fail(503, 'Checkout is being upgraded. Please try again soon.');

    if (body?.action === 'create') {
      const ids = [...new Set([].concat(body.ebook_ids || body.ebook_id || []).map(String))];
      if (ids.length === 0) return fail(400, 'Missing ebook_ids');
      if (ids.length > MAX_BOOKS) return fail(400, 'Too many ebooks in one order');

      // SERVER-SIDE AUTHORITY: titles and prices come from the database, never the browser
      const ebooks = [];
      for (const id of ids) {
        const ebook = await db.Ebook.get(id).catch(() => null);
        if (!ebook) return fail(404, 'Ebook not found');
        if (ebook.status !== 'published') return fail(400, `"${ebook.title}" is not available for purchase`);
        if (!(Number(ebook.price) > 0)) return fail(400, `"${ebook.title}" has no price yet. Please contact us.`);
        ebooks.push(ebook);
      }

      const ref = crypto.randomUUID();
      // Guests have no library: this secret opens their downloads (/download?token=...)
      const guestKey = user ? null : crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      const total = ebooks.reduce((sum, e) => sum + toCents(e.price), 0);
      // the canonical address for the receipt link (the site also answers on workers.dev)
      const origin = (secrets.get('SITE_URL') || req.headers.get('origin') || '').replace(/\/+$/, '');
      const single = ebooks.length === 1;

      await db.CheckoutAttempt.create({
        id: ref, provider: 'paypal', ebook_ids: ids, total, user_id: user?.id || null, email: user?.email || null, access_token: guestKey,
      });

      const order = await paypal('POST', '/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: 'ebooks',
          custom_id: ref,
          invoice_id: ref,
          // shown on the PayPal page and in the PayPal receipt: a guest's way back to the files
          description: (guestKey && origin
            ? `Download: ${origin}/download?token=${guestKey}`
            : single ? ebooks[0].title : `${ebooks.length} ebooks from Dark Network`).slice(0, 127),
          amount: {
            currency_code: 'USD',
            value: money(total),
            breakdown: { item_total: { currency_code: 'USD', value: money(total) } },
          },
          items: ebooks.map((e) => ({
            name: String(e.title || 'Ebook').slice(0, 127),
            quantity: '1',
            unit_amount: { currency_code: 'USD', value: money(toCents(e.price)) },
            category: 'DIGITAL_GOODS',
            sku: String(e.id).slice(0, 127),
          })),
        }],
        application_context: { brand_name: 'Dark Network', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
      }, ref);

      if (!order.ok || !order.data?.id) {
        console.error(`paypal: create order failed for checkout ${ref}: ${order.status} ${JSON.stringify(order.data).slice(0, 500)}`);
        return fail(502, 'Could not start PayPal checkout. Please try again.', { details: issueOf(order.data) || order.status });
      }
      await db.CheckoutAttempt.update(ref, { order_id: order.data.id });
      return Response.json({ id: order.data.id, env });
    }

    if (body?.action === 'capture') {
      const orderId = String(body.order_id || '');
      if (!/^[A-Z0-9]{5,40}$/.test(orderId)) return fail(400, 'Missing order_id');
      const [attempt] = await db.CheckoutAttempt.filter({ order_id: orderId });
      if (!attempt) return fail(404, 'Order not found');
      if (attempt.status === 'paid') return Response.json({ status: 'paid', after: afterPaid(attempt) });

      let result = await paypal('POST', `/v2/checkout/orders/${orderId}/capture`, {}, `capture-${attempt.id}`);
      const issue = issueOf(result.data);
      if (!result.ok && issue === 'ORDER_ALREADY_CAPTURED') result = await paypal('GET', `/v2/checkout/orders/${orderId}`);
      if (!result.ok) {
        // the buyer can pick another card or funding source in the same PayPal window
        if (issue === 'INSTRUMENT_DECLINED') return fail(402, 'Your payment method was declined. Please choose another one.', { restart: true });
        return fail(502, 'PayPal could not complete the payment. You have not been charged.', { details: issue || result.status });
      }

      const capture = firstCapture(result.data);
      if (!capture) return fail(502, 'PayPal did not return the payment. Please contact us.');
      if (capture.custom_id && capture.custom_id !== attempt.id) return fail(409, 'Order does not match this checkout.');
      const email = result.data?.payer?.email_address || null;

      if (capture.status === 'COMPLETED') {
        const outcome = await grantPurchase(db, attempt, capture, email);
        if (outcome !== 'paid') return fail(409, 'The paid amount does not match this order. Please contact us.');
        return Response.json({ status: 'paid', after: afterPaid(attempt) });
      }
      if (capture.status === 'PENDING') {
        // PayPal is still checking the payment: the webhook gives the books once it completes
        await db.CheckoutAttempt.update(attempt.id, { capture_id: capture.id, email: email || attempt.email }).catch(() => {});
        return Response.json({ status: 'pending', after: afterPaid(attempt) });
      }
      console.error(`paypal: capture ${capture.id} of checkout ${attempt.id} is ${capture.status}`);
      await db.CheckoutAttempt.update(attempt.id, { capture_id: capture.id }).catch(() => {});
      return fail(402, 'PayPal did not accept this payment. You have not been charged.');
    }

    return fail(400, 'Unknown action');
  } catch (error) {
    return fail(500, error.message || 'Checkout failed');
  }
}

serve(handler);
