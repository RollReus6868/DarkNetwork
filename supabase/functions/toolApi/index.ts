import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

// Entry point for the desktop tool "DN Product Studio".
// The tool sends the secret TOOL_API_TOKEN in the X-Tool-Token header.
// It can: check the connection, list records, upload a file, and create or
// update an Ebook / Product. New records are ALWAYS drafts; the tool can never
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
  if (typeof value === 'string') return value.replace(/&nbsp;| /g, ' ');
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

    // ---- file upload (multipart): cover / product photos are public, ebook PDFs are private
    if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return Response.json({ error: 'Missing file' }, { status: 400 });
      if (form.get('private') === '1') {
        const { file_uri } = await db.integrations.Core.UploadPrivateFile({ file });
        return Response.json({ file_uri });
      }
      const { file_url } = await db.integrations.Core.UploadPublicFile({ file });
      return Response.json({ file_url });
    }

    const body = await req.json();
    if (body?.action === 'ping') return Response.json({ ok: true, site: 'Dark Network' });

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
