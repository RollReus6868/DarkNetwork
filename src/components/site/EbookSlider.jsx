import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EbookTile from "@/components/site/EbookTile";
import { loopSlides } from "@/lib/carouselLoop";

const SLIDE = "min-w-0 pl-4 md:pl-6 flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_44%] lg:flex-[0_0_33%]";
// Sách lẻ theo từng part hiển thị nhỏ hơn khoảng 30% cho gọn hàng.
const SLIDE_COMPACT = "min-w-0 pl-4 md:pl-6 flex-[0_0_48%] sm:flex-[0_0_32%] md:flex-[0_0_26%] lg:flex-[0_0_19.5%]";

// Một hàng trượt ebook ở trang chủ: tiêu đề nhóm phía trên, nút qua lại hai đầu.
export default function EbookSlider({ title, ebooks = [], compact = false }) {
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

  if (!ebooks || ebooks.length === 0) return null;

  // Nhân bản danh sách để vòng lặp không đứt khi hàng có ít sách
  const slides = loopSlides(ebooks);

  const heading = (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6420] whitespace-nowrap">
        {title}
      </span>
      <span className="h-px flex-1 bg-[#2b1d0a]/15" />
    </div>
  );

  // Reduced motion: static responsive grid, no auto-scroll
  if (reducedMotion) {
    return (
      <div>
        {heading}
        <div
          className={`grid grid-cols-1 items-center gap-6 max-w-sm sm:max-w-none mx-auto ${
            compact ? "sm:grid-cols-4 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {ebooks.map((ebook) => (
            <EbookTile key={ebook.id} ebook={ebook} compact={compact} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div className="relative">
        {/* Arrows */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          aria-label={`Previous books in ${title || "this row"}`}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-12 h-12 rounded-full btn-gold items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a87f2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf4e6]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          aria-label={`Next books in ${title || "this row"}`}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-12 h-12 rounded-full btn-gold items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a87f2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf4e6]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={emblaRef}
          className="overflow-hidden py-4 -my-4"
          role="region"
          aria-roledescription="carousel"
          aria-label={title}
        >
          <div className="flex items-center">
            {slides.map(({ item: ebook, key }) => (
              <div key={key} className={compact ? SLIDE_COMPACT : SLIDE}>
                <EbookTile ebook={ebook} compact={compact} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}