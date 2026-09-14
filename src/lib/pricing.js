// Pricing utilities — real discount calculation from admin-entered data.
// No fake discounts, no hardcoded 30%. If original_price is empty, no discount is shown.

export function getDiscountPercentage(price, originalPrice) {
  const p = Number(price);
  const o = Number(originalPrice);
  if (!o || o <= 0 || o <= p) return null;
  return Math.round(((o - p) / o) * 100);
}

export function hasDiscount(price, originalPrice) {
  return getDiscountPercentage(price, originalPrice) !== null;
}

export function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}