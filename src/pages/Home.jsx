import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles, Youtube, Facebook, Instagram, Music2 } from "lucide-react";
import Seo from "@/components/site/Seo";
import EmailCapture from "@/components/site/EmailCapture";
import EbookSlider from "@/components/site/EbookSlider";
import HeroCarousel from "@/components/site/HeroCarousel";
import VideoLibrary from "@/components/site/VideoLibrary";
import Testimonials from "@/components/site/Testimonials";
import { StudyCard, VideoCard, ProductCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";

const GEN = {
  jerusalem: "https://media.base44.com/images/public/6aa80a3918e73ce9a7b4d0f7/b6f3b85c0_generated_image.png",
  ruins: "https://media.base44.com/images/public/6aa80a3918e73ce9a7b4d0f7/a24bcc603_generated_image.png",
  storm: "https://media.base44.com/images/public/6aa80a3918e73ce9a7b4d0f7/e78d2b614_generated_image.png",
  figures: "https://media.base44.com/images/public/6aa80a3918e73ce9a7b4d0f7/3791339aa_generated_image.png",
  desert: "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&q=80",
  scrolls: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
};

const CATEGORIES = [
  { name: "Old Testament", slug: "old-testament", image: GEN.ruins },
  { name: "New Testament", slug: "new-testament", image: GEN.figures },
  { name: "Bible Prophecy", slug: "bible-prophecy", image: GEN.storm },
  { name: "Biblical History", slug: "biblical-history", image: GEN.desert },
  { name: "Biblical Mysteries", slug: "biblical-mysteries", image: GEN.scrolls },
  { name: "People of the Bible", slug: "people-of-the-bible", image: GEN.figures },
];

const SOCIALS = [
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "TikTok", icon: Music2, href: "https://tiktok.com" },
];

export default function Home() {
  const { studies, videos, ebooks, products, testimonials, siteContent, membershipStats, heroSlides, loading } = useSiteData();

  // Items flagged "featured" in Admin come first; the rest fill remaining slots.
  const featuredFirst = (list, n) => [...list.filter((i) => i.featured), ...list.filter((i) => !i.featured)].slice(0, n);
  const sliderEbooks = featuredFirst(ebooks, 8);
  const videoLibraryContent = siteContent.find((c) => c.section_key === "video_library");
  const latestStudies = studies.slice(0, 6);
  const featuredProducts = featuredFirst(products, 4);
  const popularVideos = videos.filter((v) => v.popular).slice(0, 4);
  const popularToShow = popularVideos.length >= 4 ? popularVideos : videos.slice(0, 4);

  return (
    <>
      <Seo
        title="Dark Network — Discover the Bible Like Never Before"
        description="Explore powerful biblical stories, historical insights, videos, studies and resources designed to help you understand Scripture more deeply."
      />

      {/* SECTION 1 — HERO */}
      {heroSlides.length > 0 ? (
        <HeroCarousel slides={heroSlides} />
      ) : (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden grain-overlay">
          <div className="absolute inset-0">
            <Image
              src={GEN.jerusalem}
              alt="Ancient biblical landscape"
              className="w-full h-full object-cover"
              fittingType="fill"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_35%,rgba(143,29,36,0.55),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_30%,rgba(246,216,115,0.16),transparent_65%)]" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-20 pb-16">
            <p className="flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-[#e6c56a] mb-6">
              <span className="h-px w-8 sm:w-14 bg-[#e6c56a]/60" />
              Cinematic Bible Discovery
              <span className="h-px w-8 sm:w-14 bg-[#e6c56a]/60" />
            </p>
            <h1 className="font-heading font-semibold text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[1.05] text-[#fbf1dc] text-balance mb-6 drop-shadow-[0_2px_16px_rgba(0,0,0,0.75)]">
              Discover the Bible
              <span className="block italic font-medium bg-gradient-to-b from-[#f0d78a] to-[#b58a30] bg-clip-text text-transparent">Like Never Before</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/85 max-w-2xl mx-auto mb-10 leading-relaxed">
              Explore powerful biblical stories, historical insights, videos, studies and resources
              designed to help you understand Scripture more deeply.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/bible-studies"
                className="btn-gold px-8 py-4 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Explore Bible Studies
              </Link>
              <Link
                to="/books"
                className="border border-[#e6c56a]/60 text-[#fbf1dc] px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-[#e6c56a] hover:text-[#241406] transition-all flex items-center justify-center gap-2"
              >
                Shop Books
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent z-[5]" />
        </section>
      )}

      {/* SECTION 2 — VIDEO LIBRARY */}
      <VideoLibrary content={videoLibraryContent} stats={membershipStats} />

      {/* SECTION 3 — EBOOK SLIDER */}
      {sliderEbooks.length > 0 && (
        <section className="dn-cream py-20 lg:py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              light
              eyebrow="Digital Library"
              title="Featured"
              accent="Ebooks"
              subtitle="Deep-dive Bible study guides you can read on any device — yours the moment you check out."
            />

            <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 mb-12 text-sm text-[#2b1d0a]/75 font-heading italic text-base">
              {["Instant download", "Secure checkout", "Read on any device"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#c9a24a]" aria-hidden="true">✦</span>{f}
                </li>
              ))}
            </ul>

            <EbookSlider ebooks={sliderEbooks} />

            <div className="text-center mt-12">
              <Link to="/books" className="btn-gold inline-flex items-center gap-2 px-8 py-3.5 rounded uppercase text-sm tracking-wide">
                View All Books <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4 — FEATURED POD / MERCHANDISE */}
      <section className="py-20 lg:py-28 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Print-on-Demand</p>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">Shop the <em className="italic text-primary">Collection</em></h2>
              <p className="text-muted-foreground mt-3 max-w-xl">Wear your faith. Apparel, wall art, mugs and gifts — designed with the Word, printed and fulfilled through Spring.</p>
            </div>
            <Link to="/shop" className="text-primary font-medium uppercase text-sm tracking-wide hover:underline flex items-center gap-1">
              Explore the Collection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading products…</div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Products coming soon.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5 — TESTIMONIALS */}
      <Testimonials testimonials={testimonials} />

      {/* SECTION 7 — EXPLORE THE BIBLE (tạm ẩn — xoá `false &&` để hiện lại) */}
      {false && (
      <section className="py-20 lg:py-28 grain-overlay">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Library"
            title="Explore the Bible"
            subtitle="Journey through Scripture across six editorial collections — from ancient texts to unsolved mysteries."
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/bible-studies?category=${encodeURIComponent(cat.name)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded glow-bronze"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                  fittingType="fill"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <h3 className="font-heading text-xl md:text-2xl font-semibold text-white group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-xs uppercase tracking-wide text-foreground/60 group-hover:text-primary flex items-center gap-1 mt-1">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* SECTION 6 — LATEST BIBLE STUDIES (tạm ẩn — xoá `false &&` để hiện lại) */}
      {false && (
      <section className="py-20 lg:py-28 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Fresh from the archive</p>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">Latest Bible Studies</h2>
            </div>
            <Link to="/bible-studies" className="text-primary font-medium uppercase text-sm tracking-wide hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading studies…</div>
          ) : latestStudies.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Studies coming soon.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestStudies.map((s) => (
                <StudyCard key={s.id} study={s} />
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* SECTION 7 — FREE RESOURCE / EMAIL */}
      <section className="py-20 lg:py-28 border-y border-border/50 grain-overlay">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-5" />
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4 text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
            Get Your Free Bible Study Guide
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Receive free Bible studies, historical insights and new biblical resources — delivered
            straight to your inbox.
          </p>
          <EmailCapture source="Homepage Hero" />
        </div>
      </section>

      {/* SECTION 8 — POPULAR VIDEOS */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Most Watched</p>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">Popular Videos</h2>
            </div>
            <Link to="/watch" className="text-primary font-medium uppercase text-sm tracking-wide hover:underline flex items-center gap-1">
              Watch All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading videos…</div>
          ) : popularToShow.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Videos coming soon.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularToShow.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 9 — SOCIAL */}
      <section className="py-16 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">Follow the Journey</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of thousands across the Dark Network channels.</p>
          <div className="flex justify-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary transition-all glow-bronze"
              >
                <s.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}