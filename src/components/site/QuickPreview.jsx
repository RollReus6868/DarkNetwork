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
import { stripHtml } from "@/lib/gradients";

function PreviewBody({ product, activeImg, setActiveImg, compact = false }) {
  const images = product.images || [];
  const discount = getDiscountPercentage(product.price, product.original_price);

  return (
    <div className={compact ? "" : "bg-card border border-border rounded-lg overflow-hidden shadow-2xl"}>
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {images[activeImg] ? (
          <Image src={images[activeImg]} alt={product.title} className="w-full h-full" fittingType="fill" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        {discount !== null && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-10">
            SALE {discount}%
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
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
      )}

      {/* Info */}
      <div className={compact ? "pt-4" : "p-4"}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
          {product.category}
        </span>
        <h3 className="font-heading text-lg font-semibold mt-1 mb-2 leading-tight">{product.title}</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-heading font-bold text-primary">${product.price.toFixed(2)}</span>
          {discount !== null && (
            <span className="text-sm text-muted-foreground line-through">
              ${Number(product.original_price).toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {stripHtml(product.description)}
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={product.spring_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded font-semibold uppercase text-xs tracking-wide hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 glow-bronze"
          >
            Buy on Spring <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            to={`/shop/${product.slug}`}
            className="w-full border border-border text-foreground px-4 py-2.5 rounded font-semibold uppercase text-xs tracking-wide hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DesktopHoverPanel({ product, cardRef, onClose, onCancelClose }) {
  const [activeImg, setActiveImg] = useState(0);
  const [pos, setPos] = useState(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 380;
    const panelH = 620;
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
    <div
      ref={panelRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 60 }}
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
          <PreviewBody product={product} activeImg={activeImg} setActiveImg={setActiveImg} compact />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ProductCardWithPreview({ product }) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardRef = useRef(null);
  const closeTimer = useRef(null);
  const images = product.images || [];
  const discount = getDiscountPercentage(product.price, product.original_price);

  const scheduleClose = () => {
    if (isMobile) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(false), 200);
  };

  const cancelClose = () => {
    clearTimeout(closeTimer.current);
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
          <h3 className="font-heading text-xl font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-heading font-bold text-primary">${product.price.toFixed(2)}</span>
            {discount !== null && (
              <span className="text-sm text-muted-foreground line-through">
                ${Number(product.original_price).toFixed(2)}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Desktop hover panel */}
      {!isMobile && hovered && (
        <DesktopHoverPanel product={product} cardRef={cardRef} onClose={scheduleClose} onCancelClose={cancelClose} />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <MobilePreviewDrawer product={product} open={drawerOpen} onOpenChange={setDrawerOpen} />
      )}
    </>
  );
}