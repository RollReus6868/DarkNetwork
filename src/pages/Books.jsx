import Seo from "@/components/site/Seo";
import { EbookCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

export default function Books() {
  const { ebooks, loading } = useSiteData();

  return (
    <>
      <Seo
        title="Books — Dark Network"
        description="Premium digital ebooks — deep-dive Bible study guides, historical explorations, and cinematic companion books. Instant download."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Bookstore"
              title="Digital Books"
              subtitle="Premium ebook guides that take you deeper into Scripture — historical context, verse-by-verse analysis, and cinematic companion reads."
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading books…</div>
          ) : ebooks.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">Books coming soon.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {ebooks.map((e) => (
                <EbookCard key={e.id} ebook={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}