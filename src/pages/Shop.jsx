import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import Seo from "@/components/site/Seo";
import { EbookCard, ProductCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

const CATEGORIES = ["All", "Books", "Apparel", "Wall Art", "Mugs", "Gifts"];

export default function Shop() {
  const { products, ebooks, loading } = useSiteData();
  const [params, setParams] = useSearchParams();
  const active = params.get("category") || "All";
  const sort = params.get("sort") || "newest";
  const q = params.get("q") || "";

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // Merge ebooks into shop as "Books" category products
  const allProducts = useMemo(() => {
    const ebookProducts = ebooks.map((e) => ({ ...e, category: "Books", images: [e.cover_image], isEbook: true }));
    return [...ebookProducts, ...products];
  }, [ebooks, products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = allProducts.filter((p) => (active === "All" || p.category === active)
      && (!term || `${p.title} ${p.subtitle || ""} ${p.category}`.toLowerCase().includes(term)));
    const byDate = (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0);
    const sorters = {
      newest: byDate,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "name-asc": (a, b) => String(a.title).localeCompare(String(b.title)),
    };
    list = [...list].sort(sorters[sort] || byDate);
    return list;
  }, [allProducts, active, q, sort]);

  return (
    <>
      <Seo
        title="Shop — Dark Network"
        image={allProducts[0]?.images?.[0]}
        description="The Dark Network store — digital ebooks, apparel, wall art, mugs, and gifts. Every product inspired by Scripture."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Store"
              title="Shop the"
              accent="Collection"
              subtitle="Digital books and print-on-demand merchandise — all inspired by Scripture and crafted for the Dark Network."
            />
          </div>
        </div>

        <div className="dn-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5a3a1f]/60" />
              <input
                type="search"
                value={q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search products…"
                aria-label="Search products"
                className="w-full bg-white/70 border border-[#a87f2e]/40 text-[#2b1d0a] placeholder:text-[#2b1d0a]/45 rounded pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-[#a87f2e]"
              />
              {q && (
                <button onClick={() => update({ q: "" })} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a3a1f]/60 hover:text-[#2b1d0a]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}
              aria-label="Sort products"
              className="bg-white/70 border border-[#a87f2e]/40 text-[#2b1d0a] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#a87f2e]"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A–Z</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => update({ category: c === "All" ? "" : c })}
                className={`text-xs uppercase tracking-wide px-4 py-2 rounded border transition-colors ${
                  active === c ? "btn-gold border-transparent" : "border-[#a87f2e]/40 text-[#5a3a1f] hover:bg-[#a87f2e]/15"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-[#2b1d0a]/60 py-20">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-[#2b1d0a]/60 py-20">No products match your search yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start gap-4 md:gap-8">
              {filtered.map((p) => (
                p.isEbook ? (
                  <EbookCard key={p.id} ebook={p} />
                ) : (
                  <ProductCard key={p.id} product={p} />
                )
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
