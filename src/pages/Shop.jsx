import { useSearchParams } from "react-router-dom";
import Seo from "@/components/site/Seo";
import { ProductCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

const CATEGORIES = ["All", "Books", "Apparel", "Wall Art", "Mugs", "Gifts"];

export default function Shop() {
  const { products, ebooks, loading } = useSiteData();
  const [params, setParams] = useSearchParams();
  const active = params.get("category") || "All";

  // Merge ebooks into shop as "Books" category products
  const ebookProducts = ebooks.map((e) => ({
    ...e,
    category: "Books",
    images: [e.cover_image],
    slug: e.slug,
    isEbook: true,
  }));
  const allProducts = [...ebookProducts, ...products];
  const filtered = active === "All" ? allProducts : allProducts.filter((p) => p.category === active);

  return (
    <>
      <Seo
        title="Shop — Dark Network"
        description="The Dark Network store — digital ebooks, apparel, wall art, mugs, and gifts. Every product inspired by Scripture."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Store"
              title="Shop the Collection"
              subtitle="Digital books and print-on-demand merchandise — all inspired by Scripture and crafted for the Dark Network."
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap gap-2 mb-10">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setParams(c === "All" ? {} : { category: c })}
                className={`text-xs uppercase tracking-wide px-4 py-2 rounded border transition-colors ${
                  active === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">No products in this category yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}