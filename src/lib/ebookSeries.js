// Cách hiểu tên ebook dùng chung cho cả site.
//
// Sách theo bộ được đặt tên dạng "<Tên bộ> - Part 2: ...": phần tên đứng trước
// chữ Part/Book/Volume là tên bộ, số phía sau là thứ tự part trong bộ.

const PART_RE = /\b(part|book|volume|vol|phần|quyển|tập)\b\.?\s*#?\s*(\d{1,3}|[ivxlcdm]{1,6})\b/i;
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
const TRAILING_SEPARATORS = /[\s\-–—:·,|]+$/;
const FULL_RE = /\b(full|complete)\s+(version|edition)s?\b/i;

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
// "The Ethiopian Canon - Full Version" → { base: "the ethiopian canon", series: "The Ethiopian Canon",
// part: null, full: true }: the words "Full/Complete Version/Edition" are not part of the series name.
export function parseTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(PART_RE);
  const fullMatch = match ? null : text.match(FULL_RE);
  const cut = match || fullMatch;
  const rest = cut ? `${text.slice(0, cut.index)} ${text.slice(cut.index + cut[0].length)}` : text;
  const base = rest.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const series = cut ? text.slice(0, cut.index).replace(TRAILING_SEPARATORS, "").trim() : text;
  return { base, series, part: match ? toNumber(match[2]) : null, full: Boolean(fullMatch) };
}

// The three kinds of book the site shows (Admin "Loại sách"):
//   full  — Full Versions: a whole book ("... - Full Version", or the book a Part series was cut from)
//   topic — In-Depth Topics: a mid-length book on one subject
//   part  — Part Series: one short part of a series ("... - Part 2")
// "auto" (or empty) guesses from the title; seriesBases = the bases of all part series on the site,
// so a single book with the same name as a part series counts as that series' full version.
export const EDITION_TYPES = ["full", "topic", "part"];

export function editionTypeOf(ebook, seriesBases) {
  if (EDITION_TYPES.includes(ebook?.edition_type)) return ebook.edition_type;
  const t = parseTitle(ebook?.title);
  if (t.part !== null) return "part";
  if (t.full || seriesBases?.has(t.base)) return "full";
  return "topic";
}

// The short name of a series for buttons: "The Book of Enoch: A Black Reader's Study Edition" → "The Book of Enoch"
export const shortSeriesName = (name) => String(name || "").split(/\s*[:–—]\s*/)[0].trim() || name;