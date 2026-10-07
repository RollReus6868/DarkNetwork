import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, Download, BookOpen, ArrowRight, Loader2, Gift } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";

export default function Account() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      try {
        // Claim guest purchases matching this user's verified email
        try { await base44.functions.invoke("claimGuestPurchases", {}); } catch {}
        
        const userPurchases = await base44.entities.EbookPurchase.filter({
          user_id: user.id,
          payment_status: "paid",
          download_access: true,
        });
        if (!active) return;
        setPurchases(userPurchases);

        if (userPurchases.length > 0) {
          const ebookIds = userPurchases.map((p) => p.ebook_id).filter(Boolean);
          const ebookRecords = await Promise.all(
            ebookIds.map((id) =>
              base44.entities.Ebook.get(id).catch(() => null)
            )
          );
          if (!active) return;
          setEbooks(ebookRecords.filter(Boolean));
        }
      } catch {
        // errors bubble up
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  const handleDownload = async (ebookId, file = "main") => {
    setDownloadingId(`${ebookId}:${file}`);
    try {
      const res = await base44.functions.invoke("generateEbookDownloadUrl", {
        ebook_id: ebookId,
        file,
      });
      const signedUrl = res?.data?.signed_url || res?.signed_url;
      if (!signedUrl) throw new Error("No download link returned");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Download failed",
        description: error?.message || "Please try again or contact us.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

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
          ) : ebooks.length === 0 ? (
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
            <div className="space-y-4">
              {ebooks.map((ebook) => {
                const purchase = purchases.find((p) => p.ebook_id === ebook.id);
                return (
                  <div
                    key={ebook.id}
                    className="group flex items-center gap-4 border border-border rounded-sm p-4 bg-card/30 hover:border-primary/40 transition-colors"
                  >
                    <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded-sm bg-secondary">
                      {ebook.cover_image && (
                        <Image
                          src={ebook.cover_image}
                          alt={ebook.title}
                          className="w-full h-full"
                          fittingType="fill"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-lg font-semibold leading-tight truncate">
                        {ebook.title}
                      </h3>
                      {ebook.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{ebook.subtitle}</p>
                      )}
                      {purchase?.purchase_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Purchased {new Date(purchase.purchase_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(ebook.id)}
                        disabled={downloadingId === `${ebook.id}:main`}
                        className="flex items-center justify-center gap-2 text-primary border border-primary/40 px-4 py-2.5 rounded text-sm font-medium uppercase tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {downloadingId === `${ebook.id}:main` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download
                      </button>
                      {ebook.bonus_secure_file_uri && (
                        <button
                          onClick={() => handleDownload(ebook.id, "bonus")}
                          disabled={downloadingId === `${ebook.id}:bonus`}
                          className="flex items-center justify-center gap-2 text-[#e6c56a] border border-[#e6c56a]/50 px-4 py-2.5 rounded text-sm font-medium uppercase tracking-wide hover:bg-[#e6c56a] hover:text-[#241406] transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {downloadingId === `${ebook.id}:bonus` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Gift className="w-4 h-4" />
                          )}
                          Bonus gift
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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