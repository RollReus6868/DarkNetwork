import { editionTypeOf, parseTitle, shortSeriesName } from "@/lib/ebookSeries";

// Books sorted into the site's three kinds (see editionTypeOf). `ebooks` is already in display order
// (displayOrder.js), and each list keeps that order; "Featured on Homepage" books lead their list.
//   full:   Full Versions          topic: In-Depth Topics
//   series: Part Series, one entry per series in order of first appearance, its parts Part 0 → N,
//           with its full version (if any) and how much that saves against buying every part.
export const KIND_TITLES = { full: "Full Versions", topic: "In-Depth Topics", part: "Part Series" };

const featuredFirst = (list) => [...list.filter((e) => e.featured), ...list.filter((e) => !e.featured)];
const cents = (v) => Math.round(Number(v || 0) * 100);

export function buildCatalog(ebooks = []) {
  const parsed = ebooks.map((ebook) => ({ ebook, t: parseTitle(ebook.title) }));
  const seriesBases = new Set(parsed.filter(({ ebook }) => editionTypeOf(ebook) === "part").map(({ t }) => t.base));
  const full = [];
  const topic = [];
  const byBase = new Map();
  const series = [];

  parsed.forEach(({ ebook, t }) => {
    const kind = editionTypeOf(ebook, seriesBases);
    if (kind === "full") full.push({ ebook, t });
    else if (kind === "topic") topic.push(ebook);
    else {
      let row = byBase.get(t.base);
      if (!row) {
        row = { key: t.base || "parts", name: t.series || KIND_TITLES.part, short: shortSeriesName(t.series) || KIND_TITLES.part, items: [] };
        byBase.set(t.base, row);
        series.push(row);
      }
      row.items.push({ ebook, part: t.part ?? Number.MAX_SAFE_INTEGER });
    }
  });

  // what a full version saves against buying all of its parts one by one
  const savings = new Map();
  series.forEach((row) => {
    row.parts = [...row.items].sort((a, b) => a.part - b.part).map((item) => item.ebook);
    delete row.items;
    row.full = full.find(({ t }) => t.base === row.key)?.ebook || null;
    row.partsTotal = row.parts.reduce((sum, e) => sum + cents(e.price), 0) / 100;
    row.save = 0;
    if (row.full && row.parts.length > 1 && row.partsTotal > 0) {
      const pct = Math.floor((1 - cents(row.full.price) / cents(row.partsTotal)) * 100);
      if (pct >= 5) row.save = pct;
    }
    if (row.full) savings.set(row.full.id, row);
  });

  return { full: featuredFirst(full.map(({ ebook }) => ebook)), topic: featuredFirst(topic), series, savings };
}

// The series a book belongs to (its part row), or null.
export function seriesOf(catalog, ebook) {
  if (!ebook) return null;
  return catalog.series.find((row) => row.parts.some((e) => e.id === ebook.id) || row.full?.id === ebook.id) || null;
}
