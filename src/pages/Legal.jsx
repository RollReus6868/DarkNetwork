import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import Seo from "@/components/site/Seo";
import { LEGAL, LEGAL_PAGES, SUPPORT_EMAIL } from "@/lib/legalContent";

// Footer > Legal. The page comes from the address itself (/privacy-policy, /terms, ...): these routes
// have no ":slug" parameter. Text lives in src/lib/legalContent.js.

// The support email becomes a mail link, and the names of the other policies become links to them.
const LINKS = [
  [SUPPORT_EMAIL, `mailto:${SUPPORT_EMAIL}`],
  ...LEGAL_PAGES.filter((p) => p.slug !== "terms").map((p) => [p.label, `/${p.slug}`]),
];
const PATTERN = new RegExp(`(${LINKS.map(([text]) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");

function Rich({ text }) {
  return text.split(PATTERN).map((part, i) => {
    const link = LINKS.find(([t]) => t === part);
    if (!link) return <Fragment key={i}>{part}</Fragment>;
    const cls = "text-primary underline-offset-4 hover:underline";
    return link[1].startsWith("mailto:")
      ? <a key={i} href={link[1]} className={cls}>{part}</a>
      : <Link key={i} to={link[1]} className={cls}>{part}</Link>;
  });
}

const Paragraphs = ({ items }) => (items || []).map((t, i) => <p key={i} className="text-foreground/80 leading-relaxed"><Rich text={t} /></p>);

export default function Legal() {
  const slug = useLocation().pathname.replace(/^\/+|\/+$/g, "");
  const doc = LEGAL[slug];

  if (!doc) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Page Not Found</h1>
        <Link to="/" className="text-primary hover:underline">← Back home</Link>
      </div>
    );
  }

  return (
    <>
      <Seo title={`${doc.title} — Dark Network`} description={doc.intro.slice(0, 155)} />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h1 className="font-heading text-3xl md:text-5xl font-bold">{doc.title}</h1>
            <p className="text-sm text-muted-foreground mt-3">Last updated: {doc.updated}</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-lg text-foreground/85 leading-relaxed mb-10"><Rich text={doc.intro} /></p>
          <div className="space-y-9">
            {doc.sections.map((s, i) => (
              <section key={s.h} aria-labelledby={`legal-${i}`} className="space-y-3">
                <h2 id={`legal-${i}`} className="font-heading text-xl font-semibold text-primary">{s.h}</h2>
                <Paragraphs items={s.p} />
                {s.list && (
                  <ul className="list-disc pl-5 space-y-2 marker:text-primary/70">
                    {s.list.map((t, j) => <li key={j} className="text-foreground/80 leading-relaxed"><Rich text={t} /></li>)}
                  </ul>
                )}
                <Paragraphs items={s.p2} />
              </section>
            ))}
          </div>

          <nav aria-label="Other policies" className="mt-14 pt-8 border-t border-border">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Other policies</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
                <Link key={p.slug} to={`/${p.slug}`} className="text-sm text-foreground/75 hover:text-primary">{p.label}</Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
