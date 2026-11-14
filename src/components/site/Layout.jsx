import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import FloatingActions from "./FloatingActions";
import CheckoutChoiceDialog from "./CheckoutChoiceDialog";
import PayPalCheckoutDialog from "./PayPalCheckoutDialog";
import { getPodCart, podCount } from "@/lib/podCart";

export default function Layout() {
  const [cart, setCart] = useState([]);
  const [podItems, setPodItems] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dark_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setPodItems(podCount(getPodCart()));
    const handler = () => {
      try {
        const saved = localStorage.getItem("dark_cart");
        setCart(saved ? JSON.parse(saved) : []);
      } catch {}
      setPodItems(podCount(getPodCart()));
    };
    window.addEventListener("cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cart.length + podItems} />
      <main className="flex-1">
        <Outlet context={{ cart, setCart }} />
      </main>
      <Footer />
      <BackToTop />
      <FloatingActions />
      <CheckoutChoiceDialog />
      <PayPalCheckoutDialog />
    </div>
  );
}