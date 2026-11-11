// PayPal (Orders API v2) for ebook sales: paypalCheckout creates and captures orders,
// paypalWebhook handles refunds, reversals and late completions. Prices, titles and who gets
// which book always come from this site's database and checkout_attempt, never from the browser.
//
// Secrets (Supabase > Edge Functions > Secrets, typed in by the owner):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET   from developer.paypal.com > Apps & Credentials
//   PAYPAL_ENV                               "sandbox" (default: test money, only admins can buy) or "live"
//   PAYPAL_WEBHOOK_ID                        id of the webhook created in that app (refunds)
//   PAYPAL_API_URL                           tests only: a stand-in PayPal API
import { secrets } from './backend.js';
import { notifyOwner, inBackground } from './push.js';

// Keys are pasted by hand into Supabase: ignore spaces, line breaks and quotes around them.
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
export const paypalEnv = () => (clean(secrets.get('PAYPAL_ENV')).toLowerCase() === 'live' ? 'live' : 'sandbox');
export const paypalClientId = () => clean(secrets.get('PAYPAL_CLIENT_ID'));
export const paypalConfigured = () => Boolean(paypalClientId() && clean(secrets.get('PAYPAL_CLIENT_SECRET')));
const BASE = { live: 'https://api-m.paypal.com', sandbox: 'https://api-m.sandbox.paypal.com' };
const API = () => secrets.get('PAYPAL_API_URL') || BASE[paypalEnv()];

export const money = (cents) => (Math.round(Number(cents) || 0) / 100).toFixed(2);
export const toCents = (value) => Math.round(Number(value) * 100);

let cachedToken = null;   // { value, expires }

const requestToken = (base) => fetch(`${base}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${btoa(`${paypalClientId()}:${clean(secrets.get('PAYPAL_CLIENT_SECRET'))}`)}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const res = await requestToken(API());
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // The usual mistake: Live keys with PAYPAL_ENV=sandbox (or the reverse). Ask the other side to say so.
    let hint = 'Check that PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET come from the same app.';
    if (res.status === 401 && !secrets.get('PAYPAL_API_URL')) {
      const other = paypalEnv() === 'live' ? 'sandbox' : 'live';
      const probe = await requestToken(BASE[other]).catch(() => null);
      if (probe?.ok) hint = `These are ${other.toUpperCase()} keys: set PAYPAL_ENV=${other}, or paste the ${paypalEnv().toUpperCase()} keys.`;
    }
    console.error(`paypal: sign-in failed in ${paypalEnv()} (${res.status} ${data.error || ''}); client id ${paypalClientId().slice(0, 6)}… length ${paypalClientId().length}; ${hint}`);
    throw new Error(`PayPal sign-in failed (${res.status}${data.error ? `: ${data.error}` : ''}, ${paypalEnv()} mode). ${hint}`);
  }
  cachedToken = { value: data.access_token, expires: Date.now() + Number(data.expires_in || 300) * 1000 };
  return cachedToken.value;
}

// -> { ok, status, data }
export async function paypal(method, path, body, requestId) {
  const res = await fetch(`${API()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const firstCapture = (order) => order?.purchase_units?.[0]?.payments?.captures?.[0] || null;
export const issueOf = (data) => data?.details?.[0]?.issue || data?.name || '';

// Where the buyer goes once paid: their library, or the guest download page (its secret key).
export const afterPaid = (attempt) => (attempt.user_id ? '/account' : `/download?token=${attempt.access_token}`);

// checkout_attempt.status stays one of started | paid | refunded | partially_refunded (the owner's
// statistics read it): a declined, failed or pending payment stays "started"; details go to the logs.

// Give the buyer their books for a completed capture. Safe to call twice (browser + webhook).
// -> 'paid' | 'mismatch'
export async function grantPurchase(db, attempt, capture, payerEmail) {
  const amount = capture?.amount || {};
  if (amount.currency_code !== 'USD' || toCents(amount.value) !== Number(attempt.total)) {
    console.error(`paypal: amount mismatch on checkout ${attempt.id}: got ${amount.value} ${amount.currency_code}, expected ${money(attempt.total)} USD`);
    await db.CheckoutAttempt.update(attempt.id, { capture_id: capture?.id || null }).catch(() => {});
    return 'mismatch';
  }

  const ids = attempt.ebook_ids || [];
  const email = payerEmail || attempt.email || null;
  let isNew = false;
  const titles = [];
  for (const ebookId of ids) {
    const ebook = await db.Ebook.get(ebookId).catch(() => null);
    titles.push(ebook?.title || 'Ebook');
    // a single book carries the whole total; in a cart order each row records its own price
    const rowAmount = ids.length === 1 ? Number(attempt.total) : (ebook ? toCents(ebook.price) : null);
    const [existing] = await db.EbookPurchase.filter({ provider: 'paypal', provider_order_id: attempt.order_id, ebook_id: ebookId });
    const row = {
      payment_status: 'paid',
      download_access: true,
      customer_email: email,
      amount: rowAmount,
      currency: 'USD',
    };
    if (existing) {
      await db.EbookPurchase.update(existing.id, { ...row, user_id: existing.user_id || attempt.user_id || null });
    } else {
      isNew = true;
      await db.EbookPurchase.create({
        ...row,
        user_id: attempt.user_id || null,
        ebook_id: ebookId,
        provider: 'paypal',
        provider_order_id: attempt.order_id,
        provider_variant_id: capture?.id || '',
        access_token: attempt.access_token || null,
        purchase_date: new Date().toISOString(),
      });
    }
  }

  await db.CheckoutAttempt.update(attempt.id, {
    status: 'paid', capture_id: capture?.id || null, email, paid_date: new Date().toISOString(),
  }).catch(() => {});

  if (isNew) {
    await inBackground(notifyOwner(db, {
      title: `Đơn hàng mới · $${money(attempt.total)}`,
      body: `${titles.join(', ')}${email ? ` · ${email}` : ''}`,
      url: '/studio/?tab=orders',
      tag: `order-${attempt.order_id}`,
    }));
  }
  return 'paid';
}

// A refund or reversal of a capture: mark the order, and take the download away when it is full.
export async function refundCapture(db, captureId, fullyRefunded) {
  const [attempt] = await db.CheckoutAttempt.filter({ capture_id: captureId });
  if (!attempt) return 0;
  const status = fullyRefunded ? 'refunded' : 'partially_refunded';
  const purchases = await db.EbookPurchase.filter({ provider: 'paypal', provider_order_id: attempt.order_id });
  for (const p of purchases) {
    await db.EbookPurchase.update(p.id, { payment_status: status, download_access: fullyRefunded ? false : p.download_access });
  }
  await db.CheckoutAttempt.update(attempt.id, { status });
  return purchases.length;
}
