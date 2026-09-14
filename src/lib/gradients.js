const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)",
  "linear-gradient(135deg, #2af598 0%, #009efd 100%)",
  "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
  "linear-gradient(135deg, #ff512f 0%, #dd2476 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)",
  "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
  "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  "linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
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