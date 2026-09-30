import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDiscountPercentage, formatPrice } from "@/lib/pricing";

const HOVER_INTENT_MS = 1000;

// Price row: big serif price (deep red on cream, gold on dark) + struck-through original.
function PriceRow({ product, tone = "cream", size = "lg" }) {
  const discount = getDiscountPercentage(product.price, product.original_price);
  const main = tone === "cream" ? "text-[#8f1d24]" : "text-[#e6c56a]";
  const old = tone === "cream" ? "text-[#2b1d0a]/50" : "text-foreground/50";
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={`font-heading font-bold leading-none ${main} ${size === "lg" ? "text-3xl" : "text-2xl"}`}>{formatPrice(product.price)}</span>
      {discount !== null && <span className={`text-sm line-through ${old}`}>{formatPrice(product.original_price)}</span>}
    </div>
  );
}
const CLOSE_GRACE_MS = 200;
const EXIT_MS = 160;

function CtaButtons({ product, tone = "cream" }) {
  const ghost = tone === "cream"
    ? "border-[#a87f2e]/60 text-[#5a3a1f] hover:bg-[#a87f2e]/15"
    : "border-border text-foreground hover:border-primary hover:text-primary";
  return (
    <div className="flex flex-col gap-2">
      <a
        href={product.spring_url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold w-full px-3 py-2.5 rounded uppercase text-xs tracking-wide flex items-center justify-center gap-1.5"
      >
        Buy on Spring <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <Link
        to={`/shop/${product.slug}`}
        className={`w-full border ${ghost} px-3 py-2.5 rounded font-semibold uppercase text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5`}
      >
        View Details <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function MainImage({ product, activeImg }) {
  const images = product.images || [];
  const discount = getDiscountPercentage(product.price, product.original_price);
  return (
    <div className="dn-book-cover relative w-full aspect-square overflow-hidden !rounded-none">
      {images[activeImg] ? (
        <Image
          src={images[activeImg]}
          alt={product.title}
          className="w-full h-full"
          fittingType="fill"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
      )}
      {discount !== null && (
        <span className="badge-gold absolute top-3 right-3 z-10">Save {discount}%</span>
      )}
    </div>
  );
}

function Thumbnails({ product, activeImg, setActiveImg }) {
  const images = product.images || [];
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-1.5 p-2 bg-[#2b1d0a]/10 overflow-x-auto scrollbar-hide">
      {images.slice(0, 8).map((img, i) => (
        <button
          key={i}
          onMouseEnter={() => setActiveImg(i)}
          onClick={() => setActiveImg(i)}
          className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
            activeImg === i ? "border-[#a87f2e] opacity-100" : "border-transparent opacity-60 hover:opacity-90"
          }`}
        >
          <Image src={img} alt="" className="w-full h-full" fittingType="fill" />
        </button>
      ))}
    </div>
  );
}

function PreviewBody({ product, activeImg, setActiveImg, layout = "desktop" }) {
  if (layout === "mobile") {
    return (
      <>
        <MainImage product={product} activeImg={activeImg} />
        <Thumbnails product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
        <div className="pt-4">
          <PriceRow product={product} tone="dark" />
        </div>
        <div className="mt-3">
          <CtaButtons product={product} tone="dark" />
        </div>
      </>
    );
  }

  // Desktop: left = image + thumbnails, right = title + price + CTAs (cream panel)
  return (
    <div className="bg-gradient-to-b from-[#fefbf2] to-[#f5ead0] border border-[#a87f2e]/50 rounded-lg overflow-hidden shadow-2xl flex text-[#2b1d0a]">
      <div className="w-[62%] flex-shrink-0">
        <MainImage product={product} activeImg={activeImg} />
        <Thumbnails product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
      </div>
      <div className="w-[38%] flex flex-col gap-4 p-5 justify-center">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6420]">{product.category}</span>
          <h3 className="font-heading text-2xl font-semibold leading-tight mt-1 mb-3">{product.title}</h3>
          <PriceRow product={product} />
        </div>
        <CtaButtons product={product} />
      </div>
    </div>
  );
}

function DesktopHoverPanel({ product, cardRef, onClose, onCancelClose, closing }) {
  const [activeImg, setActiveImg] = useState(0);
  const [pos, setPos] = useState(null);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 580;
    const panelH = 520;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Overlap ~1/3 of the card image width
    const overlap = rect.width / 3;

    let left = rect.right - overlap;
    if (left + panelW > vw - 16) {
      left = rect.left - panelW + overlap;
    }
    if (left < 16) left = 16;
    if (left + panelW > vw - 16) left = vw - panelW - 16;

    let top = rect.top;
    if (top + panelH > vh - 16) top = vh - panelH - 16;
    if (top < 16) top = 16;

    setPos({ top, left, width: panelW });
    // Trigger entrance animation on next frame
    requestAnimationFrame(() => setEntered(true));
  }, [cardRef]);

  // Play exit animation when closing flips to true
  useEffect(() => {
    if (closing) setEntered(false);
  }, [closing]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 60,
        opacity: entered ? 1 : 0,
        transform: entered
          ? "translateY(0) scale(1)"
          : "translateY(10px) scale(0.97)",
        transition: `opacity ${EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`,
      }}
      onMouseEnter={onCancelClose}
      onMouseLeave={onClose}
    >
      <PreviewBody product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
    </div>,
    document.body
  );
}

function MobilePreviewDrawer({ product, open, onOpenChange }) {
  const [activeImg, setActiveImg] = useState(0);
  useEffect(() => { if (open) setActiveImg(0); }, [open, product.id]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-card border-border max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-heading text-lg">{product.title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <PreviewBody product={product} activeImg={activeImg} setActiveImg={setActiveImg} layout="mobile" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ProductCardWithPreview({ product }) {
  const isMobile = useIsMobile();
  const [panelOpen, setPanelOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const images = product.images || [];
  const discount = getDiscountPercentage(product.price, product.original_price);

  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (isMobile) return;
    clearCloseTimer();
    // If already open (or closing), don't restart the intent timer
    if (panelOpen || closing) return;
    clearOpenTimer();
    openTimer.current = setTimeout(() => {
      setPanelOpen(true);
      setClosing(false);
      openTimer.current = null;
    }, HOVER_INTENT_MS);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      // Run exit animation then unmount
      setClosing(true);
      setTimeout(() => {
        setPanelOpen(false);
        setClosing(false);
      }, EXIT_MS);
      closeTimer.current = null;
    }, CLOSE_GRACE_MS);
  };

  const cancelClose = () => {
    clearCloseTimer();
  };

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, []);

  const handleCardClick = (e) => {
    if (isMobile) {
      e.preventDefault();
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className="group block h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <article className="dn-book flex flex-col overflow-hidden h-full">
          <Link to={`/shop/${product.slug}`} onClick={handleCardClick} className="block" aria-label={`View ${product.title}`}>
            <div className="dn-book-cover relative aspect-square overflow-hidden">
              {images[0] && (
                <Image
                  src={images[0]}
                  alt={product.title}
                  className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                  fittingType="fill"
                />
              )}
              <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-[#1a0f08]/75 backdrop-blur px-2.5 py-1 rounded text-[#e6c56a] border border-[#e6c56a]/30">
                {product.category}
              </span>
              {discount !== null && <span className="badge-gold absolute top-3 right-3 z-10">Save {discount}%</span>}
            </div>
          </Link>
          <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
            <Link to={`/shop/${product.slug}`} onClick={handleCardClick} className="block">
              <h3 className="font-heading text-lg leading-tight font-semibold text-[#2b1d0a] group-hover:text-[#8a6420] transition-colors line-clamp-2 min-h-[2.75rem]">
                {product.title}
              </h3>
            </Link>
            <div className="flex items-center justify-between gap-3 mt-3">
              <PriceRow product={product} size="md" />
              <Link
                to={`/shop/${product.slug}`}
                onClick={handleCardClick}
                className="btn-gold px-3.5 py-2 rounded uppercase text-[11px] tracking-wide flex items-center gap-1"
              >
                View <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </article>
      </div>

      {/* Desktop hover panel — kept mounted during exit animation */}
      {!isMobile && panelOpen && (
        <DesktopHoverPanel
          product={product}
          cardRef={cardRef}
          onClose={handleMouseLeave}
          onCancelClose={cancelClose}
          closing={closing}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <MobilePreviewDrawer product={product} open={drawerOpen} onOpenChange={setDrawerOpen} />
      )}
    </>
  );
}