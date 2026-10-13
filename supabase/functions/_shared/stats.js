// Read-only views of the shop shared by the desktop tool (toolApi) and the owner's phone app (adminApp).
// db = full-access entities.

// One row per order, newest first; a cart order lists all its books. Amounts in cents.
export async function ordersList(db) {
  const rows = await db.EbookPurchase.list('-created_date', 1000);
  const titles = Object.fromEntries((await db.Ebook.list('sort_order', 1000)).map((e) => [e.id, e.title]));
  const orders = new Map();
  for (const r of rows) {
    const key = r.provider_order_id || r.id;
    const order = orders.get(key) || { order_id: key, date: r.purchase_date || r.created_date, email: r.customer_email || '',
      status: r.payment_status || '', currency: r.currency || 'USD', buyer: 'guest', total: 0, items: [] };
    order.total += Number(r.amount) || 0;
    order.items.push(titles[r.ebook_id] || 'Ebook đã xoá');
    if (r.user_id) order.buyer = 'account';
    orders.set(key, order);
  }
  return [...orders.values()];
}
