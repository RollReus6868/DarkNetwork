import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { EbookBuyButton } from "@/components/site/EbookBuyButton";
import EbookPartBadge from "@/components/site/EbookPartBadge";
import { getDiscountPercentage, formatPrice } from "@/lib/pricing";
import { stripHtml } from "@/lib/gradients";

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Cream "collector" card for an ebook: cover on a warm brown backdrop, gold SAVE
// badge, serif title, prominent price and a gold Buy button.
export default function EbookTile({ ebook, className = "", compact = false }) {
  const discount = getDiscountPercentage(ebook.price, ebook.original_price);
  const isNew = ebook.created_date && Date.now() - new Date(ebook.created_date).getTime() < NEW_WINDOW_MS;
  const learn = Array.isArray(ebook.what_you_learn) ? ebook.what_you_learn.filter(Boolean).slice(0, 3) : [];
  // "Featured on Homepage" in Admin: gold ring + red FEATURED flag, and the
  // sibling tiles are rendered compact so this one reads as the hero of the row.
  const isFeatured = !!ebook.featured;

  return (
    <article
      className={`dn-book group flex flex-col h-full overflow-hidden ${isFeatured ? "dn-book-featured" : ""} ${className}`}
    >
      <Link to={`/books/${ebook.slug}`} aria-label={`View ${ebook.title}`} className="block">
        <div className="dn-book-cover relative aspect-[5/7] overflow-hidden">
          <Image
            src={ebook.cover_image}
            alt={ebook.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
            fittingType="fill"
          />
          {isFeatured && (
            <span className="absolute top-3 left-3 z-10 bg-[#e02424] text-white text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-sm shadow-md">
              Featured
            </span>
          )}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
            <EbookPartBadge ebook={ebook} />
            {discount !== null && <span className="badge-gold">Save {discount}%</span>}
            {isNew && discount === null && <span className="badge-gold">New</span>}
          </div>

          <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 bg-[#1a0f08]/85 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
            <p className="text-sm text-[#f4ead4]/90 line-clamp-4 mb-3">{stripHtml(ebook.description)}</p>
            {learn.length > 0 && (
              <ul className="space-y-1">
                {learn.map((item, i) => (
                  <li key={i} className="text-xs text-[#f4ead4]/80 flex gap-1.5">
                    <span className="text-[#d9b357]">✦</span>
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Link>

      <div className={`flex flex-col flex-1 ${compact ? "px-3.5 pt-3.5 pb-3.5" : "px-4 pt-4 pb-4"}`}>
        <Link to={`/books/${ebook.slug}`} className="block">
          <h3 className={`font-heading leading-tight font-semibold text-[#2b1d0a] group-hover:text-[#8a6420] transition-colors line-clamp-2 ${compact ? "text-lg min-h-[2.8rem]" : "text-xl min-h-[3.1rem]"}`}>
            {ebook.title}
          </h3>
          {ebook.subtitle && <p className={`${compact ? "text-xs" : "text-sm"} italic text-[#2b1d0a]/65 mt-1 line-clamp-1`}>{ebook.subtitle}</p>}
        </Link>

        <div className="flex items-baseline gap-2.5 mt-3 mb-4">
          <span className={`font-heading font-bold text-[#8f1d24] leading-none ${compact ? "text-2xl" : "text-3xl"}`}>{formatPrice(ebook.price)}</span>
          {discount !== null && (
            <span className="text-sm text-[#2b1d0a]/50 line-through">{formatPrice(ebook.original_price)}</span>
          )}
        </div>

        <div className="mt-auto">
          <EbookBuyButton ebook={ebook} variant="card" />
        </div>
      </div>
    </article>
  );
}