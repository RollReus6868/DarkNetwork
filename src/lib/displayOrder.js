// Display order driven by the "Thứ tự" (sort_order) field set in Admin.
//
// Items given a number (sort_order > 0) come first, smallest number first.
// Everything else keeps the site's default order: newest first. So the shop
// looks exactly as before until the admin starts arranging items.

const time = (item) => new Date(item?.created_date || 0).getTime();

export function byCustomOrder(a, b) {
  const ao = Number(a?.sort_order) || 0;
  const bo = Number(b?.sort_order) || 0;
  if (ao > 0 && bo > 0) return ao - bo;
  if (ao > 0) return -1;
  if (bo > 0) return 1;
  return time(b) - time(a);
}

export function sortByCustomOrder(list = []) {
  return [...list].sort(byCustomOrder);
}