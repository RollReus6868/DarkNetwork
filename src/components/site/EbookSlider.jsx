import { useState, useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function EbookSlider({ ebooks = [] }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [AutoScroll({ playOnInit: true, stopOnInteraction: false, stopOnMouseEnter: true, speed: 0.8 })]
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi, updateButtons]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!ebooks || ebooks.length === 0) return null;

  // Reduced motion: static responsive grid, no auto-scroll
  if (reducedMotion) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {ebooks.map((ebook) => (
          <SliderCard key={ebook.id} ebook={ebook} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Arrows */}
      <button
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous books"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-11 h-11 rounded-full bg-card/80 backdrop-blur border border-border items-center justify-center text-foreground/80 hover:text-primary hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next books"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-11 h-11 rounded-full bg-card/80 backdrop-blur border border-border items-center justify-center text-foreground/80 hover:text-primary hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={emblaRef}
        className="overflow-hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured ebooks"
      >
        <div className="flex">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className="flex-[0_0_70%] min-w-0 pl-4 md:flex-[0_0_30%] md:pl-6 lg:flex-[0_0_22%]"
            >
              <SliderCard ebook={ebook} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SliderCard({ ebook }) {
  return (
    <Link
      to={`/books/${ebook.slug}`}
      className="group block h-full"
      aria-label={`View ${ebook.title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-secondary border border-border/60 group-hover:border-primary/60 transition-all duration-500 shadow-lg group-hover:shadow-[0_0_30px_-8px] group-hover:shadow-primary/30">
        <Image
          src={ebook.cover_image}
          alt={ebook.title}
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4">
          <h3 className="font-heading text-lg lg:text-xl font-semibold text-white leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {ebook.title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-primary font-semibold text-sm">${ebook.price.toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-foreground/60 group-hover:text-primary transition-colors">
              Digital Book
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}