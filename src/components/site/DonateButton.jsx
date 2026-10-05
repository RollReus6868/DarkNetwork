import { useState } from "react";
import { Heart, X } from "lucide-react";

// Ko-fi's own donation form, shown in a panel so supporters never leave the site.
const KOFI_PAGE = "https://ko-fi.com/dark_team_official";

export default function DonateButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed left-4 sm:left-8 bottom-[5.5rem] sm:bottom-8 z-[75] flex flex-col items-start gap-3">
      {open && (
        <div className="w-[min(92vw,22rem)] h-[min(70vh,36rem)] flex flex-col rounded overflow-hidden border border-[#e6c56a]/35 bg-[#1a0f08] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#e6c56a]/20 bg-gradient-to-b from-[#2d1810] to-[#1a0f08]">
            <p className="font-heading text-lg font-semibold text-[#fbf1dc]">Support Dark Network</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-foreground/60 hover:text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe
            title="Support Dark Network on Ko-fi"
            src={`${KOFI_PAGE}/?hidefeed=true&widget=true&embed=true&preview=true`}
            className="flex-1 w-full border-0 bg-[#f9f9f9]"
          />
          <a href={KOFI_PAGE} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-center text-[11px] text-foreground/60 hover:text-primary border-t border-[#e6c56a]/20">
            Open on Ko-fi
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="btn-gold h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold"
      >
        <Heart className="w-4 h-4" />
        Donate to Us
      </button>
    </div>
  );
}
