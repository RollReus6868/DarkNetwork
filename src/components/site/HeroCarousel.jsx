import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, BookOpen, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function HeroCarousel({ slides = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setCount(emblaApi.scrollSnapList().length);
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || count <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), 6000);
    return () => clearInterval(id);
  }, [emblaApi, count]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (slides.length === 0) return null;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden grain-overlay">
      <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
        <div className="flex h-full">
          {slides.map((slide, i) => (
            <div key={slide.id || i} className="flex-[0_0_100%] min-w-0 relative h-full">
              <Image src={slide.image} alt={slide.title} className="w-full h-full object-cover" fittingType="fill" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-20 pb-16">
                  {slide.eyebrow && (
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-primary mb-5">{slide.eyebrow}</p>
                  )}
                  <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] text-white text-balance mb-6">
                    {slide.title}
                  </h1>
                  {slide.description && (
                    <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">{slide.description}</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {slide.cta1_label && <CtaButton label={slide.cta1_label} url={slide.cta1_url} primary />}
                    {slide.cta2_label && <CtaButton label={slide.cta2_label} url={slide.cta2_url} />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button onClick={scrollPrev} aria-label="Previous slide" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur border border-border items-center justify-center text-foreground/80 hover:text-primary hover:border-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={scrollNext} aria-label="Next slide" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur border border-border items-center justify-center text-foreground/80 hover:text-primary hover:border-primary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <button key={i} onClick={() => emblaApi?.scrollTo(i)} aria-label={`Go to slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/60"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent z-[5]" />
    </section>
  );
}

function CtaButton({ label, url, primary }) {
  const isInternal = url && url.startsWith("/");
  const cls = primary
    ? "bg-primary text-primary-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2 glow-bronze"
    : "border border-foreground/30 text-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-foreground hover:text-background transition-all flex items-center justify-center gap-2 glow-bronze";
  const icon = primary ? <BookOpen className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />;
  if (isInternal) {
    return <Link to={url} className={cls}>{label}{icon}</Link>;
  }
  return <a href={url || "#"} target="_blank" rel="noopener noreferrer" className={cls}>{label}{icon}</a>;
}