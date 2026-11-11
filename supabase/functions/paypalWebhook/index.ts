import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';
import { paypal, grantPurchase, refundCapture } from '../_shared/paypal.js';

// PayPal webhook (developer.paypal.com > the app > Webhooks, URL .../functions/v1/paypalWebhook):
//   PAYMENT.CAPTURE.COMPLETED  books for a payment that finished after the buyer left (or was pending)
//   PAYMENT.CAPTURE.REFUNDED   full refund -> no more downloads; partial refund -> marked only
//   PAYMENT.CAPTURE.REVERSED   chargeback -> like a full refund
//   PAYMENT.CAPTURE.DENIED     logged (the checkout stays unpaid)
// Every event is checked with PayPal's verify-webhook-signature API before anything changes.
const HEADERS = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time'];

async function verified(req, event) {
  const webhookId = secrets.get('PAYPAL_WEBHOOK_ID');
  if (!webhookId) return false;
  const h = Object.fromEntries(HEADERS.map((k) => [k, req.headers.get(k) || '']));
  if (HEADERS.some((k) => !h[k])) return false;
  const res = await paypal('POST', '/v1/notifications/verify-webhook-signature', {
    auth_algo: h['paypal-auth-algo'],
    cert_url: h['paypal-cert-url'],
    transmission_id: h['paypal-transmission-id'],
    transmission_sig: h['paypal-transmission-sig'],
    transmission_time: h['paypal-transmission-time'],
    webhook_id: webhookId,
    webhook_event: event,
  });
  return res.ok && res.data?.verification_status === 'SUCCESS';
}

const captureIdOf = (resource) =>
  (resource?.links || []).find((l) => l.rel === 'up' && /\/captures\//.test(l.href || ''))?.href.split('/captures/')[1]?.split(/[/?]/)[0] || null;

async function handler(req) {
  try {
    const raw = await req.text();
    let event;
    try { event = JSON.parse(raw); } catch { return Response.json({ error: 'Bad JSON' }, { status: 400 }); }
    if (!secrets.get('PAYPAL_WEBHOOK_ID')) return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    if (!(await verified(req, event))) return Response.json({ error: 'Invalid signature' }, { status: 401 });

    const db = createClientFromRequest(req).asServiceRole.entities;
    const type = event?.event_type;
    const resource = event?.resource || {};

    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const attempt = resource.custom_id ? await db.CheckoutAttempt.get(String(resource.custom_id)).catch(() => null) : null;
      if (!attempt) return Response.json({ received: true, note: 'unknown checkout' });
      if (attempt.status === 'paid') return Response.json({ received: true, status: 'paid' });
      const order = await paypal('GET', `/v2/checkout/orders/${attempt.order_id}`);
      const outcome = await grantPurchase(db, attempt, resource, order.data?.payer?.email_address || null);
      return Response.json({ received: true, status: outcome });
    }

    if (type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED') {
      // REFUNDED carries the refund (its "up" link is the capture); REVERSED carries the capture itself
      const captureId = type === 'PAYMENT.CAPTURE.REVERSED' ? resource.id : captureIdOf(resource);
      if (!captureId) return Response.json({ received: true, note: 'no capture id' });
      let full = type === 'PAYMENT.CAPTURE.REVERSED';
      if (!full) {
        const capture = await paypal('GET', `/v2/payments/captures/${captureId}`);
        full = capture.data?.status === 'REFUNDED';
      }
      const updated = await refundCapture(db, captureId, full);
      return Response.json({ received: true, updated });
    }

    if (type === 'PAYMENT.CAPTURE.DENIED') {
      console.error(`paypal: capture ${resource.id} denied (checkout ${resource.custom_id})`);
      return Response.json({ received: true });
    }

    return Response.json({ received: true, event: type });
  } catch (error) {
    return Response.json({ error: error.message || 'Webhook failed' }, { status: 500 });
  }
}

serve(handler);
