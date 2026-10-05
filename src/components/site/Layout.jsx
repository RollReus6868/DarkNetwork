import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import ChatWidget from "./ChatWidget";
import DonateButton from "./DonateButton";

export default function Layout() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dark_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    const handler = () => {
      try {
        const saved = localStorage.getItem("dark_cart");
        setCart(saved ? JSON.parse(saved) : []);
      } catch {}
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
      <Header cartCount={cart.length} />
      <main className="flex-1">
        <Outlet context={{ cart, setCart }} />
      </main>
      <Footer />
      <BackToTop />
      <ChatWidget />
      <DonateButton />
    </div>
  );
}