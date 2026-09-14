import { Link } from "react-router-dom";
import { Play, ArrowRight, BookOpen, Download, Mail } from "lucide-react";
import { Image } from "@/components/ui/image";
import { PriceButton } from "@/components/site/PriceButton";
import { EbookBuyButton } from "@/components/site/EbookBuyButton";
import { ProductCardWithPreview } from "@/components/site/QuickPreview";
import { getDiscountPercentage } from "@/lib/pricing";
import { stripHtml } from "@/lib/gradients";

export function StudyCard({ study }) {
  return (
    <Link to={`/bible-studies/${study.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden bg-secondary rounded glow-bronze-group">
        <Image
          src={study.hero_image}
          alt={study.title}
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2.5 py-1 rounded text-primary border border-primary/30">
          {study.category}
        </span>
        <div className="absolute bottom-0 inset-x-0 p-4">
          <h3 className="font-heading text-xl lg:text-2xl font-semibold text-white leading-tight mb-1 group-hover:text-primary transition-colors">
            {study.title}
          </h3>
          <p className="text-sm text-foreground/70 line-clamp-2">{study.excerpt}</p>
        </div>
      </div>
    </Link>
  );
}

export function VideoCard({ video }) {
  return (
    <div className="group">
      <Link to={`/watch/${video.slug}`}>
        <div className="relative aspect-video overflow-hidden bg-secondary rounded mb-3 glow-bronze-group">
          <Image
            src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_id}/maxresdefault.jpg`}
            alt={video.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
            fittingType="fill"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#FF0000] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2.5 py-1 rounded text-primary border border-primary/30">
            {video.category}
          </span>
        </div>
      </Link>
      <Link to={`/watch/${video.slug}`}>
        <h3 className="font-heading text-lg font-semibold leading-tight mb-1 hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
      </Link>
    </div>
  );
}

export function EbookCard({ ebook }) {
  const discount = getDiscountPercentage(ebook.price, ebook.original_price);
  return (
    <div className="group block">
      <Link to={`/books/${ebook.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary rounded mb-4 shadow-lg glow-bronze-group border border-border/60 group-hover:border-primary/60 transition-all duration-500">
          <Image
            src={ebook.cover_image}
            alt={ebook.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
            fittingType="fill"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
          {discount !== null && (
            <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-10">
              SALE {discount}%
            </span>
          )}
          <div className="absolute bottom-3 left-3 right-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary bg-black/70 backdrop-blur px-2 py-0.5 rounded">
              Digital Book
            </span>
          </div>
          {/* Hover popup */}
          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end z-20">
            <p className="text-sm text-foreground/80 line-clamp-3 mb-3">{stripHtml(ebook.description)}</p>
            {ebook.what_you_learn?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary mb-1.5">What You'll Learn</p>
                <ul className="space-y-1">
                  {ebook.what_you_learn.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="line-clamp-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <h3 className="font-heading text-xl font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
          {ebook.title}
        </h3>
        {ebook.subtitle && <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{ebook.subtitle}</p>}
      </Link>
      <div className="mb-3">
        <PriceButton id={ebook.id} price={ebook.price} originalPrice={ebook.original_price} />
      </div>
      <EbookBuyButton ebook={ebook} variant="card" />
    </div>
  );
}

export function ProductCard({ product }) {
  return <ProductCardWithPreview product={product} />;
}

export function FreeResourceCard({ resource }) {
  return (
    <div className="group bg-card border border-border rounded overflow-hidden hover:border-primary/50 transition-all duration-500 glow-bronze">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Image
          src={resource.cover_image}
          alt={resource.title}
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fittingType="fill"
        />
        <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2.5 py-1 rounded text-primary border border-primary/30">
          {resource.resource_type}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-heading text-lg font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{resource.description}</p>
        <div className="flex items-center gap-1.5 text-primary text-sm font-medium uppercase tracking-wide">
          {resource.requires_email ? <Mail className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {resource.requires_email ? "Get Free Access" : "Download Free"}
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center = true }) {
  return (
    <div className={`mb-10 ${center ? "text-center" : ""}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">{eyebrow}</p>
      )}
      <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-muted-foreground mt-4 text-lg ${center ? "max-w-2xl mx-auto" : "max-w-2xl"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}