import { Star } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import Ornament from "@/components/site/Ornament";

const TINTS = ["c1", "c2", "c3", "c4"];

export default function Testimonials({ testimonials = [] }) {
  if (!testimonials || testimonials.length === 0) return null;

  const sorted = [...testimonials].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const avg = sorted.reduce((sum, t) => sum + (t.rating || 0), 0) / sorted.length;
  const avgRounded = (Math.round(avg * 10) / 10).toFixed(1);
  const verifiedCount = sorted.filter((t) => t.verified).length;
  const countLabel = verifiedCount > 0 ? verifiedCount : sorted.length;
  const countWord = verifiedCount > 0 ? "verified" : "";

  // Enough reviews → two counter-rotating marquee rows; otherwise a tidy grid.
  const useMarquee = sorted.length >= 6;
  const rows = useMarquee
    ? [sorted.filter((_, i) => i % 2 === 0), sorted.filter((_, i) => i % 2 === 1)]
    : [];

  return (
    <section className="dn-cream py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        <Ornament light className="mb-6" />
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-medium italic leading-[1.1] text-[#2b1d0a] text-balance">
          Readers are not just reading.
          <span className="block not-italic text-[#a87f2e]">They are growing.</span>
        </h2>
        <p className="mt-6 inline-flex items-center gap-3 font-heading text-lg italic text-[#2b1d0a]/80 flex-wrap justify-center">
          <span className="text-[#c9a24a]" aria-hidden="true">✦</span>
          <span className="flex" aria-label={`${avgRounded} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(avg) ? "text-[#c9a24a] fill-[#c9a24a]" : "text-[#c9a24a]/30 fill-[#c9a24a]/30"}`} />
            ))}
          </span>
          <span>
            <strong className="not-italic text-[#8a6420]">{avgRounded}</strong> · {countLabel} {countWord} {countLabel === 1 ? "review" : "reviews"}
          </span>
          <span className="text-[#c9a24a]" aria-hidden="true">✦</span>
        </p>
      </div>

      {useMarquee ? (
        <div className="space-y-2">
          {rows.map((row, r) => (
            <div key={r} className="dn-marquee" role="region" aria-label={`Customer reviews, row ${r + 1}`}>
              <div className={`dn-track ${r % 2 ? "rev" : ""}`} style={{ "--dur": `${Math.max(45, row.length * 11)}s` }}>
                {[...row, ...row].map((t, i) => (
                  <TestimonialCard
                    key={`${t.id}-${i}`}
                    testimonial={t}
                    tint={TINTS[(i + r) % TINTS.length]}
                    hidden={i >= row.length}
                    className="w-[300px] sm:w-[400px]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-3">
            {sorted.map((t, i) => (
              <TestimonialCard key={t.id} testimonial={t} tint={TINTS[i % TINTS.length]} className="h-full" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TestimonialCard({ testimonial, tint, className = "", hidden = false }) {
  const initial = (testimonial.author || "?").charAt(0).toUpperCase();
  return (
    <figure className={`dn-tcard ${tint} p-6 pt-7 flex flex-col ${className}`} aria-hidden={hidden || undefined}>
      {testimonial.verified && <span className="dn-verified">✓ Verified</span>}
      <div className="flex gap-0.5 mb-3" aria-label={`${testimonial.rating || 0} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < (testimonial.rating || 0) ? "text-[#c9a24a] fill-[#c9a24a]" : "text-[#c9a24a]/30 fill-[#c9a24a]/30"}`} />
        ))}
      </div>
      <blockquote
        className="font-heading italic text-[1.15rem] leading-relaxed text-[#2b1d0a]/90 flex-1 before:content-['“'] before:text-[var(--tc)] before:mr-1 before:opacity-70"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(testimonial.text) }}
      />
      <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-[color:var(--tc-border)]">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-heading text-lg font-semibold shadow-sm shrink-0"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--tc) 80%, #fff), var(--tc))" }}
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block font-heading font-semibold leading-tight truncate" style={{ color: "var(--tc)" }}>{testimonial.author}</span>
          {testimonial.location && <span className="block text-xs italic text-[#2b1d0a]/60 truncate">{testimonial.location}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
