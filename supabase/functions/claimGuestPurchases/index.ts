import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find guest purchases (user_id is null) with matching customer_email
    // Only claim paid purchases — refunded/failed purchases should not be linked
    const guestPurchases = await base44.asServiceRole.entities.EbookPurchase.filter({
      customer_email: user.email,
      payment_status: 'paid'
    });

    let claimed = 0;
    for (const purchase of guestPurchases) {
      // Only claim purchases that don't already have a user_id
      if (!purchase.user_id) {
        await base44.asServiceRole.entities.EbookPurchase.update(purchase.id, {
          user_id: user.id
        });
        claimed++;
      }
    }

    return Response.json({ claimed });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to claim purchases' }, { status: 500 });
  }
}

serve(handler);
