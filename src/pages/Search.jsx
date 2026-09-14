import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import Seo from "@/components/site/Seo";
import { StudyCard, VideoCard, EbookCard, ProductCard } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase().trim();
  const { studies, videos, ebooks, products, loading } = useSiteData();

  const match = (text) => text?.toLowerCase().includes(q);

  const studyResults = studies.filter((s) => match(s.title) || match(s.excerpt) || match(s.category));
  const videoResults = videos.filter((v) => match(v.title) || match(v.description) || match(v.category));
  const ebookResults = ebooks.filter((e) => match(e.title) || match(e.subtitle) || match(e.description));
  const productResults = products.filter((p) => match(p.title) || match(p.category));

  const total = studyResults.length + videoResults.length + ebookResults.length + productResults.length;

  return (
    <>
      <Seo title={`Search: ${q || ""} — Dark Network`} />
      <div className="pt-24 lg:pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <SearchIcon className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Search Results</h1>
        </div>
        <p className="text-muted-foreground mb-10">
          {loading ? "Searching…" : `${total} result${total !== 1 ? "s" : ""} for "${q}"`}
        </p>

        {loading ? null : total === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No results found. Try a different search term.</p>
            <Link to="/" className="text-primary hover:underline">← Back home</Link>
          </div>
        ) : (
          <div className="space-y-16">
            {studyResults.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Bible Studies ({studyResults.length})</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {studyResults.map((s) => <StudyCard key={s.id} study={s} />)}
                </div>
              </section>
            )}
            {videoResults.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Videos ({videoResults.length})</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {videoResults.map((v) => <VideoCard key={v.id} video={v} />)}
                </div>
              </section>
            )}
            {ebookResults.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Books ({ebookResults.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {ebookResults.map((e) => <EbookCard key={e.id} ebook={e} />)}
                </div>
              </section>
            )}
            {productResults.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Products ({productResults.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productResults.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}