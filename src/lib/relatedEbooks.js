// Ranking for the "Các ebook khác" list at the bottom of an ebook page.
// Priority: 1) books hand-picked in Admin (their order is respected),
// 2) books from the same series detected from the title (so Part 2 sits next to
// Part 1 and Part 3), 3) the remaining published books as filler.

import { parseTitle } from "@/lib/ebookSeries";

// null = not the same series; a smaller score means "closer to the book being read".
function seriesScore(current, other) {
  if (!current.base || current.base !== other.base) return null;
  // One of the two has no part number — keep them together, but after the
  // books whose position in the series is actually known.
  if (current.part === null || other.part === null) return 1000;
  return Math.abs(current.part - other.part);
}

export function getRelatedEbooks(current, all = [], limit = 6) {
  if (!current?.id) return [];
  const pool = all.filter((e) => e?.id && e.id !== current.id && e.status !== "draft");
  const byId = new Map(pool.map((e) => [e.id, e]));
  const picked = [];
  const taken = new Set([current.id]);

  const take = (ebook) => {
    if (!ebook || taken.has(ebook.id)) return;
    taken.add(ebook.id);
    picked.push(ebook);
  };

  // 1. Hand-picked in Admin — the order chosen there is the priority order.
  const manualIds = Array.isArray(current.related_ebook_ids) ? current.related_ebook_ids : [];
  manualIds.forEach((id) => take(byId.get(id)));

  // 2. Same series (same title, different Part/Book/Volume…), nearest part first.
  const self = parseTitle(current.title);
  pool
    .map((ebook) => ({ ebook, score: seriesScore(self, parseTitle(ebook.title)) }))
    .filter((row) => row.score !== null)
    .sort((a, b) => a.score - b.score)
    .forEach((row) => take(row.ebook));

  // 3. Round the list out with other published books.
  pool.forEach(take);

  return picked.slice(0, limit);
}