import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EbookTile from "@/components/site/EbookTile";

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
        <div className="flex">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className="flex-[0_0_72%] min-w-0 pl-4 sm:flex-[0_0_42%] md:flex-[0_0_31%] md:pl-6 lg:flex-[0_0_23.5%]"
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
  return <EbookTile ebook={ebook} />;
}
