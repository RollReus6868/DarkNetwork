import { useState, useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Check, Star } from "lucide-react";
import Seo from "@/components/site/Seo";
import YouTubeEmbed from "@/components/site/YouTubeEmbed";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";
import { addToCart } from "@/lib/cart";
import { EbookBuyButton } from "@/components/site/EbookBuyButton";
import { ProductTextPrice } from "@/components/site/ProductTextPrice";

export default function EbookDetail() {
  const { slug } = useParams();
  const { ebooks, videos, studies, loading } = useSiteData();
  const [ebook, setEbook] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!loading) {
      const found = ebooks.find((e) => e.slug === slug);
      if (found) setEbook(found);
      else setNotFound(true);
    }
  }, [slug, ebooks, loading]);

  if (loading) return <div className="pt-32 text-center text-muted-foreground">Loading book…</div>;
  if (notFound || !ebook) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Book Not Found</h1>
        <Link to="/books" className="text-primary hover:underline">← Back to Books</Link>
      </div>
    );
  }

  const relatedVideo = videos.find((v) => v.id === ebook.related_video_id);
  const relatedStudies = studies.filter((s) => ebook.related_study_ids?.includes(s.id)).slice(0, 3);

  const handleAdd = () => {
    addToCart({ id: ebook.id, type: "ebook", title: ebook.title, price: ebook.price, image: ebook.cover_image, slug: ebook.slug });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <Seo
        title={`${ebook.title} — Dark Network Books`}
        description={ebook.meta_description || ebook.subtitle || ebook.description?.replace(/<[^>]+>/g, "").slice(0, 160)}
        image={ebook.cover_image}
        type="book"
      />

      <div className="pt-20 lg:pt-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/books" className="hover:text-primary">Books</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">{ebook.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="relative max-w-xs mx-auto md:mx-0 md:sticky md:top-28">
            <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative aspect-[3/4] overflow-hidden rounded shadow-2xl">
              <Image src={ebook.cover_image} alt={ebook.title} className="w-full h-full" fittingType="fill" />
            </div>
            {ebook.preview_images?.length > 0 && (
              <div className="flex gap-2 mt-4">
                {ebook.preview_images.slice(0, 4).map((img, i) => (
                  <div key={i} className="w-16 h-20 overflow-hidden rounded border border-border">
                    <Image src={img} alt={`Preview ${i + 1}`} className="w-full h-full" fittingType="fill" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ProductTextPrice
              category="Digital Ebook"
              title={ebook.title}
              titleAs="h1"
              showDescription={false}
            />
            {ebook.subtitle && <p className="text-xl text-foreground/60 font-heading italic mt-2">{ebook.subtitle}</p>}
            <div className="flex items-center gap-3 mt-5">
              <span className="text-4xl font-heading font-bold text-primary">${ebook.price.toFixed(2)}</span>
              {ebook.original_price && Number(ebook.original_price) > Number(ebook.price) && (
                <span className="text-xl text-muted-foreground line-through">${Number(ebook.original_price).toFixed(2)}</span>
              )}
              <span className="text-sm text-muted-foreground uppercase tracking-wide">Instant Download</span>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <EbookBuyButton ebook={ebook} variant="detail" />
              <Link to="/cart" className="border border-border text-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary hover:text-primary transition-colors text-center">
                View Cart
              </Link>
            </div>

            <div className="mt-8 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Instant digital delivery</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Read on any device</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Secure checkout</p>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="font-heading text-xl font-semibold mb-3">Description</h2>
              <div className="text-foreground/80 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ebook.description) }} />
            </div>
          </div>
        </div>
      </section>

      {/* What You Will Learn */}
      {ebook.what_you_learn?.length > 0 && (
        <section className="bg-secondary/30 border-y border-border py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-bold mb-6">What You Will Learn</h2>
            <ul className="space-y-3">
              {ebook.what_you_learn.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/85">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Who This Book Is For */}
      {ebook.who_for && (
        <section className="py-14 max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold mb-4">Who This Book Is For</h2>
          <div className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ebook.who_for) }} />
        </section>
      )}

      {/* Reviews */}
      {ebook.reviews?.length > 0 && (
        <section className="bg-secondary/30 border-y border-border py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-bold mb-8 text-center">Reader Reviews</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {ebook.reviews.map((r, i) => (
                <div key={i} className="bg-card border border-border rounded p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className={`w-4 h-4 ${j < (r.rating || 5) ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-foreground/80 italic mb-3">"{r.text}"</p>
                  <p className="text-sm font-medium text-primary">— {r.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {ebook.faq?.length > 0 && (
        <section className="py-14 max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {ebook.faq.map((f, i) => (
              <div key={i} className="border border-border rounded p-5">
                <h3 className="font-semibold mb-2 text-primary">{f.question}</h3>
                <p className="text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Video */}
      {relatedVideo && (
        <section className="py-14 bg-secondary/30 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-bold mb-6">Related Video</h2>
            <YouTubeEmbed videoId={relatedVideo.youtube_id} title={relatedVideo.title} thumbnail={relatedVideo.thumbnail_url} />
          </div>
        </section>
      )}

      {/* Related Studies */}
      {relatedStudies.length > 0 && (
        <section className="py-14 max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold mb-6">Related Bible Studies</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {relatedStudies.map((s) => (
              <Link key={s.id} to={`/bible-studies/${s.slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden rounded mb-2">
                  <Image src={s.hero_image} alt={s.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <h3 className="absolute bottom-0 p-3 font-heading font-semibold group-hover:text-primary">{s.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-16 bg-black border-t border-border text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Ready to Go Deeper?</h2>
          <p className="text-muted-foreground mb-6">Get instant access to {ebook.title} and start reading today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <EbookBuyButton ebook={ebook} variant="detail" />
          </div>
        </div>
      </section>
    </>
  );
}