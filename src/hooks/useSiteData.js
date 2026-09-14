import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useSiteData() {
  const [studies, setStudies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, v, e, p, r] = await Promise.all([
          base44.entities.BibleStudy.filter({ status: "published" }, "-created_date", 50).catch(() => []),
          base44.entities.Video.filter({ status: "published" }, "-created_date", 50).catch(() => []),
          base44.entities.Ebook.filter({ status: "published" }, "-created_date", 50).catch(() => []),
          base44.entities.Product.filter({ status: "published" }, "-created_date", 50).catch(() => []),
          base44.entities.FreeResource.filter({ status: "published" }, "-created_date", 50).catch(() => []),
        ]);
        if (!active) return;
        setStudies(s);
        setVideos(v);
        setEbooks(e);
        setProducts(p);
        setResources(r);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { studies, videos, ebooks, products, resources, loading };
}