import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, Package, Truck, Home, AlertCircle, ExternalLink } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";
import { podTrack } from "@/lib/podCart";

// A print order's page: /order/<id>?token=<key>. Bookmarkable; signed-in buyers also reach it from
// My Account. Shows the progress Printify reports and the tracking link once it ships.
const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const STEPS = [
  { key: "paid", label: "Order placed", icon: CheckCircle2 },
  { key: "in_production", label: "Printing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];
const RANK = { started: -1, paid: 0, needs_attention: 0, in_production: 1, shipped: 2, delivered: 3 };
const NOTE = {
  started: "We haven't received payment for this order.",
  needs_attention: "Your payment is received. We're reviewing a detail with our print partner and will be in touch if we need anything.",
  canceled: "This order was canceled. If you were charged, your refund is on its way.",
  refunded: "This order was refunded.",
  partially_refunded: "Part of this order was refunded.",
};

export default function OrderStatus() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    podTrack(id, token)
      .then((o) => alive && setOrder(o))
      .catch((e) => alive && setError(e.status === 404 ? "We couldn't find this order. Check the link from your confirmation." : (e.message || "Could not load your order.")));
    return () => { alive = false; };
  }, [id, token]);

  if (error) {
    return (
      <div className="pt-32 pb-20 max-w-md mx-auto px-4 text-center">
        <Seo title="Order — Dark Network" />
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-3xl font-bold mb-3">Order not found</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Link to="/contact" className="text-primary hover:underline">Contact us</Link>
      </div>
    );
  }
  if (!order) return <div className="pt-32 pb-20 flex justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const rank = RANK[order.status] ?? -1;
  const note = NOTE[order.status];

  return (
    <>
      <Seo title="Your Order — Dark Network" />
      <div className="pt-24 lg:pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-3">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
          {rank >= 0 ? "Thank you for your order!" : "Your order"}
        </h1>
        <p className="text-muted-foreground mb-8">
          Placed {new Date(order.created_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {order.email ? ` · tracking will be emailed to ${order.email}` : ""}
        </p>
        {rank >= 0 && (
          <p className="text-sm text-foreground/80 border border-primary/40 bg-primary/10 rounded px-4 py-3 mb-8">
            Bookmark this page to check your order any time.
          </p>
        )}

        {rank >= 0 && !["canceled", "refunded"].includes(order.status) && (
          <ol className="grid grid-cols-4 gap-2 mb-8" aria-label="Order progress">
            {STEPS.map((s, i) => {
              const done = rank >= i;
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex flex-col items-center text-center gap-2">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className={`text-xs ${done ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {note && <p className="text-sm text-foreground/80 border border-border rounded px-4 py-3 mb-8">{note}</p>}

        {order.shipments?.length > 0 && (
          <div className="bg-card border border-border rounded p-5 mb-8 space-y-3">
            <h2 className="font-heading text-xl font-bold">Tracking</h2>
            {order.shipments.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span><span className="uppercase font-semibold">{s.carrier}</span> · {s.number}{s.delivered_at ? " · delivered" : ""}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    Track package <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded p-5 mb-8">
          <h2 className="font-heading text-xl font-bold mb-4">Items</h2>
          <ul className="space-y-3">
            {order.items.map((it, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-14 h-14 rounded overflow-hidden bg-secondary shrink-0">
                  {it.image && <Image src={it.image} alt={it.title} className="w-full h-full" fittingType="fill" />}
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold break-words">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{it.variant_title} · Qty {it.quantity}</p>
                </div>
                <span className="text-sm tabular-nums shrink-0">{money(it.unit_price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border mt-4 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{money(order.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="tabular-nums">{money(order.shipping)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span className="text-primary tabular-nums">{money(order.total)} USD</span></div>
          </div>
        </div>

        {order.address && (
          <div className="bg-card border border-border rounded p-5 mb-8 text-sm">
            <h2 className="font-heading text-xl font-bold mb-3">Shipping to</h2>
            <p>{order.address.name}</p>
            <p className="text-foreground/80">{order.address.address1}{order.address.address2 ? `, ${order.address.address2}` : ""}</p>
            <p className="text-foreground/80">{[order.address.city, order.address.region, order.address.zip].filter(Boolean).join(", ")} · {order.address.country}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Questions about your order? <Link to="/contact" className="text-primary hover:underline">Contact us</Link> and mention order #{order.id.slice(0, 8).toUpperCase()}.
        </p>
      </div>
    </>
  );
}
