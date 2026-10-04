import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Image } from "@/components/ui/image";
import { loopSlides } from "@/lib/carouselLoop";
import { EbookBuyButton } from "@/components/site/EbookBuyButton";
import EbookPartBadge from "@/components/site/EbookPartBadge";
import { formatPrice, getDiscountPercentage } from "@/lib/pricing";

const SLIDE = "min-w-0 flex-[0_0_72%] sm:flex-[0_0_46%] md:flex-[0_0_34%] lg:flex-[0_0_27%] pl-4 sm:pl-6";

export default function RelatedEbooks({ ebooks = [] }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
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

  // Nhân bản danh sách để vòng lặp không đứt khi chỉ có vài quyển liên quan
  const slides = loopSlides(ebooks);

  const arrowCls =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full btn-gold items-center justify-center transition-opacity duration-300 disabled:opacity-0 disabled:pointer-events-none";

  return (
    <section className="py-14 bg-secondary/30 border-y border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="font-heading text-2xl font-bold mb-1">Các ebook khác</h2>
        <p className="text-sm text-muted-foreground mb-6">Tiếp tục hành trình với những quyển liên quan.</p>

        {reducedMotion ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {ebooks.map((ebook) => (
              <RelatedEbookCard key={ebook.id} ebook={ebook} />
            ))}
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              aria-label="Ebook trước"
              className={`${arrowCls} -left-5`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              aria-label="Ebook tiếp theo"
              className={`${arrowCls} -right-5`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              ref={emblaRef}
              className="overflow-hidden py-4 -my-4"
              role="region"
              aria-roledescription="carousel"
              aria-label="Các ebook khác"
            >
              <div className="flex items-stretch">
                {slides.map(({ item: ebook, key }) => (
                  <div key={key} className={SLIDE}>
                    <RelatedEbookCard ebook={ebook} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RelatedEbookCard({ ebook }) {
  const discount = getDiscountPercentage(ebook.price, ebook.original_price);

  return (
    <div className="flex flex-col h-full border border-border rounded overflow-hidden bg-card/40 transition-colors hover:border-primary/60">
      <Link to={`/books/${ebook.slug}`} className="group flex flex-col flex-1 min-w-0">
        <div className="relative aspect-[5/7] overflow-hidden bg-secondary">
          <Image src={ebook.cover_image} alt={ebook.title} className="w-full h-full" fittingType="fill" />
          <EbookPartBadge ebook={ebook} className="absolute top-3 right-3 z-10" />
        </div>
        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-heading text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {ebook.title}
          </h3>
          {ebook.subtitle && (
            <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">{ebook.subtitle}</p>
          )}
          <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 mt-auto pt-3">
            <span className="font-heading text-xl font-bold text-primary leading-none">{formatPrice(ebook.price)}</span>
            {discount !== null && (
              <>
                <span className="text-sm text-muted-foreground line-through">{formatPrice(ebook.original_price)}</span>
                <span className="badge-gold">-{discount}%</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <EbookBuyButton ebook={ebook} variant="row" />
      </div>
    </div>
  );
}