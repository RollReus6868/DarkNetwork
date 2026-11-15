import { useSearchParams } from "react-router-dom";
import Seo from "@/components/site/Seo";
import { EbookCard, SectionHeading } from "@/components/site/Cards";
import { FullVersionOffer } from "@/components/site/EbookShelves";
import { useSiteData } from "@/hooks/useSiteData";
import { KIND_TITLES } from "@/lib/ebookGroups";

// The bookstore: Full Versions, In-Depth Topics and Part Series (each series with its own heading and
// a link to its full version). The filter is kept in the address (?type=full|topic|parts) so a link
// can open one shelf directly.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "full", label: KIND_TITLES.full },
  { key: "topic", label: KIND_TITLES.topic },
  { key: "parts", label: KIND_TITLES.part },
];
const BLURBS = {
  full: "The complete book in one download — the best value.",
  topic: "Mid-length studies, each on one subject.",
  parts: "Short reads, one part at a time.",
};

const grid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-sm sm:max-w-3xl lg:max-w-none mx-auto";
const gridSmall = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6";

function Shelf({ title, blurb, count, children }) {
  return (
    <section className="space-y-6">
      <div className="flex items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl text-[#2b1d0a]">{title} <span className="text-lg text-[#2b1d0a]/45">({count})</span></h2>
          {blurb && <p className="text-sm text-[#2b1d0a]/65 mt-1">{blurb}</p>}
        </div>
        <span className="h-px flex-1 bg-[#2b1d0a]/15 mb-3" />
      </div>
      {children}
    </section>
  );
}

export default function Books() {
  const { ebooks, ebookCatalog, loading } = useSiteData();
  const [params, setParams] = useSearchParams();
  const type = FILTERS.some((f) => f.key === params.get("type")) ? params.get("type") : "all";
  const show = (key) => type === "all" || type === key;
  const { full, topic, series } = ebookCatalog;
  const partCount = series.reduce((n, row) => n + row.parts.length, 0);
  const counts = { all: ebooks.length, full: full.length, topic: topic.length, parts: partCount };

  const choose = (key) => {
    const next = new URLSearchParams(params);
    if (key === "all") next.delete("type"); else next.set("type", key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <Seo
        title="Books — Dark Network"
        description="Premium digital ebooks — full versions, in-depth topic studies and short part-by-part reads on Scripture and Black biblical heritage. Instant download."
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

        <div className="dn-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            {loading ? (
              <div className="text-center text-[#2b1d0a]/60 py-20">Loading books…</div>
            ) : ebooks.length === 0 ? (
              <div className="text-center text-[#2b1d0a]/60 py-20">Books coming soon.</div>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-2 mb-12" role="group" aria-label="Show books">
                  {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => choose(f.key)}
                      aria-pressed={type === f.key}
                      className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                        type === f.key
                          ? "bg-[#2b1d0a] text-[#f4ead4] border-[#2b1d0a]"
                          : "border-[#2b1d0a]/25 text-[#2b1d0a]/80 hover:border-[#8a6420] hover:text-[#8a6420]"
                      }`}
                    >
                      {f.label} <span className="opacity-60">({counts[f.key]})</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-20">
                  {show("full") && full.length > 0 && (
                    <Shelf title={KIND_TITLES.full} blurb={BLURBS.full} count={full.length}>
                      <div className={grid}>{full.map((e) => <EbookCard key={e.id} ebook={e} />)}</div>
                    </Shelf>
                  )}
                  {show("topic") && topic.length > 0 && (
                    <Shelf title={KIND_TITLES.topic} blurb={BLURBS.topic} count={topic.length}>
                      <div className={grid}>{topic.map((e) => <EbookCard key={e.id} ebook={e} />)}</div>
                    </Shelf>
                  )}
                  {show("parts") && series.length > 0 && (
                    <Shelf title={KIND_TITLES.part} blurb={BLURBS.parts} count={partCount}>
                      <div className="space-y-12">
                        {series.map((row) => (
                          <div key={row.key} className="space-y-5" data-series={row.short}>
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                              <h3 className="font-heading text-2xl text-[#2b1d0a]">{row.name}</h3>
                              <FullVersionOffer row={row} />
                            </div>
                            <div className={gridSmall}>{row.parts.map((e) => <EbookCard key={e.id} ebook={e} compact />)}</div>
                          </div>
                        ))}
                      </div>
                    </Shelf>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
