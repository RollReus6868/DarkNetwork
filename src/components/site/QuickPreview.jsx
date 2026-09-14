import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDiscountPercentage } from "@/lib/pricing";
import { ProductTextPrice } from "@/components/site/ProductTextPrice";

function CtaButtons({ product }) {
  return (
    <div className="flex flex-col gap-2 w-full">
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeImg}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {images[activeImg] ? (
            <Image src={images[activeImg]} alt={product.title} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
          )}
        </motion.div>
      </AnimatePresence>
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

  // Desktop: two-column — left ~65% (image + thumbnails), right ~35% (title, price, CTAs)
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-2xl">
      <div className="flex">
        <div className="w-[65%] flex-shrink-0">
          <motion.div
            initial={{ scale: 1.02, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <MainImage product={product} activeImg={activeImg} />
          </motion.div>
          <Thumbnails product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
        </div>
        <div className="w-[35%] flex flex-col justify-center gap-4 p-4 border-l border-border">
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
    </div>
  );
}

function DesktopHoverPanel({ product, cardRef, onClose, onCancelClose, closing }) {
  const [activeImg, setActiveImg] = useState(0);
  const [pos, setPos] = useState(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 580;
    const panelH = 470;
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
  }, [cardRef]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <motion.div
      ref={panelRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 60, transformOrigin: "center" }}
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={closing ? { opacity: 0, scale: 0.98, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: closing ? 0.15 : 0.22, ease: "easeOut" }}
      onMouseEnter={onCancelClose}
      onMouseLeave={onClose}
    >
      <PreviewBody product={product} activeImg={activeImg} setActiveImg={setActiveImg} />
    </motion.div>,
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
  const [hovered, setHovered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardRef = useRef(null);
  const closeTimer = useRef(null);
  const exitTimer = useRef(null);
  const images = product.images || [];
  const discount = getDiscountPercentage(product.price, product.original_price);

  useEffect(() => () => {
    clearTimeout(closeTimer.current);
    clearTimeout(exitTimer.current);
  }, []);

  const scheduleClose = () => {
    if (isMobile) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setClosing(true);
      clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => {
        setHovered(false);
        setClosing(false);
      }, 160);
    }, 200);
  };

  const cancelClose = () => {
    clearTimeout(closeTimer.current);
    clearTimeout(exitTimer.current);
    if (closing) setClosing(false);
  };

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
        onMouseEnter={() => { if (!isMobile) { cancelClose(); setHovered(true); } }}
        onMouseLeave={() => { if (!isMobile) scheduleClose(); }}
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

      {/* Desktop hover panel */}
      {!isMobile && (hovered || closing) && (
        <DesktopHoverPanel
          product={product}
          cardRef={cardRef}
          onClose={scheduleClose}
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