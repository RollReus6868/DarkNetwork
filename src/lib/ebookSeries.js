// Cách hiểu tên ebook dùng chung cho cả site.
//
// Sách theo bộ được đặt tên dạng "<Tên bộ> - Part 2: ...": phần tên đứng trước
// chữ Part/Book/Volume là tên bộ, số phía sau là thứ tự part trong bộ.

const PART_RE = /\b(part|book|volume|vol|phần|quyển|tập)\b\.?\s*#?\s*(\d{1,3}|[ivxlcdm]{1,6})\b/i;
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
const TRAILING_SEPARATORS = /[\s\-–—:·,|]+$/;

export function toNumber(token) {
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

// "The Ethiopian Canon - Part 2: The Book of Enoch"
//   → { base: "the ethiopian canon", series: "The Ethiopian Canon", part: 2 }
// No Part/Book marker → same base, part stays null.
export function parseTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(PART_RE);
  const rest = match ? `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}` : text;
  const base = rest.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const series = match ? text.slice(0, match.index).replace(TRAILING_SEPARATORS, "").trim() : text;
  return { base, series, part: match ? toNumber(match[2]) : null };
}

// Admin chọn sẵn "full" hoặc "part" thì tôn trọng lựa chọn đó; để trống hoặc
// "auto" thì đoán theo tên sách.
export function editionTypeOf(ebook) {
  if (ebook?.edition_type === "full" || ebook?.edition_type === "part") return ebook.edition_type;
  return parseTitle(ebook?.title).part === null ? "full" : "part";
}