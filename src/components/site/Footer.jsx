import { Link } from "react-router-dom";
import { Youtube, Facebook, Instagram, Music2 } from "lucide-react";

const SOCIALS = [
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "TikTok", icon: Music2, href: "https://tiktok.com" },
  { label: "Pinterest", icon: PinterestIcon, href: "https://pinterest.com" },
];

function PinterestIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.087-.79-.166-2.004.034-2.867.182-.78 1.171-4.971 1.171-4.971s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.854 0 1.265.641 1.265 1.41 0 .858-.546 2.142-.828 3.332-.236.998.5 1.81 1.485 1.81 1.782 0 3.153-1.88 3.153-4.59 0-2.4-1.723-4.078-4.181-4.078-2.848 0-4.518 2.135-4.518 4.346 0 .861.331 1.784.745 2.286a.3.3 0 0 1 .077.316c-.076.316-.245.998-.278 1.136-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.189 6.22-1.013 0-1.964-.526-2.29-1.148l-.623 2.377c-.226.869-.835 1.958-1.244 2.626.935.289 1.929.444 2.962.444 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-black border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="font-heading text-2xl font-bold tracking-[0.15em] uppercase mb-4">
              Dark<span className="text-primary">Network</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              A cinematic Bible discovery platform — exploring Scripture through documentary storytelling,
              historical insight, and premium biblical education.
            </p>
            <div className="flex gap-3 mt-5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">Explore</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Bible Studies", path: "/bible-studies" },
                { label: "Watch", path: "/watch" },
                { label: "Books", path: "/books" },
                { label: "Shop", path: "/shop" },
                { label: "Free Resources", path: "/free-resources" },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">Information</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About", path: "/about" },
                { label: "Blog", path: "/blog" },
                { label: "FAQ", path: "/faq" },
                { label: "Contact", path: "/contact" },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", path: "/privacy-policy" },
                { label: "Terms & Conditions", path: "/terms" },
                { label: "Refund Policy", path: "/refund-policy" },
                { label: "Digital Product Policy", path: "/digital-product-policy" },
                { label: "Shipping Policy", path: "/shipping-policy" },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dark Network. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Digital ebooks delivered instantly · Physical merch fulfilled by Spring
          </p>
        </div>
      </div>
    </footer>
  );
}