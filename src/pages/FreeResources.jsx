import { useState } from "react";
import Seo from "@/components/site/Seo";
import { FreeResourceCard, SectionHeading } from "@/components/site/Cards";
import EmailCapture from "@/components/site/EmailCapture";
import { useSiteData } from "@/hooks/useSiteData";
import { X } from "lucide-react";

export default function FreeResources() {
  const { resources, loading } = useSiteData();
  const [gated, setGated] = useState(null);

  const handleDownload = (resource) => {
    if (resource.requires_email) {
      setGated(resource);
    } else if (resource.download_url) {
      window.open(resource.download_url, "_blank");
    }
  };

  return (
    <>
      <Seo
        title="Free Resources — Dark Network"
        description="Free Bible study PDFs, reading plans, study guides, timelines, and printable resources — download and go deeper into Scripture."
      />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Free Library"
              title="Free Bible Resources"
              subtitle="Download study guides, reading plans, timelines, and printable resources — all free, designed to help you explore Scripture more deeply."
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center text-muted-foreground py-20">Loading resources…</div>
          ) : resources.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">Free resources coming soon.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((r) => (
                <div key={r.id} onClick={() => handleDownload(r)} className="cursor-pointer">
                  <FreeResourceCard resource={r} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email capture band */}
        <section className="bg-black border-t border-border py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-heading text-3xl font-bold mb-3">Never Miss a New Resource</h2>
            <p className="text-muted-foreground mb-8">New free studies and guides are added regularly. Get notified the moment they drop.</p>
            <EmailCapture source="Free Resources Page" />
          </div>
        </section>
      </div>

      {/* Gated modal */}
      {gated && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGated(null)} />
          <div className="relative bg-card border border-border rounded-lg max-w-md w-full p-8">
            <button onClick={() => setGated(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-heading text-2xl font-bold mb-2">Get Free Access</h3>
            <p className="text-muted-foreground mb-6">Enter your email to download <span className="text-foreground font-medium">{gated.title}</span> and receive future free resources.</p>
            <EmailCapture
              source={`Free Resource: ${gated.title}`}
              variant="compact"
              onSuccess={() => gated.download_url && window.open(gated.download_url, "_blank")}
              successNode={
                gated.download_url ? (
                  <span className="font-medium">
                    Thank you!{" "}
                    <a href={gated.download_url} target="_blank" rel="noopener noreferrer" className="underline">Download your file</a>
                  </span>
                ) : undefined
              }
            />
            <p className="text-xs text-muted-foreground mt-4 text-center">Your download opens right after you subscribe.</p>
          </div>
        </div>
      )}
    </>
  );
}