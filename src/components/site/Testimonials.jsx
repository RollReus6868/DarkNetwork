import { Star, BadgeCheck } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

export default function Testimonials({ testimonials = [] }) {
  if (!testimonials || testimonials.length === 0) return null;

  const sorted = [...testimonials].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const avg =
    sorted.reduce((sum, t) => sum + (t.rating || 0), 0) / sorted.length;
  const avgRounded = Math.round(avg * 10) / 10;

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Trust line */}
      <div className="text-center mb-14">
        <div className="flex items-center justify-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < Math.round(avg) ? "text-primary fill-primary" : "text-border fill-border"}`}
            />
          ))}
        </div>
        <p className="text-sm uppercase tracking-[0.15em] text-foreground/60">
          {avgRounded} · {sorted.length} verified {sorted.length === 1 ? "review" : "reviews"}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <div className="border border-[#2A2A2A] rounded-sm p-7 bg-card/40 flex flex-col">
      <div className="flex items-center gap-1 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < (testimonial.rating || 0) ? "text-primary fill-primary" : "text-border fill-border"}`}
          />
        ))}
      </div>
      <p
        className="font-heading text-lg leading-relaxed text-foreground/90 mb-6 flex-1"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(testimonial.text) }}
      />
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-primary font-heading text-lg font-semibold">
          {(testimonial.author || "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-foreground">{testimonial.author}</span>
            {testimonial.verified && (
              <BadgeCheck className="w-4 h-4 text-primary" aria-label="Verified buyer" />
            )}
          </div>
          {testimonial.location && (
            <span className="text-xs text-muted-foreground">{testimonial.location}</span>
          )}
        </div>
      </div>
    </div>
  );
}