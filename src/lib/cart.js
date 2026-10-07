export function getCart() {
  try {
    return JSON.parse(localStorage.getItem("dark_cart") || "[]");
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem("dark_cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(item) {
  const cart = getCart();
  // digital ebooks: one copy each
  if (!cart.some((i) => i.id === item.id)) cart.push({ ...item, qty: 1 });
  saveCart(cart);
  return cart;
}

export function removeFromCart(id) {
  const cart = getCart().filter((i) => i.id !== id);
  saveCart(cart);
  return cart;
}

export function updateQty(id, qty) {
  const cart = getCart().map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i));
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}

export function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + Number(i.price), 0);
}