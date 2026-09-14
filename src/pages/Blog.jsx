import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/site/Seo";
import { SectionHeading } from "@/components/site/Cards";
import { useSiteData } from "@/hooks/useSiteData";
import { Image } from "@/components/ui/image";

export default function Blog() {
  const { studies: posts, loading } = useSiteData();

  return (
    <>
      <Seo title="Blog — Dark Network" description="Articles, insights, and explorations from the Dark Network." />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="The Blog" subtitle="Articles, insights, and shorter explorations from the Dark Network." />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading articles…</div>
          ) : posts.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">Articles coming soon.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((p) => (
                <Link key={p.id} to={`/bible-studies/${p.slug}`} className="group block">
                  <div className="relative aspect-[3/2] overflow-hidden rounded mb-4">
                    <Image src={p.hero_image} alt={p.title} className="w-full h-full group-hover:scale-105 transition-transform duration-700" fittingType="fill" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] bg-black/60 px-2.5 py-1 rounded text-primary border border-primary/30">
                      {p.category}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.excerpt}</p>
                  <span className="text-primary text-sm flex items-center gap-1">Read More <ArrowRight className="w-4 h-4" /></span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}