import { createClientFromRequest, serve } from '../_shared/backend.js';

// Moves a guest order into the signed-in buyer's library. Proof of ownership is the secret
// token from the receipt link, never the email address (emails are not verified at sign-up).
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' && body.token.length >= 32 ? body.token : null;
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 });

    const purchases = await base44.asServiceRole.entities.EbookPurchase.filter({ access_token: token, payment_status: 'paid' });
    let claimed = 0;
    for (const purchase of purchases) {
      if (purchase.user_id) continue;
      await base44.asServiceRole.entities.EbookPurchase.update(purchase.id, { user_id: user.id });
      claimed++;
    }

    return Response.json({ claimed });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to claim purchases' }, { status: 500 });
  }
}

serve(handler);
