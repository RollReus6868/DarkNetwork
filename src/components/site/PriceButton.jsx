import { getGradient } from "@/lib/gradients";

export function PriceButton({ id, originalPrice, discountedPrice, className = "" }) {
  const gradient = getGradient(id);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded px-3 py-1.5 shadow-md ${className}`}
      style={{ background: gradient }}
    >
      <span className="text-white/70 line-through text-sm">${Number(originalPrice).toFixed(2)}</span>
      <span className="text-white font-bold italic text-xl">${discountedPrice}</span>
    </div>
  );
}