import { Link } from "react-router-dom";
import { LogOut, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/lib/useLibrary";
import Seo from "@/components/site/Seo";
import LibraryRows from "@/components/site/LibraryRows";

export default function Account() {
  const { user, logout } = useAuth();
  const { items, loading, downloadingId, download } = useLibrary({ enabled: Boolean(user?.id) });

  const handleLogout = () => {
    logout(false);
    window.location.href = "/";
  };

  return (
    <>
      <Seo title="My Account — Dark Network" description="Your account and ebook library." />
      <div className="pt-24 lg:pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-3">
          Your Library
        </p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-12">My Account</h1>

        {/* Profile */}
        <div className="border border-border rounded-sm p-6 mb-10 bg-card/40">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/60 mb-4">
            Profile
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Name</span>
              <p className="text-lg font-heading text-foreground">
                {user?.full_name || "Member"}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Email</span>
              <p className="text-lg text-foreground/90">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Library */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/60 mb-5">
            My Library
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm py-16 px-6 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-heading text-xl text-foreground/80 mb-2">
                You haven't purchased any ebooks yet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Explore our collection of digital Bible studies and books.
              </p>
              <Link
                to="/books"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 transition-colors"
              >
                Explore Ebooks <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <LibraryRows items={items} downloadingId={downloadingId} onDownload={download} />
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground border border-border px-6 py-3 rounded text-sm font-medium uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </>
  );
}