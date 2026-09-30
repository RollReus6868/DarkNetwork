import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EbookTile from "@/components/site/EbookTile";

// Featured ebooks keep the roomy slide; when at least one book is featured the
// rest are rendered smaller so the featured tile reads as the hero of the row.
const SLIDE_BASE = "min-w-0 pl-4 md:pl-6";
const SLIDE_FEATURED = "flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_44%] lg:flex-[0_0_33%]";
const SLIDE_COMPACT = "flex-[0_0_70%] sm:flex-[0_0_44%] md:flex-[0_0_39%] lg:flex-[0_0_29%]";

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

  const hasFeatured = ebooks.some((e) => e.featured);

  // Reduced motion: static responsive grid, no auto-scroll
  if (reducedMotion) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-center gap-6 max-w-sm sm:max-w-none mx-auto">
        {ebooks.map((ebook) => (
          <SliderCard key={ebook.id} ebook={ebook} hasFeatured={hasFeatured} />
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
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-12 h-12 rounded-full btn-gold items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a87f2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf4e6]"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next books"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-12 h-12 rounded-full btn-gold items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a87f2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf4e6]"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={emblaRef}
        className="overflow-hidden py-4 -my-4"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured ebooks"
      >
        <div className="flex items-center">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className={`${SLIDE_BASE} ${hasFeatured && !ebook.featured ? SLIDE_COMPACT : SLIDE_FEATURED}`}
            >
              <SliderCard ebook={ebook} hasFeatured={hasFeatured} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SliderCard({ ebook, hasFeatured }) {
  return <EbookTile ebook={ebook} compact={hasFeatured && !ebook.featured} />;
}