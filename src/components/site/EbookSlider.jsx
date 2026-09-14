import { useState, useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import { PriceButton } from "@/components/site/PriceButton";
import { stripHtml } from "@/lib/gradients";

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
  const discounted = (ebook.price * 0.7).toFixed(2);
  return (
    <Link
      to={`/books/${ebook.slug}`}
      className="group block h-full"
      aria-label={`View ${ebook.title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-secondary border border-border/60 group-hover:border-primary/60 shadow-lg glow-bronze-group">
        <Image
          src={ebook.cover_image}
          alt={ebook.title}
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-10">
          Sale 30%
        </span>
        {/* Default content — fades out on hover */}
        <div className="absolute bottom-0 inset-x-0 p-4 transition-opacity duration-300 group-hover:opacity-0">
          <h3 className="font-heading text-xl lg:text-2xl font-semibold text-white leading-tight line-clamp-2 mb-3">
            {ebook.title}
          </h3>
          <PriceButton id={ebook.id} originalPrice={ebook.price} discountedPrice={discounted} />
        </div>
        {/* Hover popup */}
        <div className="absolute inset-0 bg-black/92 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end z-20">
          <h3 className="font-heading text-xl lg:text-2xl font-semibold text-white leading-tight mb-2 line-clamp-2">
            {ebook.title}
          </h3>
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
          <PriceButton id={ebook.id} originalPrice={ebook.price} discountedPrice={discounted} />
        </div>
      </div>
    </Link>
  );
}