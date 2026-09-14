import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";

const DEFAULT_CONTENT = {
  title: "Inside the Video Library",
  description:
    "Explore our growing library of Bible video courses, book-by-book studies and in-depth lessons — all organized in one place to help you go deeper into Scripture.",
  cta_label: "Explore the Video Library",
  cta_url: "/watch",
};

const DEFAULT_STATS = [
  { value: "19", label: "Video Courses" },
  { value: "200+", label: "Video Lessons" },
  { value: "66", label: "Books Explained" },
  { value: "Weekly", label: "New Lessons" },
];

const LIBRARY_BG =
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&q=80";

export default function VideoLibrary({ content, stats }) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const c = content || DEFAULT_CONTENT;
  const statsList = stats && stats.length > 0 ? stats : DEFAULT_STATS;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Parallax background */}
      <div className="absolute inset-0">
        <Image
          src={LIBRARY_BG}
          alt=""
          className="w-full h-full object-cover"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-background/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-5">
          The Library
        </p>
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance mb-6">
          {c.title}
        </h2>
        <p className="text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto mb-14 leading-relaxed">
          {c.description}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 mb-14">
          {statsList.map((stat, i) => (
            <StatItem key={i} stat={stat} animate={visible && !reducedMotion} delay={i * 150} />
          ))}
        </div>

        <Link
          to={c.cta_url || "/watch"}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {c.cta_label || "Explore the Video Library"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

function StatItem({ stat, animate, delay }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-none"
        style={{
          opacity: animate ? 1 : 0,
          transform: animate ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
        }}
      >
        {stat.value}
      </span>
      <div className="w-10 h-px bg-primary/50 my-4" />
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/60">
        {stat.label}
      </span>
    </div>
  );
}