import { getGradient } from "@/lib/gradients";
import { getDiscountPercentage } from "@/lib/pricing";

export function PriceButton({ id, price, originalPrice, className = "" }) {
  const gradient = getGradient(id);
  const discount = getDiscountPercentage(price, originalPrice);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded px-3 py-1.5 shadow-md ${className}`}
      style={{ background: gradient }}
    >
      {discount !== null && (
        <span className="text-white/70 line-through text-sm">
          ${Number(originalPrice).toFixed(2)}
        </span>
      )}
      <span className="text-white font-bold italic text-xl">${Number(price).toFixed(2)}</span>
    </div>
  );
}