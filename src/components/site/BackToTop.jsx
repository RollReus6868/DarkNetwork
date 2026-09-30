import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 400;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const getScrollTop = () =>
      Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );

    const onScroll = () => setVisible(getScrollTop() > SHOW_AFTER_PX);
    onScroll();
    // capture: true — also catches scrolling that happens inside a wrapper element
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduced ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
    document.documentElement.scrollTo({ top: 0, behavior });
    document.body.scrollTo({ top: 0, behavior });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Về đầu trang"
      title="Về đầu trang"
      className={`fixed right-4 sm:right-8 bottom-24 sm:bottom-8 z-[80] w-11 h-11 rounded-full flex items-center justify-center
        bg-[#1a0f08]/90 backdrop-blur border-2 border-[#e6c56a]/70 text-[#e6c56a]
        shadow-[0_8px_24px_-6px_rgba(0,0,0,0.85)] opacity-90 hover:opacity-100
        hover:border-[#e6c56a] hover:text-[#fbf1dc] transition-all duration-300
        ${visible ? "pointer-events-auto translate-y-0" : "pointer-events-none translate-y-3 !opacity-0"}`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}