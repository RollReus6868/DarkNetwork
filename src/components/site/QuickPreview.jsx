import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDiscountPercentage } from "@/lib/pricing";
import { ProductTextPrice } from "@/components/site/ProductTextPrice";

const HOVER_INTENT_MS = 1000;
const CLOSE_GRACE_MS = 200;
const EXIT_MS = 160;

function CtaButtons({ product }) {
  return (
    <div className="flex flex-col gap-2">
      <a
        href={product.spring_url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-primary text-primary-foreground px-3 py-2.5 rounded font-semibold uppercase text-xs tracking-wide hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 glow-bronze"
      >
        Buy on Spring <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <Link
        to={`/shop/${product.slug}`}
        className="w-full border border-border text-foreground px-3 py-2.5 rounded font-semibold uppercase text-xs tracking-wide hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
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
    <div className="relative w-full aspect-square overflow-hidden bg-secondary">
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
        <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-10">
          SALE {discount}%
        </span>
      )}
    </div>
  );
}

function Thumbnails({ product, activeImg, setActiveImg }) {
  const images = product.images || [];
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-1.5 p-2 bg-black/40 overflow-x-auto scrollbar-hide">
      {images.slice(0, 8).map((img, i) => (
        <button
          key={i}
          onMouseEnter={() => setActiveImg(i)}
          onClick={() => setActiveImg(i)}
          className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
            activeImg === i ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-90"
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
          <ProductTextPrice
            title={product.title}
            price={product.price}
            originalPrice={product.original_price}
            compact
            priceVariant="pill"
            id={product.id}
            showDescription={false}
          />
        </div>
        <div className="mt-3">
          <CtaButtons product={product} />
        </div>
      </>
    );
  }

  // Desktop: simplified two-column layout — left = image + thumbnails, right = title + price + CTAs
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-2xl flex">
      <div className="w-[62%] flex-shrink-0">
        <MainImage product={product} activeImg={activeImg} />
        <Thumbnails product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
      </div>
      <div className="w-[38%] flex flex-col gap-3 p-4 justify-center">
        <ProductTextPrice
          title={product.title}
          price={product.price}
          originalPrice={product.original_price}
          compact
          priceVariant="pill"
          id={product.id}
          showDescription={false}
        />
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
        className="group block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link to={`/shop/${product.slug}`} onClick={handleCardClick}>
          <div className="relative aspect-square overflow-hidden bg-secondary rounded mb-3 glow-bronze-group border border-border/60 group-hover:border-primary/60 transition-all duration-500">
            {images[0] && (
              <Image
                src={images[0]}
                alt={product.title}
                className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                fittingType="fill"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-50" />
            <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 backdrop-blur px-2.5 py-1 rounded text-primary border border-primary/30">
              {product.category}
            </span>
            {discount !== null && (
              <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-10">
                SALE {discount}%
              </span>
            )}
          </div>
          <ProductTextPrice
            title={product.title}
            price={product.price}
            originalPrice={product.original_price}
            compact
            priceVariant="pill"
            id={product.id}
            showDescription={false}
            titleClassName="group-hover:text-primary transition-colors"
          />
        </Link>
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