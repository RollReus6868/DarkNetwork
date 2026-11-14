import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Seo from "@/components/site/Seo";
import { SectionHeading } from "@/components/site/Cards";

const FAQS = [
  { q: "What is the Dark Network?", a: "The Dark Network is a cinematic Bible discovery platform built around a network of documentary-style YouTube channels — Dark Faith, Dark Logic, Dark History, and Dark Eyes. We explore Scripture through history, archaeology, and mystery." },
  { q: "Are the Bible studies free to read?", a: "Yes. Our editorial Bible studies are completely free to read. We also offer free downloadable resources like study guides, reading plans, and timelines." },
  { q: "How do ebooks work?", a: "Our ebooks are digital downloads. After purchase, your download page opens right away. With a free account, your ebooks also stay in My Account to download again anytime. You can read them on any device — phone, tablet, e-reader, or computer." },
  { q: "How are physical products fulfilled?", a: "Choose your size and color, check out right here with PayPal or a card, and our print-on-demand partner prints your item and ships it to your door, usually within 2–5 business days plus shipping time. You'll get a tracking link by email when it ships. A few older listings still say 'Buy on Spring': those are sold and shipped by Spring." },
  { q: "Can I get a refund on an ebook?", a: "Because ebooks are digital goods delivered instantly, they are generally non-refundable. If you experience a technical issue with your download, contact us and we'll make it right." },
  { q: "How often is new content published?", a: "We publish new Bible studies, videos, and resources regularly. Subscribe to our email list to be the first to know when new content drops." },
  { q: "Do I need an account to read or watch?", a: "No account is needed to read Bible studies, watch videos, or download free resources. You can buy ebooks as a guest with PayPal or a card, but a free account keeps your purchases in one place." },
  { q: "How do I stay updated?", a: "Enter your email in any of our free resource forms, or follow us on YouTube, Facebook, Instagram, Pinterest, and TikTok. We'll keep you in the loop on everything new." },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <Seo title="FAQ — Dark Network" description="Frequently asked questions about the Dark Network — Bible studies, ebooks, physical merchandise, downloads, and more." />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Frequently Asked Questions" subtitle="Everything you need to know about the Dark Network." />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <div key={i} className="border border-border rounded overflow-hidden bg-card">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-heading text-lg font-semibold pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h3 className="font-heading text-2xl font-bold mb-3">Still Have Questions?</h3>
            <p className="text-muted-foreground mb-6">We're here to help. Reach out anytime.</p>
            <a href="/contact" className="text-primary font-medium uppercase text-sm tracking-wide hover:underline">Contact Us →</a>
          </div>
        </div>
      </div>
    </>
  );
}