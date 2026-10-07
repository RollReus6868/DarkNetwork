import { Download, Gift, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";

// Purchased ebooks with their download buttons (account library and guest download page).
// items: { id, title, subtitle, cover_image, has_bonus, purchase_date }
export default function LibraryRows({ items, downloadingId, onDownload }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group flex items-center gap-4 border border-border rounded-sm p-4 bg-card/30 hover:border-primary/40 transition-colors"
        >
          <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded-sm bg-secondary">
            {item.cover_image && (
              <Image src={item.cover_image} alt={item.title} className="w-full h-full" fittingType="fill" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-semibold leading-tight truncate">{item.title}</h3>
            {item.subtitle && <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>}
            {item.purchase_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Purchased {new Date(item.purchase_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => onDownload(item.id)}
              disabled={downloadingId === `${item.id}:main`}
              className="flex items-center justify-center gap-2 text-primary border border-primary/40 px-4 py-2.5 rounded text-sm font-medium uppercase tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {downloadingId === `${item.id}:main` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download
            </button>
            {item.has_bonus && (
              <button
                onClick={() => onDownload(item.id, "bonus")}
                disabled={downloadingId === `${item.id}:bonus`}
                className="flex items-center justify-center gap-2 text-[#e6c56a] border border-[#e6c56a]/50 px-4 py-2.5 rounded text-sm font-medium uppercase tracking-wide hover:bg-[#e6c56a] hover:text-[#241406] transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {downloadingId === `${item.id}:bonus` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Bonus gift
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
