import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/site/Cards";
import { loopSlides } from "@/lib/carouselLoop";

// Hàng trượt sản phẩm POD ở trang chủ: tự chạy và lặp vòng liên tục, cỡ thẻ giữ
// như lưới cũ (2 sản phẩm trên điện thoại, 4 trên desktop).
const SLIDE = "min-w-0 pl-4 md:pl-6 flex-[0_0_50%] md:flex-[0_0_33.3333%] lg:flex-[0_0_25%]";

export default function ProductSlider({ products = [] }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [AutoScroll({ playOnInit: true, stopOnInteraction: false, stopOnMouseEnter: true, speed: 0.8 })]
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!products || products.length === 0) return null;

  const slides = loopSlides(products);

  // Giảm chuyển động: giữ nguyên lưới tĩnh, không tự trượt
  if (reducedMotion) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 items-start gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  const arrowCls =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full btn-gold items-center justify-center";

  return (
    <div className="relative">
      <button onClick={() => emblaApi?.scrollPrev()} aria-label="Previous products" className={`${arrowCls} left-0 -translate-x-2`}>
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => emblaApi?.scrollNext()} aria-label="Next products" className={`${arrowCls} right-0 translate-x-2`}>
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={emblaRef}
        className="overflow-hidden py-4 -my-4"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured products"
      >
        <div className="flex items-stretch">
          {slides.map(({ item: product, key }) => (
            <div key={key} className={SLIDE}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}