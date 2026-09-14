import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ExternalLink, ArrowRight, ShoppingBag } from "lucide-react";
import Seo from "@/components/site/Seo";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";

export default function ProductDetail() {
  const { slug } = useParams();
  const { products, studies, ebooks, loading } = useSiteData();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!loading) {
      const found = products.find((p) => p.slug === slug);
      if (found) {
        setProduct(found);
        setActiveImage(0);
      } else setNotFound(true);
    }
  }, [slug, products, loading]);

  if (loading) return <div className="pt-32 text-center text-muted-foreground">Loading product…</div>;
  if (notFound || !product) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Product Not Found</h1>
        <Link to="/shop" className="text-primary hover:underline">← Back to Shop</Link>
      </div>
    );
  }

  const relatedStudy = studies.find((s) => s.id === product.related_study_id);
  const relatedEbook = ebooks.find((e) => e.id === product.related_ebook_id);
  const relatedProducts = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const images = product.images?.length ? product.images : [];

  return (
    <>
      <Seo
        title={`${product.title} — Dark Network Shop`}
        description={product.meta_description || product.description?.replace(/<[^>]+>/g, "").slice(0, 160)}
        image={images[0]}
        type="product"
      />

      <div className="pt-20 lg:pt-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/shop" className="hover:text-primary">Shop</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">{product.category}</span>
          </nav>
        </div>
      </div>

      <section className="py-10 lg:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded bg-secondary mb-4">
              {images[activeImage] && <Image src={images[activeImage]} alt={product.title} className="w-full h-full" fittingType="fill" />}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 md:w-20 md:h-20 overflow-hidden rounded border-2 transition-colors ${i === activeImage ? "border-primary" : "border-border"}`}
                  >
                    <Image src={img} alt={`View ${i + 1}`} className="w-full h-full" fittingType="fill" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{product.category}</span>
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-3 leading-tight">{product.title}</h1>
            <div className="flex items-center gap-3 mt-5">
              <p className="text-3xl font-heading font-bold text-primary">${product.price.toFixed(2)}</p>
              {product.original_price && Number(product.original_price) > Number(product.price) && (
                <p className="text-lg text-muted-foreground line-through">${Number(product.original_price).toFixed(2)}</p>
              )}
            </div>

            <a
              href={product.spring_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 transition-colors w-full sm:w-auto"
            >
              <ShoppingBag className="w-5 h-5" />
              Buy on Spring
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Physical merchandise is printed and fulfilled by Spring. You'll complete your purchase on their secure checkout.
            </p>

            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="font-heading text-xl font-semibold mb-3">Description</h2>
              <div className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>

            {product.bible_inspiration && (
              <div className="mt-6 border-l-2 border-primary pl-4">
                <h3 className="font-heading text-lg font-semibold text-primary mb-2">Bible Inspiration</h3>
                <div className="text-foreground/80 text-sm" dangerouslySetInnerHTML={{ __html: product.bible_inspiration }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Story behind design */}
      {product.story_behind_design && (
        <section className="bg-secondary/30 border-y border-border py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-bold mb-4">Story Behind the Design</h2>
            <div className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.story_behind_design }} />
          </div>
        </section>
      )}

      {/* Product / Size / Shipping info */}
      <section className="py-12 max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        {product.product_info && (
          <div>
            <h2 className="font-heading text-xl font-semibold mb-3">Product Information</h2>
            <div className="text-foreground/80 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.product_info }} />
          </div>
        )}
        {product.size_info && (
          <div>
            <h2 className="font-heading text-xl font-semibold mb-3">Size Information</h2>
            <div className="text-foreground/80 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.size_info }} />
          </div>
        )}
        {product.shipping_info && (
          <div>
            <h2 className="font-heading text-xl font-semibold mb-3">Shipping Information</h2>
            <div className="text-foreground/80 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.shipping_info }} />
          </div>
        )}
      </section>

      {/* Related */}
      {(relatedStudy || relatedEbook) && (
        <section className="py-12 bg-secondary/30 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-bold mb-6">Explore the Story</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {relatedStudy && (
                <Link to={`/bible-studies/${relatedStudy.slug}`} className="group block">
                  <div className="relative aspect-video overflow-hidden rounded mb-3">
                    <Image src={relatedStudy.hero_image} alt={relatedStudy.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 p-4">
                      <span className="text-xs uppercase text-primary">Bible Study</span>
                      <h3 className="font-heading text-xl font-semibold group-hover:text-primary">{relatedStudy.title}</h3>
                    </div>
                  </div>
                </Link>
              )}
              {relatedEbook && (
                <Link to={`/books/${relatedEbook.slug}`} className="group flex gap-4 bg-card border border-border rounded p-4">
                  <div className="w-20 h-28 overflow-hidden rounded flex-shrink-0">
                    <Image src={relatedEbook.cover_image} alt={relatedEbook.title} className="w-full h-full" fittingType="fill" />
                  </div>
                  <div>
                    <span className="text-xs uppercase text-primary">Ebook</span>
                    <h3 className="font-heading text-lg font-semibold group-hover:text-primary">{relatedEbook.title}</h3>
                    <p className="text-primary text-sm">${relatedEbook.price.toFixed(2)}</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <Link key={p.id} to={`/shop/${p.slug}`} className="group block">
                <div className="aspect-square overflow-hidden rounded mb-2 bg-secondary">
                  {p.images?.[0] && <Image src={p.images[0]} alt={p.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />}
                </div>
                <h3 className="font-medium text-sm group-hover:text-primary">{p.title}</h3>
                <span className="text-primary text-sm">${p.price.toFixed(2)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile buy bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{product.title}</p>
          <div className="flex items-center gap-2">
            <p className="text-primary font-heading text-xl font-bold">${product.price.toFixed(2)}</p>
            {product.original_price && Number(product.original_price) > Number(product.price) && (
              <p className="text-sm text-muted-foreground line-through">${Number(product.original_price).toFixed(2)}</p>
            )}
          </div>
        </div>
        <a
          href={product.spring_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm flex items-center gap-2"
        >
          Buy <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </>
  );
}