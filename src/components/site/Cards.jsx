import { Link } from "react-router-dom";
import { Play, Download, Mail } from "lucide-react";
import { Image } from "@/components/ui/image";
import { ProductCardWithPreview } from "@/components/site/QuickPreview";
import EbookTile from "@/components/site/EbookTile";
import Ornament from "@/components/site/Ornament";

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
  return <EbookTile ebook={ebook} />;
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

export function SectionHeading({ eyebrow, title, accent, subtitle, center = true, light = false }) {
  return (
    <div className={`mb-10 ${center ? "text-center" : ""}`}>
      {center && <Ornament light={light} className="mb-5" />}
      {eyebrow && (
        <p className={`text-xs font-semibold uppercase tracking-[0.25em] mb-3 ${light ? "text-[#8a6420]" : "text-primary"}`}>{eyebrow}</p>
      )}
      <h2 className={`font-heading text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.1] text-balance ${light ? "text-[#2b1d0a]" : "drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"}`}>
        {title}
        {accent && <> <em className={`italic ${light ? "text-[#a87f2e]" : "text-primary"}`}>{accent}</em></>}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg ${light ? "text-[#2b1d0a]/70" : "text-muted-foreground"} ${center ? "max-w-2xl mx-auto" : "max-w-2xl"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
