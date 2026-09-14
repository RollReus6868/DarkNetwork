const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #41295a 0%, #2F0743 100%)",
  "linear-gradient(135deg, #c23616 0%, #891815 100%)",
  "linear-gradient(135deg, #232526 0%, #414345 100%)",
  "linear-gradient(135deg, #4a148c 0%, #1a0033 100%)",
  "linear-gradient(135deg, #d84315 0%, #8a1c00 100%)",
  "linear-gradient(135deg, #200122 0%, #6f0000 100%)",
  "linear-gradient(135deg, #42275a 0%, #5a2d4a 100%)",
  "linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 100%)",
  "linear-gradient(135deg, #480048 0%, #8B0048 100%)",
  "linear-gradient(135deg, #16222A 0%, #2A4858 100%)",
  "linear-gradient(135deg, #8E0E00 0%, #4a0a00 100%)",
  "linear-gradient(135deg, #2C3E50 0%, #1a2530 100%)",
  "linear-gradient(135deg, #3E1E00 0%, #5C3A00 100%)",
  "linear-gradient(135deg, #0F2027 0%, #1a3037 100%)",
  "linear-gradient(135deg, #6000BF 0%, #2B0033 100%)",
  "linear-gradient(135deg, #44107A 0%, #23066E 100%)",
];

function hashId(id) {
  let hash = 0;
  const str = String(id || "default");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getGradient(id) {
  return GRADIENT_PRESETS[hashId(id) % GRADIENT_PRESETS.length];
}

export function stripHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}