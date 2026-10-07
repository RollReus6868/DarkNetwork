import { useState } from "react";
import { ShoppingCart, Loader2, Zap, Check } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { useEbookCheckout } from "@/lib/useEbookCheckout";
import { useToast } from "@/components/ui/use-toast";

export function EbookBuyButton({ ebook, variant = "card" }) {
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const { start, loading, verifying } = useEbookCheckout();

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    start([ebook.id]);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: ebook.id,
      type: "ebook",
      title: ebook.title,
      price: ebook.price,
      image: ebook.cover_image,
      slug: ebook.slug,
    });
    setAdded(true);
    toast({ title: "Added to cart", description: ebook.title });
    setTimeout(() => setAdded(false), 2000);
  };

  if (variant === "detail") {
    return (
      <>
        <button
          onClick={handleBuyNow}
          disabled={loading || verifying}
          className="btn-gold px-8 py-4 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating checkout…</>
          ) : verifying ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Verifying purchase…</>
          ) : (
            <><Zap className="w-5 h-5" /> Buy Now — ${ebook.price.toFixed(2)}</>
          )}
        </button>
        <button
          onClick={handleAddToCart}
          className="border border-border text-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 glow-bronze"
        >
          {added ? <><Check className="w-5 h-5" /> Added to Cart</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
        </button>
      </>
    );
  }

  // row variant — used in the "Các ebook khác" list on a dark background
  if (variant === "row") {
    return (
      <div className="flex gap-2 w-full">
        <button
          onClick={handleBuyNow}
          disabled={loading || verifying}
          className="btn-gold flex-1 px-4 py-2.5 rounded uppercase text-xs tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading || verifying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Zap className="w-3.5 h-3.5" /> Buy Now</>
          )}
        </button>
        <button
          onClick={handleAddToCart}
          aria-label="Add to cart"
          title="Add to cart"
          className="p-2.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary transition-colors glow-bronze"
        >
          {added ? <Check className="w-4 h-4 text-primary" /> : <ShoppingCart className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  // card variant — compact
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBuyNow}
        disabled={loading || verifying}
        className="btn-gold flex-1 px-4 py-2.5 rounded uppercase text-xs tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {loading || verifying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><Zap className="w-3.5 h-3.5" /> Buy Now</>
        )}
      </button>
      <button
        onClick={handleAddToCart}
        aria-label="Add to cart"
        className="p-2.5 border border-[#a87f2e]/50 rounded text-[#5a3a1f] hover:bg-[#a87f2e]/15 hover:border-[#a87f2e] transition-colors"
      >
        {added ? <Check className="w-4 h-4 text-[#8a6420]" /> : <ShoppingCart className="w-4 h-4" />}
      </button>
    </div>
  );
}