import { createClientFromRequest, serve } from '../_shared/backend.js';
import { signatureValid } from '../_shared/printify.js';
import { siteStatusFor } from '../_shared/pod.js';
import { notifyOwner, inBackground } from '../_shared/push.js';

// Printify webhooks (connected from Admin > Đơn áo > "Kết nối webhook", which registers this URL):
//   order:updated              new Printify status (in production, canceled, has issues, …)
//   order:sent-to-production   printing started
//   order:shipment:created     shipped: carrier + tracking number + link
//   order:shipment:delivered   delivered
// Every request must carry X-Pfy-Signature = sha256=HMAC(secret, raw body); see _shared/printify.js.
async function handler(req) {
  try {
    const raw = await req.text();
    if (!(await signatureValid(raw, req.headers.get('x-pfy-signature')))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
    let event;
    try { event = JSON.parse(raw); } catch { return Response.json({ error: 'Bad JSON' }, { status: 400 }); }
    const type = String(event?.type || '');
    const resource = event?.resource || {};
    if (resource.type && resource.type !== 'order') return Response.json({ received: true, ignored: type });

    const db = createClientFromRequest(req).asServiceRole.entities;
    const [order] = await db.PodOrder.filter({ printify_order_id: String(resource.id || '') });
    if (!order) return Response.json({ received: true, note: 'unknown order' });
    const data = resource.data || {};
    const moneyBack = ['refunded', 'partially_refunded'].includes(order.status);
    const change = {};

    if (type === 'order:updated' || type === 'order:sent-to-production') {
      const printifyStatus = type === 'order:sent-to-production' ? 'in-production' : data.status;
      if (printifyStatus) change.printify_status = printifyStatus;
      const status = siteStatusFor(printifyStatus, order.status);
      if (status && !moneyBack) change.status = status;
      if (status === 'needs_attention' && order.status !== 'needs_attention') {
        change.note = `Printify báo trạng thái "${printifyStatus}". Mở Printify > Orders để xem.`;
        await inBackground(notifyOwner(db, {
          title: 'Đơn áo cần xử lý',
          body: `Printify: ${printifyStatus} · đơn ${order.id.slice(0, 8)}`,
          url: '/admin?tab=pod',
          tag: `pod-issue-${order.id}`,
        }));
      }
      if (status === 'canceled' && order.status !== 'canceled') {
        await inBackground(notifyOwner(db, {
          title: 'Đơn áo bị huỷ ở Printify',
          body: `Đơn ${order.id.slice(0, 8)} · nhớ hoàn tiền PayPal cho khách nếu cần`,
          url: '/admin?tab=pod',
          tag: `pod-cancel-${order.id}`,
        }));
      }
    }

    if (type === 'order:shipment:created' || type === 'order:shipment:delivered') {
      const c = data.carrier || {};
      const shipments = [...(order.shipments || [])];
      const i = shipments.findIndex((s) => s.number && s.number === c.tracking_number);
      const entry = {
        ...(i >= 0 ? shipments[i] : {}),
        carrier: c.code || shipments[i]?.carrier || '',
        number: c.tracking_number || shipments[i]?.number || '',
        url: c.tracking_url || shipments[i]?.url || '',
        ...(data.shipped_at ? { shipped_at: data.shipped_at } : {}),
        ...(data.delivered_at ? { delivered_at: data.delivered_at } : {}),
      };
      if (i >= 0) shipments[i] = entry; else shipments.push(entry);
      change.shipments = shipments;
      if (!moneyBack) {
        const allDelivered = shipments.length > 0 && shipments.every((s) => s.delivered_at);
        change.status = type === 'order:shipment:delivered' && allDelivered ? 'delivered' : (order.status === 'delivered' ? 'delivered' : 'shipped');
      }
    }

    if (Object.keys(change).length) await db.PodOrder.update(order.id, change);
    return Response.json({ received: true, status: change.status || order.status });
  } catch (error) {
    console.error(`printifyWebhook: ${error.message}`);
    return Response.json({ error: error.message || 'Webhook failed' }, { status: 500 });
  }
}

serve(handler);
