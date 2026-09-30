// Minimal HTML sanitizer for admin-authored rich text rendered with
// dangerouslySetInnerHTML. Removes scripts, event handlers and unsafe URLs;
// allows YouTube iframes only.

const ALLOWED_TAGS = new Set([
  "a", "b", "i", "em", "strong", "u", "s", "p", "br", "hr", "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "img", "figure", "figcaption", "iframe",
  "table", "thead", "tbody", "tr", "th", "td", "sup", "sub", "code", "pre",
]);
const ALLOWED_ATTRS = new Set([
  "href", "src", "alt", "title", "target", "rel", "class", "width", "height",
  "allow", "allowfullscreen", "frameborder", "loading", "colspan", "rowspan",
]);
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#)/i;
const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i;

export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "");

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  const clean = (node) => {
    Array.from(node.children).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Drop dangerous containers entirely; unwrap harmless unknown tags.
        if (["script", "style", "object", "embed", "form", "link", "meta", "svg", "math"].includes(tag)) {
          el.remove();
        } else {
          clean(el);
          el.replaceWith(...Array.from(el.childNodes));
        }
        return;
      }
      if (tag === "iframe" && !YOUTUBE.test(el.getAttribute("src") || "")) {
        el.remove();
        return;
      }
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith("on")) {
          el.removeAttribute(attr.name);
        } else if ((name === "href" || name === "src") && tag !== "iframe" && !SAFE_URL.test(attr.value.trim())) {
          el.removeAttribute(attr.name);
        }
      });
      if (tag === "a" && el.getAttribute("target") === "_blank") el.setAttribute("rel", "noopener noreferrer");
      clean(el);
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
