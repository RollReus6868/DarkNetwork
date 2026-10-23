// Display order driven by the "Thứ tự" (sort_order) field set in Admin.
//
// Items without a number (empty or 0) come FIRST, newest first: anything just added (from Admin
// or the DN Product Studio tool) shows up at the top of the home page, Books, Shop and the Admin
// list without anyone having to place it. Items given a number (sort_order > 0) follow, smallest
// number first. Dragging or ▲▼ in Admin numbers the whole list, which places the new items too.
// With no numbers at all the site keeps its default order: newest first.

const time = (item) => new Date(item?.created_date || 0).getTime();

export function byCustomOrder(a, b) {
  const ao = Number(a?.sort_order) || 0;
  const bo = Number(b?.sort_order) || 0;
  if (ao > 0 && bo > 0) return ao - bo;
  if (ao > 0) return 1;
  if (bo > 0) return -1;
  return time(b) - time(a);
}

export function sortByCustomOrder(list = []) {
  return [...list].sort(byCustomOrder);
}
