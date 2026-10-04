import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { sortByCustomOrder } from "@/lib/displayOrder";

export function useSiteData() {
  const [studies, setStudies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [resources, setResources] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [siteContent, setSiteContent] = useState([]);
  const [membershipStats, setMembershipStats] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
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
        if (!active) return;
        setStudies(s);
        setVideos(v);
        setEbooks(e);
        setProducts(sortByCustomOrder(p));
        setResources(r);
        setTestimonials(t);
        setSiteContent(sc);
        setMembershipStats(ms);
        setHeroSlides(hs);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { studies, videos, ebooks, products, resources, testimonials, siteContent, membershipStats, heroSlides, loading };
}