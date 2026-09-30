import { Gift } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * Bonus gift (mini ebook) bundled with a paid ebook.
 * Presentation only — the gift file itself is delivered through the gated
 * download function, exactly like the main ebook file.
 */
export default function BonusGift({ ebook }) {
  if (!ebook) return null;
  const hasGift =
    ebook.bonus_title || ebook.bonus_description || ebook.bonus_cover_image || ebook.bonus_secure_file_uri;
  if (!hasGift) return null;

  return (
    <div className="mt-6 border border-[#e6c56a]/40 rounded bg-[#e6c56a]/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-[#e6c56a] flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6c56a]">
          Bonus gift included
        </span>
      </div>

      <div className="flex gap-3">
        {ebook.bonus_cover_image && (
          <div className="w-16 aspect-[5/7] flex-shrink-0 overflow-hidden rounded border border-[#e6c56a]/30 bg-secondary">
            <Image src={ebook.bonus_cover_image} alt={ebook.bonus_title || "Bonus ebook"} className="w-full h-full" fittingType="fill" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold leading-tight">
            {ebook.bonus_title || "Bonus mini ebook"}
          </p>
          {ebook.bonus_description && (
            <p className="text-sm text-muted-foreground mt-1">{ebook.bonus_description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Free with your purchase — it appears in your library with the download.
          </p>
        </div>
      </div>
    </div>
  );
}