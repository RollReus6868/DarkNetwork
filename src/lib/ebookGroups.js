import { editionTypeOf, parseTitle } from "@/lib/ebookSeries";

const ROW_LIMIT = 8;
const FALLBACK_TITLE = "Part Editions";

// Trang chủ: hàng đầu là các bản đầy đủ, sau đó mỗi bộ sách theo part một hàng
// (thứ tự bộ theo lần xuất hiện đầu tiên trong danh sách đã sắp xếp). Trong mỗi
// hàng part, thứ tự part luôn tăng dần.
export function buildEbookRows(ebooks = [], limit = ROW_LIMIT) {
  const full = [];
  const seriesRows = [];
  const byBase = new Map();

  ebooks.forEach((ebook) => {
    if (editionTypeOf(ebook) === "full") {
      full.push(ebook);
      return;
    }
    const { base, series, part } = parseTitle(ebook.title);
    const key = base || "parts";
    let row = byBase.get(key);
    if (!row) {
      row = { key, title: series || FALLBACK_TITLE, items: [] };
      byBase.set(key, row);
      seriesRows.push(row);
    }
    row.items.push({ ebook, part: part ?? Number.MAX_SAFE_INTEGER });
  });

  const rows = [];
  if (full.length > 0) {
    const featuredFirst = [...full.filter((e) => e.featured), ...full.filter((e) => !e.featured)];
    rows.push({ key: "full", title: "Full Editions", ebooks: featuredFirst.slice(0, limit) });
  }

  seriesRows.forEach((row) => {
    const ordered = [...row.items].sort((a, b) => a.part - b.part).map((item) => item.ebook);
    rows.push({ key: row.key, title: row.title, ebooks: ordered.slice(0, limit) });
  });

  return rows;
}