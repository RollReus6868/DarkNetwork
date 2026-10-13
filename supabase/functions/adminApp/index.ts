import { createClientFromRequest, serve } from '../_shared/backend.js';
import { ordersList } from '../_shared/stats.js';
import { sendPush, vapidKeys } from '../_shared/push.js';

// The owner's phone app (/studio): signed-in admins only. Orders, statistics (the same numbers as the
// desktop tool) and phone notifications. The chat itself goes through chatAdmin.
const text = (v, max) => String(v ?? '').slice(0, max);

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'orders') return Response.json({ items: await ordersList(db.entities) });
    if (action === 'analytics') {
      const days = [7, 28, 90].includes(Number(body.days)) ? Number(body.days) : 7;
      return Response.json(await db.rpc('tool_analytics', { p_days: days }));
    }

    // ---- notifications: this phone's subscription
    if (action === 'push_key') return Response.json({ public_key: (await vapidKeys(db.entities)).publicKey });
    const endpoint = text(body.endpoint || body.subscription?.endpoint, 1000);
    if (action === 'push_subscribe') {
      const keys = body.subscription?.keys || {};
      // push services are https; 127.0.0.1 is the stand-in push service of tools/local-stack
      if (!/^(https:\/\/|http:\/\/127\.0\.0\.1:)/.test(endpoint) || !keys.p256dh || !keys.auth) return Response.json({ error: 'Bad subscription' }, { status: 400 });
      const row = { endpoint, p256dh: text(keys.p256dh, 200), auth: text(keys.auth, 100), user_id: user.id, orders_seen: body.orders_seen || null };
      const [old] = await db.entities.PushSubscription.filter({ endpoint });
      if (old) await db.entities.PushSubscription.update(old.id, row);
      else await db.entities.PushSubscription.create(row);
      return Response.json({ ok: true });
    }
    const [sub] = endpoint ? await db.entities.PushSubscription.filter({ endpoint }) : [];
    if (action === 'push_unsubscribe') {
      if (sub) await db.entities.PushSubscription.delete(sub.id);
      return Response.json({ ok: true });
    }
    if (action === 'seen') {   // the phone opened Orders: its icon number no longer counts those orders
      if (sub && body.orders_seen) await db.entities.PushSubscription.update(sub.id, { orders_seen: body.orders_seen });
      return Response.json({ ok: true });
    }
    if (action === 'push_test') {
      if (!sub) return Response.json({ error: 'Điện thoại này chưa bật thông báo.' }, { status: 400 });
      const status = await sendPush(sub, { title: 'Dark Network', body: 'Thông báo đã hoạt động trên điện thoại này.', url: '/studio/', tag: 'test' }, await vapidKeys(db.entities));
      if (status === 404 || status === 410) await db.entities.PushSubscription.delete(sub.id);
      return Response.json({ ok: status < 300, status });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'adminApp failed' }, { status: 500 });
  }
}

serve(handler);
