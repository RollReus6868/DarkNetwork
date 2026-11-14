import { track } from "@/lib/analytics";
import { base44 } from "@/api/base44Client";

// Printed merchandise (Printify) has its own cart: it ships, has sizes / colours and quantities,
// and is paid in a separate checkout from the ebooks (src/lib/cart.js). Prices kept here are only
// for display: the podShop function prices every order from the database.
const KEY = "dark_pod_cart";
const MAX_QTY = 20;

export function getPodCart() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function savePodCart(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ }
  window.dispatchEvent(new Event("cart-updated"));
}

const keyOf = (productId, variantId) => `${productId}:${variantId}`;

// item: { product_id, variant_id, title, variant_title, image, slug, price, quantity }
export function addToPodCart(item) {
  const items = getPodCart();
  const key = keyOf(item.product_id, item.variant_id);
  const found = items.find((i) => i.key === key);
  if (found) found.quantity = Math.min(MAX_QTY, found.quantity + (item.quantity || 1));
  else {
    items.push({ ...item, key, quantity: Math.min(MAX_QTY, Math.max(1, item.quantity || 1)) });
    track("add_to_cart", { item_id: String(item.product_id).slice(0, 64) });
  }
  savePodCart(items);
  return items;
}

export function setPodQty(key, quantity) {
  const items = getPodCart().map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) } : i));
  savePodCart(items);
  return items;
}

export function removeFromPodCart(key) {
  const items = getPodCart().filter((i) => i.key !== key);
  savePodCart(items);
  return items;
}

export const clearPodCart = () => savePodCart([]);
export const podCount = (items) => items.reduce((n, i) => n + Number(i.quantity || 0), 0);
export const podSubtotal = (items) => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
export const forServer = (items) => items.map(({ product_id, variant_id, quantity }) => ({ product_id, variant_id, quantity }));

// ---- the podShop edge function ----
const call = async (payload) => {
  try {
    const r = await base44.functions.invoke("podShop", payload);
    return r?.data || r;
  } catch (error) {
    error.restart = Boolean(error?.data?.restart);   // declined card: PayPal lets the buyer pick another
    throw error;
  }
};

export const podConfig = () => call({ action: "config" }).catch(() => ({ ready: false }));
export const podQuote = (items, address) => call({ action: "quote", items: forServer(items), address });
export const podCreate = (items, address) => call({ action: "create", items: forServer(items), address }).then((d) => d.id);
export const podCapture = (orderId) => call({ action: "capture", order_id: orderId });
export const podTrack = (id, token) => call({ action: "track", id, token }).then((d) => d.order);
export const podAdmin = (action, extra = {}) => call({ action, ...extra });

// ---- product helpers (product.options / product.variants come from the Printify sync) ----
export const variantPrice = (product, variant) => Number(product.price || 0) + Number(variant?.extra || 0) / 100;

export function imagesFor(product, variantId) {
  if (!variantId) return product.images || [];
  const own = (product.variant_images || []).filter((img) => (img.variant_ids || []).includes(variantId));
  if (!own.length) return product.images || [];
  return [...own].sort((a, b) => Number(b.is_default) - Number(a.is_default)).map((img) => img.src);
}
