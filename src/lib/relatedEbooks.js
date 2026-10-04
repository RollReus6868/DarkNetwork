// Ranking for the "Các ebook khác" list at the bottom of an ebook page.
// Priority: 1) books hand-picked in Admin (their order is respected),
// 2) books from the same series detected from the title (so Part 2 sits next to
// Part 1 and Part 3), 3) the remaining published books as filler.

const PART_RE = /\b(part|book|volume|vol|phần|quyển|tập)\b\.?\s*#?\s*(\d{1,3}|[ivxlcdm]{1,6})\b/i;
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function toNumber(token) {
  if (/^\d+$/.test(token)) return Number(token);
  const s = token.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]] || 0;
    const next = ROMAN[s[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total || null;
}

// "Book of Enoch — Part 2" → { base: "book of enoch", part: 2 }
// No Part/Book marker → same base, part stays null.
function parseTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(PART_RE);
  const rest = match ? `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}` : text;
  const base = rest.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return { base, part: match ? toNumber(match[2]) : null };
}

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