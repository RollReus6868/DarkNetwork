import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

// One-time move of the public content (books, products, studies, videos, slides…) and its
// images from the old Base44 app into this project. Protected by a one-time key (see below).
// Safe to run again: records keep their ids, already copied images are skipped.
// Delete this function once the move is done.

const ENTITIES = ['BibleStudy', 'BlogPost', 'Ebook', 'FreeResource', 'HeroSlide', 'MembershipStat', 'Product',
  'SiteContent', 'Testimonial', 'Video'];
const DROP = ['created_by', 'is_sample', 'app_id', 'entity_name'];
const OLD_FILE = /https:\/\/(?:media\.base44\.com\/images\/public|(?:app\.)?base44\.app\/api\/apps\/[a-f0-9]+\/files\/(?:mp\/)?public)\/[^\s"'<>)\\]+/g;

async function handler(req) {
  try {
    const api = secrets.get('BASE44_API_URL') || 'https://base44.app';
    const appId = secrets.get('BASE44_APP_ID') || '6aa80a3918e73ce9a7b4d0f7';
    const base44 = createClientFromRequest(req).asServiceRole;

    // The key lives in the table import_key (no access rules = service role only). Dropping
    // that table switches this function off for good.
    const given = req.headers.get('x-import-key') || '';
    const keys = await base44.entities.ImportKey.list().catch(() => []);
    if (given.length < 24 || !keys.some((k) => k.key === given)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    // copy one old image into public storage -> its new address
    const copy = async (url) => {
      const origin = secrets.get('BASE44_FILE_ORIGIN');   // tests only: where to fetch old files from
      const res = await fetch(origin ? url.replace(/^https:\/\/[^/]+/, origin) : url);
      if (!res.ok) throw new Error(`could not fetch ${url} (HTTP ${res.status})`);
      const name = decodeURIComponent(url.split('/').pop().split('?')[0]);
      const file = new File([await res.arrayBuffer()], name, { type: res.headers.get('content-type') || '' });
      return (await base44.integrations.Core.UploadPublicFile({ file })).file_url;
    };

    if (body.action === 'copy') return Response.json({ url: await copy(String(body.url)) });

    if (!ENTITIES.includes(body.entity)) return Response.json({ error: 'Unknown entity' }, { status: 400 });
    const table = base44.entities[body.entity];

    // 1) records, with their original ids and dates
    if (body.action === 'records') {
      const res = await fetch(`${api}/api/apps/${appId}/entities/${body.entity}?limit=500&sort=created_date`, { headers: { 'X-App-Id': appId } });
      if (!res.ok) return Response.json({ error: `Base44 answered HTTP ${res.status}`, detail: (await res.text()).slice(0, 300) }, { status: 502 });
      const rows = await res.json();
      const existing = new Set((await table.list('created_date', 1000)).map((r) => r.id));
      let created = 0, updated = 0;
      for (const row of rows) {
        const data = Object.fromEntries(Object.entries(row).filter(([k]) => !DROP.includes(k)));
        if (existing.has(row.id)) { await table.update(row.id, data); updated++; } else { await table.create(data); created++; }
      }
      return Response.json({ entity: body.entity, found: rows.length, created, updated });
    }

    // 2) images: a few records per call so one call never runs too long
    if (body.action === 'files') {
      const limit = Math.min(Number(body.limit) || 3, 10);
      const pending = (await table.list('created_date', 1000)).filter((r) => JSON.stringify(r).match(OLD_FILE));
      let copied = 0;
      for (const row of pending.slice(0, limit)) {
        let text = JSON.stringify(row);
        for (const url of new Set(text.match(OLD_FILE))) {
          text = text.split(url).join(await copy(url));
          copied++;
        }
        const { id, created_date: _c, updated_date: _u, ...data } = JSON.parse(text);
        await table.update(id, data);
      }
      return Response.json({ entity: body.entity, copied, remaining: Math.max(pending.length - limit, 0) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'import failed' }, { status: 500 });
  }
}

serve(handler);
