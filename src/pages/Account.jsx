import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, BookOpen, ArrowRight, Loader2, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
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

        <MyOrders userId={user?.id} />

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
// Printed merchandise orders (pod_order rows this account placed; the database lets each buyer read only theirs)
const ORDER_STATUS = {
  paid: "Order placed", needs_attention: "Order placed", in_production: "Printing", shipped: "Shipped",
  delivered: "Delivered", canceled: "Canceled", refunded: "Refunded", partially_refunded: "Partly refunded",
};

function MyOrders({ userId }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    base44.entities.PodOrder.filter({ user_id: userId }, "-created_date", 50)
      .then((rows) => alive && setOrders(rows.filter((o) => o.status !== "started")))
      .catch(() => {});
    return () => { alive = false; };
  }, [userId]);
  if (!orders.length) return null;
  return (
    <div className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/60 mb-5">My Orders</h2>
      <ul className="border border-border rounded-sm divide-y divide-border bg-card/40">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/order/${o.id}?token=${o.access_token}`} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors">
              <Package className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">
                  {(o.items || []).map((i) => i.title).join(", ")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  #{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_date).toLocaleDateString()} · ${(o.total / 100).toFixed(2)}
                </span>
              </span>
              <span className="text-xs uppercase tracking-wide text-primary shrink-0">{ORDER_STATUS[o.status] || o.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
