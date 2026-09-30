import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";
import { getCart, removeFromCart, cartTotal } from "@/lib/cart";

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(getCart());
    const handler = () => setCart(getCart());
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const total = cartTotal(cart);

  if (cart.length === 0) {
    return (
      <>
        <Seo title="Cart — Dark Network" />
        <div className="pt-32 pb-20 max-w-md mx-auto px-4 sm:px-6 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-heading text-3xl font-bold mb-3">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Explore our digital ebooks and start your journey deeper into Scripture.</p>
          <Link to="/books" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm hover:bg-primary/90">
            Browse Books <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Cart — Dark Network" />
      <div className="pt-24 lg:pt-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Your Cart</h1>
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
                  disabled
                  className="w-full bg-primary/40 text-primary-foreground/60 px-6 py-3.5 rounded font-semibold uppercase text-sm tracking-wide cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Checkout — Coming Soon
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Use <span className="text-foreground font-medium">Buy Now</span> on any ebook to purchase instantly via Lemon Squeezy.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Multi-ebook cart checkout is coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}