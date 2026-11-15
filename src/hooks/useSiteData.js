import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { sortByCustomOrder } from "@/lib/displayOrder";
import { displayImages, displayColor } from "@/lib/podCart";
import { buildCatalog } from "@/lib/ebookGroups";

// Everything the public pages list (books, videos, studies...), loaded ONCE and shared by every page:
// moving from page to page reuses it instead of downloading all nine tables again, which keeps the
// site within Supabase's free bandwidth and makes page changes instant. Fresh again after FRESH_MS.
const FRESH_MS = 3 * 60 * 1000;
let cache = null;       // { data, at }
let inflight = null;    // Promise<data> while loading

const EMPTY = { ebookCatalog: buildCatalog([]), studies: [], videos: [], ebooks: [], products: [], resources: [], testimonials: [], siteContent: [], membershipStats: [], heroSlides: [] };

async function fetchAll() {
  const [s, v, e, p, r, t, sc, ms, hs] = await Promise.all([
    base44.entities.BibleStudy.filter({ status: "published" }, "-created_date", 50).catch(() => []),
    base44.entities.Video.filter({ status: "published" }, "-created_date", 50).catch(() => []),
    base44.entities.Ebook.filter({ status: "published" }, "-created_date", 200).catch(() => []),
    base44.entities.Product.filter({ status: "published" }, "-created_date", 200).catch(() => []),
    base44.entities.FreeResource.filter({ status: "published" }, "-created_date", 50).catch(() => []),
    base44.entities.Testimonial.list("-created_date", 50).catch(() => []),
    base44.entities.SiteContent.list("-created_date", 50).catch(() => []),
    base44.entities.MembershipStat.list("sort_order", 50).catch(() => []),
    base44.entities.HeroSlide.filter({ status: "published" }, "sort_order", 50).catch(() => []),
  ]);
  const sortedEbooks = sortByCustomOrder(e);
  // Full Versions / In-Depth Topics / Part Series (src/lib/ebookGroups.js). A full version also
  // carries what it saves against buying its parts one by one, for its card and page.
  const ebookCatalog = buildCatalog(sortedEbooks);
  ebookCatalog.savings.forEach((row, id) => {
    const ebook = sortedEbooks.find((b) => b.id === id);
    if (ebook) Object.assign(ebook, { parts_saving: row.save, parts_count: row.parts.length, parts_total: row.partsTotal });
  });
  return {
    ebookCatalog,
    studies: s,
    videos: v,
    ebooks: sortedEbooks,
    // Printify products show the colour chosen in Admin (default: black) on every card and gallery
    products: sortByCustomOrder(p).map((product) => ({
      ...product,
      images: displayImages(product),
      display_color_id: displayColor(product)?.id ?? null,
    })),
    resources: sortByCustomOrder(r),
    testimonials: t,
    siteContent: sc,
    membershipStats: ms,
    heroSlides: hs,
  };
}

function load() {
  if (cache && Date.now() - cache.at < FRESH_MS) return Promise.resolve(cache.data);
  if (!inflight) {
    inflight = fetchAll()
      .then((data) => { cache = { data, at: Date.now() }; return data; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// Admin changed something: the next page that asks loads it again.
export function forgetSiteData() {
  cache = null;
}

export function useSiteData() {
  const [data, setData] = useState(() => cache?.data || EMPTY);
  const [loading, setLoading] = useState(() => !cache);

  useEffect(() => {
    let active = true;
    load()
      .then((fresh) => { if (active) setData(fresh); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { ...data, loading };
}
