import { Link } from "react-router-dom";
import { BookOpen, Play, FileText, ShoppingBag } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";

export default function About() {
  return (
    <>
      <Seo
        title="About — Dark Network"
        description="The mission behind the Dark Network — a cinematic Bible discovery platform helping people explore Scripture more deeply through video, studies, and books."
      />
      <div className="pt-16 lg:pt-20">
        {/* Hero */}
        <section className="relative min-h-[60vh] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <Image src="https://qztnndbhauzawchfhcui.supabase.co/storage/v1/object/public/public-files/458e9bae_b6f3b85c0_generated_image.png" alt="" className="w-full h-full object-cover" fittingType="fill" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-background" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-4">Our Mission</p>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight text-white text-balance">
              Bringing Scripture to Life
            </h1>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 lg:py-24 max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
            <p>
              The Dark Network is a cinematic Bible discovery platform born from a network of documentary-style
              YouTube channels — Dark Faith, Dark Logic, Dark History, and Dark Eyes — exploring Scripture through
              the lens of history, archaeology, and mystery.
            </p>
            <p>
              We exist to help people understand the Bible more deeply. Not through sermons or Sunday-school
              simplifications, but through the same rigorous, cinematic storytelling that has drawn millions to
              our videos — now expanded into in-depth studies, premium ebooks, and resources you can hold onto.
            </p>
            <p>
              Every Bible study, every video, and every book on this site is interconnected. Watch a documentary
              about the fall of Jericho, read the full historical study, download a free timeline, and discover
              the ebook that takes you even deeper — all part of one connected journey through Scripture.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-secondary/30 border-y border-border py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">How It All Connects</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { icon: Play, title: "Watch", desc: "Cinematic documentary videos bring biblical stories to life." },
                { icon: BookOpen, title: "Study", desc: "In-depth editorial studies explore the history and meaning." },
                { icon: FileText, title: "Download", desc: "Free resources and guides help you go further." },
                { icon: ShoppingBag, title: "Go Deeper", desc: "Premium ebooks and merch for the dedicated explorer." },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 rounded-full border border-primary/40 flex items-center justify-center mx-auto mb-4 text-primary">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Begin Your Journey</h2>
          <p className="text-muted-foreground mb-8">Start exploring the Bible like never before.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/bible-studies" className="bg-primary text-primary-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5" /> Explore Bible Studies
            </Link>
            <Link to="/watch" className="border border-border text-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary hover:text-primary flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> Watch Our Stories
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}