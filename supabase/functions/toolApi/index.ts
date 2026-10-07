import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

// Entry point for the desktop tool "DN Product Studio".
// The tool sends the secret TOOL_API_TOKEN in the X-Tool-Token header.
// It can: check the connection, read the orders and the visit counter, list records, get a one-time upload address, re-attach the PDF
// of a book copied from the old site, and create or update an Ebook / Product. New records are ALWAYS drafts; the tool can never
// publish, unpublish or delete anything.

const FIELDS = {
  Ebook: ['title', 'slug', 'subtitle', 'description', 'price', 'cover_image', 'what_you_learn', 'who_for',
    'secure_file_uri', 'lemon_squeezy_variant_id', 'faq', 'seo_title', 'meta_description'],
  Product: ['title', 'slug', 'category', 'price', 'images', 'description', 'bible_inspiration',
    'story_behind_design', 'product_info', 'shipping_info', 'spring_url', 'seo_title', 'meta_description'],
};
const REQUIRED = {
  Ebook: ['title', 'slug', 'description', 'price', 'cover_image'],
  Product: ['title', 'slug', 'category', 'price', 'images', 'description', 'spring_url'],
};

// Constant-time comparison so the token cannot be guessed from response timing.
function sameToken(given, expected) {
  if (!given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Text written through the API can carry non-breaking spaces that stop paragraphs from wrapping.
function clean(value) {
  if (typeof value === 'string') return value.replace(/&nbsp;|\u00a0/g, ' ');
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

async function handler(req) {
  try {
    const expected = secrets.get('TOOL_API_TOKEN');
    if (!expected || expected.length < 24) {
      return Response.json({ error: 'TOOL_API_TOKEN is not set on the site (Dashboard > Secrets).' }, { status: 500 });
    }
    if (!sameToken(req.headers.get('x-tool-token') || '', expected)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClientFromRequest(req).asServiceRole;

    const body = await req.json();
    if (body?.action === 'ping') return Response.json({ ok: true, site: 'Dark Network' });

    // ---- files go straight to storage: covers / product photos public, ebook PDFs private
    if (body?.action === 'upload_url') {
      const name = String(body.name || '');
      if (!/\.(pdf|jpe?g|png|webp)$/i.test(name)) return Response.json({ error: 'Only pdf, jpg, png, webp' }, { status: 400 });
      return Response.json(await db.integrations.Core.CreateUploadUrl({ name, isPrivate: body.private === true }));
    }

    // ---- ebooks copied from the old site still point at PDFs that were not copied.
    // The old address ends with the original file name, which is how a re-upload finds its book.
    const oldName = (uri) => (String(uri || '').match(/^mp\/private\/[^/]+\/[0-9a-f]+_(.+)$/) || [])[1];
    if (body?.action === 'pending_pdfs') {
      const rows = await db.entities.Ebook.list('sort_order', 500);
      return Response.json({ items: rows.filter((r) => oldName(r.secure_file_uri)).map((r) => ({ title: r.title, file_name: oldName(r.secure_file_uri) })) });
    }
    if (body?.action === 'attach_pdf') {
      const want = String(body.file_name || '').toLowerCase();
      if (!want || !/^[0-9a-f]{8}_[A-Za-z0-9._-]+\.pdf$/i.test(String(body.file_uri || ''))) return Response.json({ error: 'Bad file' }, { status: 400 });
      const rows = (await db.entities.Ebook.list('sort_order', 500)).filter((r) => (oldName(r.secure_file_uri) || '').toLowerCase() === want);
      for (const row of rows) await db.entities.Ebook.update(row.id, { secure_file_uri: body.file_uri });
      return Response.json({ attached: rows.map((r) => r.title) });
    }

    // ---- read-only: orders (one row per order, a cart order lists all its books) and visits
    if (body?.action === 'orders') {
      const rows = await db.entities.EbookPurchase.list('-created_date', 1000);
      const titles = Object.fromEntries((await db.entities.Ebook.list('sort_order', 1000)).map((e) => [e.id, e.title]));
      const orders = new Map();
      for (const r of rows) {
        const key = r.provider_order_id || r.id;
        const order = orders.get(key) || { order_id: key, date: r.purchase_date || r.created_date, email: r.customer_email || '',
          status: r.payment_status || '', currency: r.currency || 'USD', buyer: 'guest', total: 0, items: [] };
        order.total += Number(r.amount) || 0;   // cents
        order.items.push(titles[r.ebook_id] || 'Ebook đã xoá');
        if (r.user_id) order.buyer = 'account';
        orders.set(key, order);
      }
      return Response.json({ items: [...orders.values()] });
    }
    if (body?.action === 'traffic') {
      const [summary] = await db.entities.TrafficSummary.list();
      return Response.json({
        summary: summary || {},
        days: await db.entities.TrafficDaily.list('day', 40),
        pages: await db.entities.TrafficPage.list('-views', 10),
      });
    }

    const entity = body?.entity;
    if (!FIELDS[entity]) return Response.json({ error: 'Unknown entity' }, { status: 400 });
    const table = db.entities[entity];

    if (body.action === 'list') {
      const rows = await table.list('-created_date', 500);
      return Response.json({ items: rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status })) });
    }

    if (body.action === 'upsert') {
      const data = {};
      for (const key of FIELDS[entity]) {
        if (body.data?.[key] !== undefined) data[key] = clean(body.data[key]);
      }
      if (!data.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
        return Response.json({ error: 'Invalid slug' }, { status: 400 });
      }

      // 1) the record this tool created earlier, 2) otherwise a record with the same address
      let target = null;
      if (body.id) {
        try { target = await table.get(body.id); } catch { target = null; }
      }
      if (!target) {
        const same = await table.filter({ slug: data.slug });
        if (same.length > 0) {
          if (!body.overwrite) {
            return Response.json({ error: `Trên web đã có “${same[0].title}” với đường dẫn ${data.slug}.` }, { status: 409 });
          }
          target = same[0];
        }
      }

      if (target) {
        // status is never touched: a published product stays published, a draft stays a draft
        await table.update(target.id, data);
        return Response.json({ id: target.id, created: false, status: target.status });
      }

      const missing = REQUIRED[entity].filter((key) => isEmpty(data[key]));
      if (missing.length) return Response.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
      const created = await table.create({ ...data, status: 'draft' });
      return Response.json({ id: created.id, created: true, status: 'draft' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'toolApi failed' }, { status: 500 });
  }
}

serve(handler);
