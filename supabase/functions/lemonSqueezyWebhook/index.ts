import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

// Verify Lemon Squeezy webhook signature using HMAC-SHA256
// Uses the RAW request body and X-Signature header
async function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

async function handler(req) {
  try {
    // Read the RAW body — do not parse before signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('X-Signature') || '';
    const webhookSecret = secrets.get('LEMON_SQUEEZY_WEBHOOK_SECRET');

    if (!webhookSecret) return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });

    // Verify signature using the raw body
    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 });

    // Now safe to parse the body
    const body = JSON.parse(rawBody);
    const eventName = body?.meta?.event_name;
    const orderData = body?.data;

    const base44 = createClientFromRequest(req);

    if (eventName === 'order_created') {
      const status = orderData?.attributes?.status;
      // Only grant access for confirmed paid orders
      if (status !== 'paid') return Response.json({ received: true, status });

      const orderId = String(orderData?.id);
      const customerEmail = orderData?.attributes?.user_email;
      const amount = orderData?.attributes?.total;
      const currency = orderData?.attributes?.currency || 'USD';
      // Lemon Squeezy sends the checkout's custom data in meta.custom_data
      const customData = body?.meta?.custom_data || orderData?.attributes?.custom_data || {};
      const ebookId = customData.ebook_id;
      const userId = customData.user_id && customData.user_id !== 'guest' ? customData.user_id : null;
      const variantId = orderData?.attributes?.first_order_item?.variant_id;

      if (!ebookId) return Response.json({ received: true, note: 'No ebook_id in custom data' });

      // IDEMPOTENCY CHECK: check if a purchase already exists for this provider + order + ebook
      const existing = await base44.asServiceRole.entities.EbookPurchase.filter({
        provider: 'lemon_squeezy',
        provider_order_id: orderId,
        ebook_id: ebookId
      });

      if (existing && existing.length > 0) {
        // Update existing record instead of creating a duplicate
        await base44.asServiceRole.entities.EbookPurchase.update(existing[0].id, {
          payment_status: 'paid',
          download_access: true,
          customer_email: customerEmail,
          amount: amount,
          currency: currency,
          user_id: userId || existing[0].user_id
        });
      } else {
        // Create new purchase record
        await base44.asServiceRole.entities.EbookPurchase.create({
          user_id: userId,
          ebook_id: ebookId,
          provider: 'lemon_squeezy',
          provider_order_id: orderId,
          provider_variant_id: variantId ? String(variantId) : '',
          customer_email: customerEmail,
          amount: amount,
          currency: currency,
          payment_status: 'paid',
          download_access: true,
          purchase_date: new Date().toISOString()
        });
      }

      return Response.json({ received: true, event: eventName, status: 'paid' });
    }

    if (eventName === 'order_refunded') {
      const orderId = String(orderData?.id);
      const refundStatus = orderData?.attributes?.status; // 'refunded' or 'partially_refunded'

      // Find all purchases matching this order
      const purchases = await base44.asServiceRole.entities.EbookPurchase.filter({
        provider: 'lemon_squeezy',
        provider_order_id: orderId
      });

      for (const purchase of purchases) {
        const isFullRefund = refundStatus === 'refunded';
        await base44.asServiceRole.entities.EbookPurchase.update(purchase.id, {
          payment_status: refundStatus === 'refunded' ? 'refunded' : 'partially_refunded',
          download_access: isFullRefund ? false : purchase.download_access
        });
      }

      return Response.json({ received: true, event: eventName, updated: purchases.length });
    }

    // Acknowledge other events to prevent retries
    return Response.json({ received: true, event: eventName });
  } catch (error) {
    return Response.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}

serve(handler);
