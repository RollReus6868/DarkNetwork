import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Seo from "@/components/site/Seo";
import { StudyCard, SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

const CATEGORIES = ["Old Testament", "New Testament", "Bible Prophecy", "Biblical History", "Biblical Mysteries", "People of the Bible"];

export default function BibleStudies() {
  const { studies, loading } = useSiteData();
  const [params, setParams] = useSearchParams();
  const active = params.get("category") || "All";

  const filtered = active === "All" ? studies : studies.filter((s) => s.category === active);

  return (
    <>
      <Seo
        title="Bible Studies — Dark Network"
        description="An editorial library of cinematic Bible studies across the Old Testament, New Testament, prophecy, history, mysteries, and the people of Scripture."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Library"
              title="Bible Studies"
              subtitle="In-depth, documentary-style explorations of Scripture — historical context, interpretation, and cinematic storytelling."
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap gap-2 mb-10">
            <button
              onClick={() => setParams({})}
              className={`text-xs uppercase tracking-wide px-4 py-2 rounded border transition-colors ${
                active === "All" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setParams({ category: c })}
                className={`text-xs uppercase tracking-wide px-4 py-2 rounded border transition-colors ${
                  active === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading studies…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              No studies in this category yet — check back soon.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((s) => (
                <StudyCard key={s.id} study={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}