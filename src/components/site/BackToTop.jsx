import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 500;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Về đầu trang"
      className={`fixed right-4 sm:right-8 bottom-20 sm:bottom-8 z-40 w-11 h-11 rounded-full flex items-center justify-center
        bg-[#1a0f08]/80 backdrop-blur border border-[#e6c56a]/40 text-[#e6c56a] shadow-lg
        opacity-60 hover:opacity-100 hover:border-[#e6c56a] hover:text-[#fbf1dc] transition-all duration-300
        ${visible ? "pointer-events-auto translate-y-0" : "pointer-events-none translate-y-3 !opacity-0"}`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}