import { Link } from "react-router-dom";
import { Play, ArrowRight, BookOpen, Download, Mail } from "lucide-react";
import { Image } from "@/components/ui/image";

export function StudyCard({ study }) {
  return (
    <Link to={`/bible-studies/${study.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden bg-secondary rounded">
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
        <div className="relative aspect-video overflow-hidden bg-secondary rounded mb-3">
          <Image
            src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_id}/maxresdefault.jpg`}
            alt={video.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
            fittingType="fill"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
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
  return (
    <Link to={`/books/${ebook.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary rounded mb-4 shadow-lg">
        <Image
          src={ebook.cover_image}
          alt={ebook.title}
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
        <div className="absolute bottom-3 left-3 right-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary bg-black/70 backdrop-blur px-2 py-0.5 rounded">
            Digital Book
          </span>
        </div>
      </div>
      <h3 className="font-heading text-lg font-semibold leading-tight mb-1 group-hover:text-primary transition-colors">
        {ebook.title}
      </h3>
      {ebook.subtitle && <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{ebook.subtitle}</p>}
      <div className="flex items-center justify-between">
        <span className="text-primary font-semibold">${ebook.price.toFixed(2)}</span>
        <span className="text-xs uppercase tracking-wide text-foreground/60 group-hover:text-primary flex items-center gap-1">
          View Book <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

export function ProductCard({ product }) {
  const isBook = product.category === "Books";
  return (
    <Link to={`/shop/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-secondary rounded mb-3">
        {product.images?.[0] && (
          <Image
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
            fittingType="fill"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-50" />
        <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2.5 py-1 rounded text-primary border border-primary/30">
          {product.category}
        </span>
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2 py-0.5 rounded text-foreground/80">
          {isBook ? "Digital" : "POD"}
        </span>
      </div>
      <h3 className="font-heading text-lg font-semibold leading-tight mb-1 group-hover:text-primary transition-colors">
        {product.title}
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-primary font-semibold">${product.price.toFixed(2)}</span>
        <span className="text-xs uppercase tracking-wide text-foreground/60 group-hover:text-primary flex items-center gap-1">
          View Product <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

export function FreeResourceCard({ resource }) {
  return (
    <div className="group bg-card border border-border rounded overflow-hidden hover:border-primary/50 transition-colors">
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