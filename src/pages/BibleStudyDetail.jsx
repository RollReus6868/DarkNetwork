import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ArrowRight, BookOpen, Play } from "lucide-react";
import Seo from "@/components/site/Seo";
import YouTubeEmbed from "@/components/site/YouTubeEmbed";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";
import { addToCart } from "@/lib/cart";

export default function BibleStudyDetail() {
  const { slug } = useParams();
  const { studies, videos, ebooks, products, loading } = useSiteData();
  const [study, setStudy] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading) {
      const found = studies.find((s) => s.slug === slug);
      if (found) setStudy(found);
      else setNotFound(true);
    }
  }, [slug, studies, loading]);

  if (loading) {
    return (
      <div className="pt-32 text-center text-muted-foreground">Loading study…</div>
    );
  }
  if (notFound || !study) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Study Not Found</h1>
        <p className="text-muted-foreground mb-6">This Bible study doesn't exist or has been removed.</p>
        <Link to="/bible-studies" className="text-primary hover:underline">← Back to Bible Studies</Link>
      </div>
    );
  }

  const relatedVideo = videos.find((v) => v.id === study.related_video_id);
  const relatedEbook = ebooks.find((e) => e.id === study.related_ebook_id);
  const relatedProducts = products.filter((p) => study.related_product_ids?.includes(p.id));
  const relatedStudies = studies.filter((s) => s.category === study.category && s.id !== study.id).slice(0, 3);

  return (
    <>
      <Seo
        title={`${study.title} — Dark Network`}
        description={study.meta_description || study.excerpt}
        image={study.og_image || study.hero_image}
        type="article"
      />

      {/* Breadcrumb */}
      <div className="pt-20 lg:pt-24 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/bible-studies" className="hover:text-primary">Bible Studies</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">{study.category}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
        <Image src={study.hero_image} alt={study.title} className="w-full h-full" fittingType="fill" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 inset-x-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{study.category}</span>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mt-3 leading-tight text-balance">
              {study.title}
            </h1>
            {study.excerpt && <p className="text-lg text-foreground/70 mt-4 max-w-2xl">{study.excerpt}</p>}
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div
          className="prose-content text-foreground/85 leading-relaxed space-y-6 text-lg"
          dangerouslySetInnerHTML={{ __html: study.content }}
        />

        {study.bible_verses && (
          <div className="my-10 border-l-2 border-primary pl-6 py-4 bg-secondary/30 rounded-r">
            <h3 className="font-heading text-xl font-semibold text-primary mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Bible Verses
            </h3>
            <div className="text-foreground/80" dangerouslySetInnerHTML={{ __html: study.bible_verses }} />
          </div>
        )}

        {study.historical_context && (
          <div className="my-10">
            <h3 className="font-heading text-2xl font-bold mb-4">Historical Context</h3>
            <div className="text-foreground/85 leading-relaxed" dangerouslySetInnerHTML={{ __html: study.historical_context }} />
          </div>
        )}

        {study.conclusion && (
          <div className="my-10">
            <h3 className="font-heading text-2xl font-bold mb-4">Conclusion</h3>
            <div className="text-foreground/85 leading-relaxed" dangerouslySetInnerHTML={{ __html: study.conclusion }} />
          </div>
        )}
      </article>

      {/* Related Video */}
      {relatedVideo && (
        <section className="bg-secondary/30 border-y border-border py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h3 className="font-heading text-2xl font-bold mb-6">Related Video</h3>
            <YouTubeEmbed
              videoId={relatedVideo.youtube_id}
              title={relatedVideo.title}
              thumbnail={relatedVideo.thumbnail_url}
            />
            <div className="mt-4">
              <h4 className="font-heading text-xl font-semibold">{relatedVideo.title}</h4>
              <Link to={`/watch/${relatedVideo.slug}`} className="text-primary text-sm hover:underline flex items-center gap-1 mt-2">
                Watch Full Video <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Ebook */}
      {relatedEbook && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="font-heading text-2xl font-bold mb-8">Related Ebook</h3>
          <div className="grid md:grid-cols-2 gap-8 items-center bg-card border border-border rounded p-6 md:p-8">
            <div className="aspect-[3/4] max-w-[200px] overflow-hidden rounded shadow-xl">
              <Image src={relatedEbook.cover_image} alt={relatedEbook.title} className="w-full h-full" fittingType="fill" />
            </div>
            <div>
              <h4 className="font-heading text-2xl font-bold mb-2">{relatedEbook.title}</h4>
              <p className="text-muted-foreground mb-4">{relatedEbook.subtitle}</p>
              <p className="text-primary text-2xl font-heading font-bold mb-4">${relatedEbook.price.toFixed(2)}</p>
              <Link to={`/books/${relatedEbook.slug}`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm hover:bg-primary/90">
                View Book <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Merch */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-secondary/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="font-heading text-2xl font-bold mb-8">Related Merchandise</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link key={p.id} to={`/shop/${p.slug}`} className="group block">
                  <div className="aspect-square overflow-hidden rounded mb-2 bg-secondary">
                    {p.images?.[0] && <Image src={p.images[0]} alt={p.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />}
                  </div>
                  <h4 className="font-medium text-sm group-hover:text-primary">{p.title}</h4>
                  <span className="text-primary text-sm">${p.price.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Studies */}
      {relatedStudies.length > 0 && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="font-heading text-2xl font-bold mb-8">Continue Exploring</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedStudies.map((s) => (
              <Link key={s.id} to={`/bible-studies/${s.slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden rounded mb-3">
                  <Image src={s.hero_image} alt={s.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 p-4">
                    <h4 className="font-heading text-lg font-semibold group-hover:text-primary">{s.title}</h4>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}