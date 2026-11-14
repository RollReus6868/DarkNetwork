// Printify products <-> the site's product rows, and making new Printify products from a design.
//   syncProducts        copy / refresh every product of the Printify shop (Admin > Đơn áo, tool "Đồng bộ")
//   catalogList         the four apparel categories the owner sells from, with 5 bestsellers each
//   blueprintInfo       one product type: colours, sizes, cost ("From USD"), print area (cached 7 days)
//   createFromDesign    design picture (already in the site's public bucket) -> Printify product -> site draft
// Used by podShop (admin login) and toolApi (DN Product Studio, tool token).
import { printify, shopId, errorOf, fromPrintify, guessCategory, slugify, roundUp99, DEFAULT_PRICE } from './printify.js';

// ---------------------------------------------------------------- site rows from Printify products
// One Printify product -> a new draft, or a refresh of the existing row (price, text and pictures the
// owner uploaded are kept). extra = fields for a NEW row (listing text from the tool, price).
export async function upsertFromPrintify(db, p, extra = {}, slugs = null) {
  const [mine] = await db.Product.filter({ printify_product_id: String(p.id) });
  const price = Number(mine?.price) > 0 ? Number(mine.price) : (Number(extra.price) > 0 ? Number(extra.price) : DEFAULT_PRICE);
  const fields = fromPrintify(p, price);
  if (!fields.variants.length) return { skipped: true, title: p.title };
  if (mine) {
    const oldMockups = new Set((mine.variant_images || []).map((i) => i.src));
    const ownPictures = (mine.images || []).some((src) => !oldMockups.has(src));
    const row = await db.Product.update(mine.id, {
      options: fields.options, variants: fields.variants, variant_images: fields.variant_images,
      ...(ownPictures ? {} : { images: fields.images }),   // keep pictures the owner uploaded
    });
    return { updated: true, row };
  }
  const taken = slugs || new Set((await db.Product.list()).map((r) => r.slug));
  const wanted = slugify(extra.slug || extra.title || p.title);
  let slug = wanted;
  for (let i = 2; taken.has(slug); i++) slug = `${wanted.slice(0, 74)}-${i}`;
  taken.add(slug);
  const row = await db.Product.create({
    title: extra.title || p.title,
    slug,
    category: extra.category || guessCategory(`${p.title} ${p.tags?.join(' ') || ''}`),
    description: extra.description || p.description || '',
    ...Object.fromEntries(['bible_inspiration', 'story_behind_design', 'product_info', 'size_info', 'shipping_info', 'seo_title', 'meta_description']
      .filter((k) => extra[k]).map((k) => [k, extra[k]])),
    price, status: 'draft', featured: false, sort_order: 0,
    printify_product_id: String(p.id), ...fields,
  });
  return { created: true, row };
}

export async function syncProducts(db) {
  const shop = await shopId();
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await printify('GET', `/shops/${shop}/products.json?page=${page}&limit=50`);
    if (!r.ok) throw new Error(errorOf(r));
    all.push(...(r.data?.data || []));
    if (!r.data?.last_page || page >= Number(r.data.last_page)) break;
  }
  const rows = await db.Product.list();
  const existing = rows.filter((p) => p.printify_product_id);
  const slugs = new Set(rows.map((p) => p.slug));
  const result = { created: [], updated: [], skipped: [], missing: [] };
  for (const p of all) {
    const out = await upsertFromPrintify(db, p, {}, slugs);
    if (out.skipped) result.skipped.push(p.title);
    else if (out.created) result.created.push(out.row.title);
    else result.updated.push(out.row.title);
  }
  const ids = new Set(all.map((p) => String(p.id)));
  result.missing = existing.filter((e) => !ids.has(e.printify_product_id)).map((e) => e.title);
  return result;
}

// ---------------------------------------------------------------- catalog
// The owner's four categories (14/11/2026). Printify's API has no categories or sales ranking, so
// categories are matched on the product name and "bestsellers" is a hand-picked list of the blanks
// Printify itself recommends most (its 2026 guides): edit BESTSELLERS to change them.
export const CATEGORIES = [
  { key: 'tshirts', name: 'T-shirts', site: 'Apparel',
    test: (t) => /\b(tee|t-shirt|t shirt)\b/i.test(t) && !/embroider|\(aop\)|hood|blanket|plush|teddy|towel|dress|stuffed|pet /i.test(t) },
  { key: 'hoodies', name: 'Hoodies', site: 'Apparel',
    test: (t) => /hood/i.test(t) && !/embroider|\(aop\)|blanket|towel|\btee\b|t-shirt|jacket|\bpet\b|\bdog\b/i.test(t) },
  { key: 'sweatshirts', name: 'Sweatshirts', site: 'Apparel',
    test: (t) => /sweatshirt|crewneck/i.test(t) && !/hood|embroider|\(aop\)|blanket|\btee\b|t-shirt/i.test(t) },
  // clothing only: Printify's embroidery range also has caps, beanies, blankets and bags
  { key: 'embroidery', name: 'Embroidery', site: 'Apparel',
    test: (t) => /\(embroidery\)/i.test(t) && !/\b(cap|hat|beanie|snapback|blanket|throw|towel|backpack|scarf|sweatpants|joggers?)\b/i.test(t) },
];
export const BESTSELLERS = {
  tshirts: [12, 6, 706, 145, 36],            // Bella+Canvas 3001, Gildan 5000, Comfort Colors 1717, Gildan 64000, Gildan 2000
  hoodies: [77, 1298, 1525, 175, 439],       // Gildan 18500, Comfort Colors 1567, Gildan SF500, Bella+Canvas 3719, Lane Seven LS14001
  sweatshirts: [49, 1296, 1436, 1405, 446],  // Gildan 18000, Comfort Colors 1566, Gildan SF000, Comfort Colors 1466, Lane Seven LS14004
  embroidery: [1687, 1754, 1733, 1730, 1906], // Lane Seven LS11004 crewneck, Cotton Heritage M2475 pullover, Sol's 03568 hoodie, Port Authority K500 polo, Shaka Wear tee
};
// Print providers when "Printify Choice" (99) does not make a product: US providers first.
const PROVIDER_ORDER = [99, 29, 39, 217, 410, 61, 27, 52, 50];
const MAX_VARIANTS = 100;   // Printify refuses a product with more enabled variants
const DAY = 86400000;
// A 64x64 transparent picture: the probe product that reads Printify's costs carries it, then is deleted.
const PROBE_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAJ0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAIB3A0BAAAGP8slRAAAAAElFTkSuQmCC';

async function cached(db, id, maxAge, make) {
  const row = await db.PodCache.get(id).catch(() => null);
  if (row && Date.now() - new Date(row.updated_date).getTime() < maxAge) return row.data;
  const data = await make();
  if (row) await db.PodCache.update(id, { data, updated_date: new Date().toISOString() });
  else await db.PodCache.create({ id, data }).catch(() => db.PodCache.update(id, { data, updated_date: new Date().toISOString() }));
  return data;
}

const categoryOf = (title) => CATEGORIES.find((c) => c.test(title))?.key || null;

// Base price the owner chose (14/11/2026): cost of the cheapest variant + $10 rounded up to .99;
// T-shirts never below $21.99.
export const defaultPrice = (minCost, category) => Math.max(category === 'tshirts' ? 2199 : 0, roundUp99(Number(minCost) + 1000));

export async function catalogList(db) {
  const blueprints = await cached(db, 'blueprints', DAY, async () => {
    const r = await printify('GET', '/catalog/blueprints.json');
    if (!r.ok) throw new Error(errorOf(r));
    return (Array.isArray(r.data) ? r.data : [])
      .map((b) => ({ id: b.id, title: b.title, brand: b.brand, model: b.model, image: b.images?.[0] || '' }))
      .filter((b) => categoryOf(b.title));
  });
  const known = new Map();
  for (const row of await db.PodCache.list('-updated_date', 500)) {
    if (row.id.startsWith('bp:') && row.data?.from_cost) known.set(Number(row.id.slice(3)), row.data);
  }
  return {
    categories: CATEGORIES.map((c) => {
      const items = blueprints.filter((b) => categoryOf(b.title) === c.key)
        .map((b) => ({ ...b, from_cost: known.get(b.id)?.from_cost ?? null, provider: known.get(b.id)?.provider?.title ?? null }));
      const best = BESTSELLERS[c.key].map((id) => items.find((b) => b.id === id)).filter(Boolean);
      return { key: c.key, name: c.name, bestsellers: best, all: items };
    }),
  };
}

// colour / size of a variant from its option ids, whatever order the product's options come in
function optionIndex(options) {
  const color = options.findIndex((o) => o.type === 'color');
  const size = options.findIndex((o) => o.type === 'size');
  return { color, size };
}

export async function blueprintInfo(db, id, { fresh = false } = {}) {
  id = Number(id);
  if (!(id > 0)) throw new Error('Bad blueprint id');
  const make = async () => {
    const bp = await printify('GET', `/catalog/blueprints/${id}.json`);
    if (!bp.ok) throw new Error(errorOf(bp));
    const prov = await printify('GET', `/catalog/blueprints/${id}/print_providers.json`);
    const providers = Array.isArray(prov.data) ? prov.data : [];
    if (!providers.length) throw new Error('Printify không có nhà in nào cho loại này.');
    const provider = PROVIDER_ORDER.map((pid) => providers.find((p) => p.id === pid)).find(Boolean) || providers[0];
    const vr = await printify('GET', `/catalog/blueprints/${id}/print_providers/${provider.id}/variants.json`);
    const catalogVariants = vr.data?.variants || [];
    if (!catalogVariants.length) throw new Error(errorOf(vr));
    // Printify's catalog has no prices: a short-lived draft product reads them, then is deleted
    const shop = await shopId();
    const up = await printify('POST', '/uploads/images.json', { file_name: 'dn-price-probe.png', contents: PROBE_PNG });
    if (!up.ok) throw new Error(errorOf(up));
    const first = catalogVariants[0];
    const area = (first.placeholders || []).find((p) => /front/.test(p.position)) || first.placeholders?.[0];
    const on = catalogVariants.slice(0, MAX_VARIANTS).map((v) => v.id);
    const made = await printify('POST', `/shops/${shop}/products.json`, {
      title: 'DN price check (deleted automatically)', description: 'temporary',
      blueprint_id: id, print_provider_id: provider.id,
      variants: catalogVariants.map((v) => ({ id: v.id, price: 99999, is_enabled: on.includes(v.id) })),
      print_areas: [{ variant_ids: on, placeholders: [{ position: area.position, images: [{ id: up.data.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }],
    });
    if (made.data?.id) await printify('DELETE', `/shops/${shop}/products/${made.data.id}.json`);
    if (!made.ok) throw new Error(errorOf(made));
    const options = made.data.options || [];
    const idx = optionIndex(options);
    const colorOpt = options[idx.color] || { values: [] };
    const sizeOpt = options[idx.size] || { values: [] };
    const variants = (made.data.variants || []).map((v) => [v.id, idx.color >= 0 ? v.options[idx.color] : 0, idx.size >= 0 ? v.options[idx.size] : 0, v.cost, v.is_available !== false ? 1 : 0]);
    const costs = variants.filter((v) => v[4] && v[3] > 0).map((v) => v[3]);
    const usedColors = new Set(variants.map((v) => v[1]));
    const usedSizes = new Set(variants.map((v) => v[2]));
    const positions = (first.placeholders || []).map((p) => ({ position: p.position, width: p.width, height: p.height, method: p.decoration_method }));
    const category = categoryOf(bp.data.title);
    const fromCost = costs.length ? Math.min(...costs) : null;
    return {
      id, title: bp.data.title, brand: bp.data.brand, model: bp.data.model, image: bp.data.images?.[0] || '',
      description: bp.data.description || '', category,
      provider: { id: provider.id, title: provider.title },
      from_cost: fromCost,
      default_price: fromCost ? defaultPrice(fromCost, category) : null,
      colors: (colorOpt.values || []).filter((v) => usedColors.has(v.id)).map((v) => ({ id: v.id, title: v.title, hex: v.colors?.[0] || '' })),
      sizes: (sizeOpt.values || []).filter((v) => usedSizes.has(v.id)).map((v) => ({ id: v.id, title: v.title })),
      variants,   // [id, color id, size id, cost cents, available 1/0]
      positions: positions.filter((p) => p.method !== 'dtf' || positions.length === 1),
      embroidery: positions.some((p) => p.method === 'embroidery'),
      max_variants: MAX_VARIANTS,
    };
  };
  const key = `bp:${id}`;
  if (fresh) await db.PodCache.delete(key).catch(() => {});
  return cached(db, key, 7 * DAY, make);
}

// ---------------------------------------------------------------- new product from a design
const PUBLIC = '/storage/v1/object/public/public-files/';

// input: { blueprint_id, colors: [color ids], sizes: [size ids], position, price (USD, optional),
//          design_url (site public bucket), design_name, listing: { title, description, … } }
export async function createFromDesign(db, input, { supabaseUrl, removePublicFile } = {}) {
  const info = await blueprintInfo(db, input.blueprint_id);
  const listing = input.listing || {};
  if (!String(listing.title || '').trim()) throw new Error('Thiếu tên sản phẩm (title).');
  if (!String(listing.description || '').trim()) throw new Error('Thiếu mô tả (description).');
  const url = String(input.design_url || '');
  if (!supabaseUrl || !url.startsWith(supabaseUrl + PUBLIC) || !/\.(png|jpe?g)$/i.test(url)) throw new Error('Ảnh thiết kế phải là PNG/JPG đã tải lên web.');
  const colors = new Set((input.colors || []).map(Number));
  const sizes = new Set((input.sizes || []).map(Number));
  const chosen = info.variants.filter(([, c, s, , ok]) => ok && (colors.has(c) || !info.colors.length) && (sizes.has(s) || !info.sizes.length));
  if (!chosen.length) throw new Error('Hãy chọn ít nhất một màu và một size.');
  if (chosen.length > info.max_variants) throw new Error(`Printify chỉ cho tối đa ${info.max_variants} biến thể (màu × size); đang chọn ${chosen.length}. Bớt màu hoặc size.`);
  const area = info.positions.find((p) => p.position === (input.position || '')) || info.positions.find((p) => /front/.test(p.position)) || info.positions[0];
  if (!area) throw new Error('Không tìm thấy vùng in.');

  const minCost = Math.min(...chosen.map((v) => v[3]));
  const base = Number(input.price) > 0 ? Math.round(Number(input.price) * 100) : defaultPrice(minCost, info.category);
  const priceOf = (cost) => (cost > minCost ? roundUp99(base + (cost - minCost)) : base);

  const shop = await shopId();
  const up = await printify('POST', '/uploads/images.json', { file_name: String(input.design_name || 'design.png').slice(-100), url });
  if (!up.ok || !up.data?.id) throw new Error(errorOf(up));
  // fit the whole design inside the print area, centred (scale 1 = as wide as the area)
  const w = Number(up.data.width) || 1, h = Number(up.data.height) || 1;
  const scale = Math.min(1, (area.height / area.width) / (h / w));
  const enabled = new Set(chosen.map((v) => v[0]));
  const made = await printify('POST', `/shops/${shop}/products.json`, {
    title: String(listing.title).slice(0, 200),
    description: String(listing.description),
    blueprint_id: info.id,
    print_provider_id: info.provider.id,
    variants: info.variants.map(([id, , , cost]) => ({ id, price: priceOf(cost), is_enabled: enabled.has(id) })),
    print_areas: [{ variant_ids: [...enabled], placeholders: [{ position: area.position, images: [{ id: up.data.id, x: 0.5, y: 0.5, scale: Number(scale.toFixed(4)), angle: 0 }] }] }],
  });
  if (!made.ok || !made.data?.id) throw new Error(errorOf(made));
  const out = await upsertFromPrintify(db, made.data, {
    ...listing,
    category: CATEGORIES.find((c) => c.key === info.category)?.site || 'Apparel',
    price: base / 100,
  });
  if (removePublicFile) await removePublicFile(url).catch(() => {});   // Printify keeps its own copy
  return {
    id: out.row?.id || null, created: Boolean(out.created), printify_product_id: String(made.data.id),
    price: base / 100, variants: chosen.length, mockups: (made.data.images || []).length,
  };
}
