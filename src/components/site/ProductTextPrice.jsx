import { getDiscountPercentage, formatPrice } from "@/lib/pricing";

// Presentation-only component for consistent product text & price hierarchy.
// Renders category, title, current/original price, SALE %, and short description.
// Contains NO commerce logic (no Lemon Squeezy, no Spring, no checkout, no download).
// Shared by both Ebook and POD surfaces so typography, price hierarchy, sale
// treatment, and spacing stay visually identical across the site.
export function ProductTextPrice({
  category,
  title,
  price,
  originalPrice,
  description,
  compact = false,
  showSaleBadge = false,
  showDescription = true,
  titleAs = "h3",
  titleClassName = "",
  className = "",
}) {
  const discount = price != null ? getDiscountPercentage(price, originalPrice) : null;
  const TitleTag = titleAs;

  return (
    <div className={className}>
      {category && (
        <span className={`font-semibold uppercase tracking-[0.15em] text-primary ${compact ? "text-[10px]" : "text-xs"}`}>
          {category}
        </span>
      )}
      {title && (
        <TitleTag className={`font-heading leading-tight ${compact ? "text-xl font-semibold mb-2" : "text-4xl md:text-5xl font-bold mt-3"} ${titleClassName}`}>
          {title}
        </TitleTag>
      )}
      {price != null && (
        <div className={`flex items-center ${compact ? "gap-2" : "gap-3 mt-5"}`}>
          <span className={`font-heading font-bold text-primary ${compact ? "text-xl" : "text-4xl"}`}>
            {formatPrice(price)}
          </span>
          {discount !== null && (
            <span className={`text-muted-foreground line-through ${compact ? "text-sm" : "text-xl"}`}>
              {formatPrice(originalPrice)}
            </span>
          )}
          {discount !== null && showSaleBadge && (
            <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
              SALE {discount}%
            </span>
          )}
        </div>
      )}
      {showDescription && description && (
        <p className={`text-muted-foreground ${compact ? "text-sm mt-3 line-clamp-3" : "text-base mt-4 leading-relaxed"}`}>
          {description}
        </p>
      )}
    </div>
  );
}