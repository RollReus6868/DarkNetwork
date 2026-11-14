import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowRight, ShoppingBag, Loader2, Zap, Minus, Plus, Truck } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";
import { getCart, removeFromCart, cartTotal, clearCart } from "@/lib/cart";
import { useEbookCheckout } from "@/lib/useEbookCheckout";
import { getPodCart, removeFromPodCart, setPodQty, podSubtotal } from "@/lib/podCart";

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [pod, setPod] = useState([]);
  const { start, loading, verifying } = useEbookCheckout({ onPaid: clearCart });

  useEffect(() => {
    setCart(getCart());
    setPod(getPodCart());
    const handler = () => { setCart(getCart()); setPod(getPodCart()); };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const total = cartTotal(cart);

  if (cart.length === 0 && pod.length === 0) {
    return (
      <>
        <Seo title="Cart — Dark Network" />
        <div className="pt-32 pb-20 max-w-md mx-auto px-4 sm:px-6 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-heading text-3xl font-bold mb-3">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Explore our digital ebooks and Scripture-inspired apparel.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/books" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm hover:bg-primary/90">
              Browse Books <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/shop" className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded font-semibold uppercase text-sm hover:bg-primary/10">
              Visit the Shop <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Cart — Dark Network" />
      <div className="pt-24 lg:pt-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Your Cart</h1>
        {pod.length > 0 && <PodSection items={pod} onChange={setPod} />}
        {cart.length > 0 && pod.length > 0 && (
          <h2 className="font-heading text-2xl font-bold mt-12 mb-6">Digital Ebooks</h2>
        )}
        {cart.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 bg-card border border-border rounded p-4">
                <div className="w-16 h-20 overflow-hidden rounded flex-shrink-0">
                  <Image src={item.image} alt={item.title} className="w-full h-full" fittingType="fill" />
                </div>
                <div className="flex-1">
                  <Link to={`/books/${item.slug}`} className="font-heading text-lg font-semibold hover:text-primary">{item.title}</Link>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Digital Ebook</p>
                  <p className="text-primary font-semibold mt-1">${Number(item.price).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => { removeFromCart(item.id); setCart(getCart()); }}
                  className="text-muted-foreground hover:text-destructive transition-colors self-start"
                  aria-label="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary + checkout */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded p-6 sticky top-28">
              <h2 className="font-heading text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>Instant digital</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => start(cart.map((item) => item.id))}
                  disabled={loading || verifying}
                  className="btn-gold w-full px-6 py-3.5 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading || verifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Zap className="w-4 h-4" /> Checkout — ${total.toFixed(2)}</>
                  )}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Secure checkout with PayPal or a debit / credit card. Your ebooks are ready to download right after payment.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}

// Printed merchandise: its own checkout (shipping address, shipping cost), see /checkout.
function PodSection({ items, onChange }) {
  const subtotal = podSubtotal(items);
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex gap-4 bg-card border border-border rounded p-4">
            <div className="w-20 h-20 overflow-hidden rounded flex-shrink-0 bg-secondary">
              {item.image && <Image src={item.image} alt={item.title} className="w-full h-full" fittingType="fill" />}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/shop/${item.slug}`} className="font-heading text-lg font-semibold hover:text-primary break-words">{item.title}</Link>
              <p className="text-xs text-muted-foreground mt-1">{item.variant_title}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center border border-border rounded">
                  <button type="button" aria-label="Decrease quantity" onClick={() => onChange(setPodQty(item.key, item.quantity - 1))} className="p-1.5 hover:text-primary"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => onChange(setPodQty(item.key, item.quantity + 1))} className="p-1.5 hover:text-primary"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <span className="text-primary font-semibold">${(Number(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => onChange(removeFromPodCart(item.key))}
              className="text-muted-foreground hover:text-destructive transition-colors self-start"
              aria-label="Remove"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <div className="lg:col-span-1">
        <div className="bg-card border border-border rounded p-6 sticky top-28">
          <h2 className="font-heading text-xl font-bold mb-4">Apparel &amp; Gifts</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>At checkout</span>
            </div>
          </div>
          <Link
            to="/checkout"
            className="btn-gold w-full px-6 py-3.5 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" /> Checkout — ${subtotal.toFixed(2)}
          </Link>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Enter your shipping address at checkout, then pay securely with PayPal or a card.
          </p>
        </div>
      </div>
    </div>
  );
}