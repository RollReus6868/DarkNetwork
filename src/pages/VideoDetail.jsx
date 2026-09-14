import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ArrowRight, BookOpen } from "lucide-react";
import Seo from "@/components/site/Seo";
import YouTubeEmbed from "@/components/site/YouTubeEmbed";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";

export default function VideoDetail() {
  const { slug } = useParams();
  const { videos, studies, ebooks, products, loading } = useSiteData();
  const [video, setVideo] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading) {
      const found = videos.find((v) => v.slug === slug);
      if (found) setVideo(found);
      else setNotFound(true);
    }
  }, [slug, videos, loading]);

  if (loading) return <div className="pt-32 text-center text-muted-foreground">Loading video…</div>;
  if (notFound || !video) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Video Not Found</h1>
        <Link to="/watch" className="text-primary hover:underline">← Back to Watch</Link>
      </div>
    );
  }

  const relatedStudy = studies.find((s) => s.id === video.related_study_id);
  const relatedEbook = ebooks.find((e) => e.id === video.related_ebook_id);
  const relatedProducts = products.filter((p) => video.related_product_ids?.includes(p.id));
  const moreVideos = videos.filter((v) => v.id !== video.id && v.category === video.category).slice(0, 3);
  const moreFallback = videos.filter((v) => v.id !== video.id).slice(0, 3);
  const more = moreVideos.length ? moreVideos : moreFallback;

  return (
    <>
      <Seo
        title={`${video.title} — Dark Network`}
        description={video.meta_description || video.description}
        image={video.thumbnail_url}
        type="video"
      />

      <div className="pt-20 lg:pt-24 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/watch" className="hover:text-primary">Watch</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">{video.category}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{video.category}</span>
        <h1 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-6 leading-tight text-balance">{video.title}</h1>

        <YouTubeEmbed
          videoId={video.youtube_id}
          title={video.title}
          thumbnail={video.thumbnail_url}
        />

        <div className="mt-8 max-w-3xl">
          <h2 className="font-heading text-xl font-semibold mb-3">About This Video</h2>
          <p className="text-foreground/80 text-lg leading-relaxed">{video.description}</p>
        </div>
      </div>

      {/* Related Study */}
      {relatedStudy && (
        <section className="bg-secondary/30 border-y border-border py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="font-heading text-2xl font-bold mb-6">Related Bible Study</h3>
            <Link to={`/bible-studies/${relatedStudy.slug}`} className="group grid md:grid-cols-3 gap-6 items-center">
              <div className="relative aspect-video overflow-hidden rounded">
                <Image src={relatedStudy.hero_image} alt={relatedStudy.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
              </div>
              <div className="md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-primary">{relatedStudy.category}</span>
                <h4 className="font-heading text-2xl font-bold mt-1 group-hover:text-primary">{relatedStudy.title}</h4>
                <p className="text-muted-foreground mt-2">{relatedStudy.excerpt}</p>
                <span className="text-primary text-sm flex items-center gap-1 mt-3">Read Study <ArrowRight className="w-4 h-4" /></span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Related Ebook + Products */}
      {(relatedEbook || relatedProducts.length > 0) && (
        <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6">
          <h3 className="font-heading text-2xl font-bold mb-6">Go Deeper</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedEbook && (
              <Link to={`/books/${relatedEbook.slug}`} className="group block">
                <div className="aspect-[3/4] overflow-hidden rounded mb-2">
                  <Image src={relatedEbook.cover_image} alt={relatedEbook.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
                </div>
                <h4 className="font-medium text-sm group-hover:text-primary">{relatedEbook.title}</h4>
                <span className="text-primary text-sm">${relatedEbook.price.toFixed(2)}</span>
              </Link>
            )}
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
        </section>
      )}

      {/* More Videos */}
      {more.length > 0 && (
        <section className="py-12 bg-secondary/30 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="font-heading text-2xl font-bold mb-6">More Videos</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              {more.map((v) => (
                <Link key={v.id} to={`/watch/${v.slug}`} className="group">
                  <div className="relative aspect-video overflow-hidden rounded mb-2">
                    <Image src={v.thumbnail_url || `https://i.ytimg.com/vi/${v.youtube_id}/maxresdefault.jpg`} alt={v.title} className="w-full h-full group-hover:scale-105 transition-transform" fittingType="fill" />
                  </div>
                  <h4 className="font-medium group-hover:text-primary">{v.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}