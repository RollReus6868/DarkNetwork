import { useEffect } from "react";

export default function Seo({ title, description, image, type = "website" }) {
  useEffect(() => {
    if (title) document.title = title;
    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
    }
    if (title) setMeta("og:title", title, "property");
    setMeta("og:type", type, "property");
    if (image) setMeta("og:image", image, "property");
  }, [title, description, image, type]);
  return null;
}