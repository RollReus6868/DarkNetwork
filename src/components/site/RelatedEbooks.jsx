import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { EbookBuyButton } from "@/components/site/EbookBuyButton";
import { formatPrice, getDiscountPercentage } from "@/lib/pricing";

export default function RelatedEbooks({ ebooks = [] }) {
  if (ebooks.length === 0) return null;

  return (
    <section className="py-14 bg-secondary/30 border-y border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="font-heading text-2xl font-bold mb-1">Các ebook khác</h2>
        <p className="text-sm text-muted-foreground mb-6">Tiếp tục hành trình với những quyển liên quan.</p>
        <div className="border border-border rounded overflow-hidden divide-y divide-border bg-card/40">
          {ebooks.map((ebook) => (
            <RelatedEbookRow key={ebook.id} ebook={ebook} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedEbookRow({ ebook }) {
  const discount = getDiscountPercentage(ebook.price, ebook.original_price);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 transition-colors hover:bg-secondary/40">
      <Link to={`/books/${ebook.slug}`} className="group flex gap-4 flex-1 min-w-0">
        <div className="w-16 h-[5.5rem] sm:w-20 sm:h-28 flex-shrink-0 overflow-hidden rounded border border-border">
          <Image src={ebook.cover_image} alt={ebook.title} className="w-full h-full" fittingType="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg sm:text-xl font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {ebook.title}
          </h3>
          {ebook.subtitle && (
            <p className="text-xs italic text-muted-foreground mt-1 line-clamp-1">{ebook.subtitle}</p>
          )}
          <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 mt-2.5">
            <span className="font-heading text-xl font-bold text-primary leading-none">{formatPrice(ebook.price)}</span>
            {discount !== null && (
              <>
                <span className="text-sm text-muted-foreground line-through">{formatPrice(ebook.original_price)}</span>
                <span className="badge-gold">-{discount}%</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="sm:w-44 flex-shrink-0">
        <EbookBuyButton ebook={ebook} variant="row" />
      </div>
    </div>
  );
}