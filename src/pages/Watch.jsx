import { useSearchParams } from "react-router-dom";
import Seo from "@/components/site/Seo";
import { VideoCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

const CATEGORIES = ["Latest", "Old Testament", "New Testament", "Biblical Mysteries", "Bible History", "Prophecy"];

export default function Watch() {
  const { videos, loading } = useSiteData();
  const [params, setParams] = useSearchParams();
  const active = params.get("category") || "Latest";

  const filtered = active === "Latest" ? videos : videos.filter((v) => v.category === active);

  return (
    <>
      <Seo
        title="Watch — Dark Network"
        description="A curated library of cinematic biblical videos — stories brought to life through documentary filmmaking."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Video Library"
              title="Biblical Stories Brought to Life"
              subtitle="A curated collection of documentary-style biblical videos — explore the evidence, the history, and the mystery."
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap gap-2 mb-10">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setParams(c === "Latest" ? {} : { category: c })}
                className={`text-xs uppercase tracking-wide px-4 py-2 rounded border transition-colors ${
                  active === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading videos…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">No videos in this category yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}