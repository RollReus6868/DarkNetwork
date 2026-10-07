import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/lib/useLibrary";
import Seo from "@/components/site/Seo";
import LibraryRows from "@/components/site/LibraryRows";

// Where a guest buyer lands after paying and from the button in their receipt email.
export default function Download() {
  const token = useSearchParams()[0].get("token") || "";
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { items, loading, downloadingId, download } = useLibrary({ token, enabled: Boolean(token) });

  // Signed in (e.g. just created an account from this page): move the order into the library.
  useEffect(() => {
    if (!isAuthenticated || items.length === 0) return;
    base44.functions.invoke("claimGuestPurchases", { token }).then(() => navigate("/account")).catch(() => {});
  }, [isAuthenticated, items.length, token, navigate]);

  const here = encodeURIComponent(`/download?token=${token}`);

  return (
    <>
      <Seo title="Your Downloads — Dark Network" description="Download your ebooks." />
      <div className="pt-24 lg:pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-3">Thank you</p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-10">Your Downloads</h1>

        {token && loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Confirming your payment…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm py-14 px-6 text-center">
            <p className="font-heading text-xl text-foreground/80 mb-2">We couldn't find this order.</p>
            <p className="text-sm text-muted-foreground mb-6">
              If you just paid, refresh this page in a minute. Otherwise open the link from your receipt email again, or contact us and we'll help.
            </p>
            <Link to="/contact" className="text-primary font-medium hover:underline">Contact us</Link>
          </div>
        ) : (
          <>
            <LibraryRows items={items} downloadingId={downloadingId} onDownload={download} />
            <div className="mt-10 border border-primary/30 rounded-sm p-6 bg-card/40">
              <h2 className="font-heading text-xl font-semibold mb-2">Keep your ebooks in one place</h2>
              <p className="text-sm text-muted-foreground mb-5">
                This page opens only with the link in your receipt email. Create a free account and these ebooks are saved to your library, ready to download again anytime.
              </p>
              <Link
                to={`/register?returnTo=${here}`}
                className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded uppercase text-sm tracking-wide"
              >
                <UserPlus className="w-4 h-4" /> Create free account
              </Link>
              <Link to={`/login?returnTo=${here}`} className="ml-4 text-sm text-primary hover:underline">
                I already have one
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
