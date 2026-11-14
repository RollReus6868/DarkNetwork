// Printify REST API (print on demand). Used by podShop (sync, shipping quote, orders) and
// printifyWebhook. The site sells and takes payment itself; Printify prints and ships.
//
// Secrets (Supabase > Edge Functions > Secrets, typed in by the owner):
//   PRINTIFY_API_TOKEN   Printify > My Profile > Connections > Personal access token
//   PRINTIFY_SHOP_ID     optional: which Printify shop (default: the shop connected through "API")
//   PRINTIFY_API_URL     tests only: a stand-in Printify API
import { secrets } from './backend.js';

const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
const API = () => (secrets.get('PRINTIFY_API_URL') || 'https://api.printify.com').replace(/\/+$/, '');
const token = () => clean(secrets.get('PRINTIFY_API_TOKEN'));
export const printifyConfigured = () => Boolean(token());

// -> { ok, status, data }
export async function printify(method, path, body) {
  const res = await fetch(`${API()}/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'User-Agent': 'DarkNetwork-site/1.0',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 300) }; }
  return { ok: res.ok, status: res.status, data };
}

export const errorOf = (r) => {
  const d = r?.data || {};
  const reason = d.errors?.reason || d.error || d.message || '';
  const extra = d.errors && typeof d.errors === 'object' ? JSON.stringify(d.errors).slice(0, 300) : '';
  return `Printify ${r?.status}: ${reason}${extra && !String(reason).includes(extra) ? ` ${extra}` : ''}`.trim();
};

let cachedShop = null;
// The shop orders go to: PRINTIFY_SHOP_ID, else the one connected "via API", else the only shop.
export async function shopId() {
  const fixed = clean(secrets.get('PRINTIFY_SHOP_ID'));
  if (fixed) return fixed;
  if (cachedShop) return cachedShop;
  const r = await printify('GET', '/shops.json');
  if (!r.ok) throw new Error(errorOf(r));
  const shops = Array.isArray(r.data) ? r.data : [];
  const shop = shops.find((s) => s.sales_channel === 'custom_integration') || (shops.length === 1 ? shops[0] : null);
  if (!shop) throw new Error('No Printify shop is connected through "API". In Printify: Manage my stores > Connect > API.');
  cachedShop = String(shop.id);
  return cachedShop;
}

// The secret Printify signs its webhooks with. Derived from the API token, so nothing extra is
// stored; after a new token the owner presses "Kết nối webhook" again.
export async function webhookSecret() {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('dn-printify-webhook'));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// X-Pfy-Signature: sha256=<hex HMAC-SHA256 of the raw body>
export async function signatureValid(raw, header) {
  const given = String(header || '').replace(/^sha256=/i, '').trim().toLowerCase();
  if (!given || !token()) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(await webhookSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const want = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (want.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ---------- pricing ----------
// The owner's rule (14/11/2026): the cheapest variant sells at product.price; a dearer variant
// (bigger sizes) adds exactly what it costs more, rounded up to the next .99 so prices look clean.
export const DEFAULT_PRICE = 21.99;
export const roundUp99 = (cents) => Math.ceil((Math.round(cents) + 1) / 100) * 100 - 1;

export function variantExtra(baseCents, cost, minCost) {
  if (!(cost > minCost)) return 0;
  return roundUp99(baseCents + (cost - minCost)) - baseCents;
}

const CATEGORY_RULES = [
  [/mug|tumbler|cup|bottle/i, 'Mugs'],
  [/poster|canvas|print|frame|wall/i, 'Wall Art'],
  [/tee|shirt|hoodie|sweatshirt|tank|sleeve|crewneck|jacket|hat|cap|beanie|apparel|polo/i, 'Apparel'],
];
export const guessCategory = (text) => (CATEGORY_RULES.find(([re]) => re.test(text || '')) || [null, 'Gifts'])[1];

// A Printify product -> the fields the site stores for it. basePrice in dollars (product.price).
export function fromPrintify(p, basePrice) {
  const enabled = (p.variants || []).filter((v) => v.is_enabled);
  const costs = enabled.filter((v) => v.is_available !== false).map((v) => Number(v.cost)).filter((c) => c > 0);
  const minCost = costs.length ? Math.min(...costs) : 0;
  const base = Math.round(Number(basePrice) * 100);
  const used = new Set(enabled.flatMap((v) => v.options || []));
  const options = (p.options || []).map((o) => ({
    name: o.name,
    type: o.type,
    values: (o.values || []).filter((v) => used.has(v.id)).map((v) => ({ id: v.id, title: v.title, ...(v.colors ? { colors: v.colors } : {}) })),
  })).filter((o) => o.values.length);
  const variants = enabled.map((v) => ({
    id: v.id,
    title: v.title,
    options: v.options || [],
    extra: variantExtra(base, Number(v.cost), minCost),
    available: v.is_available !== false,
  }));
  const enabledIds = new Set(enabled.map((v) => v.id));
  const variantImages = (p.images || [])
    .map((img) => ({ src: img.src, variant_ids: (img.variant_ids || []).filter((id) => enabledIds.has(id)), is_default: Boolean(img.is_default) }))
    .filter((img) => img.src && img.variant_ids.length);
  // the gallery: every picture of the default variant (front, back, …), default picture first
  const defaultVariant = enabled.find((v) => v.is_default) || enabled[0];
  let gallery = variantImages.filter((img) => defaultVariant && img.variant_ids.includes(defaultVariant.id));
  if (!gallery.length) gallery = variantImages.slice(0, 6);
  gallery = [...gallery].sort((a, b) => Number(b.is_default) - Number(a.is_default)).map((img) => img.src);
  return { options, variants, variant_images: variantImages, images: [...new Set(gallery)] };
}

export const slugify = (s) => String(s || 'product').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'product';
