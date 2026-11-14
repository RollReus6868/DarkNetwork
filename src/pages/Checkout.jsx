import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock, ArrowLeft, Truck } from "lucide-react";
import Seo from "@/components/site/Seo";
import { Image } from "@/components/ui/image";
import { useAuth } from "@/lib/AuthContext";
import { loadPayPalSdk } from "@/lib/paypal";
import { getPodCart, podSubtotal, podConfig, podQuote, podCreate, podCapture, clearPodCart } from "@/lib/podCart";

// Checkout for printed merchandise (Printify): shipping address -> shipping quote -> PayPal.
// The podShop function prices everything again on the server; this page only shows it.

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
const COUNTRIES = [
  ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["IE", "Ireland"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"], ["BE", "Belgium"], ["AT", "Austria"],
  ["CH", "Switzerland"], ["ES", "Spain"], ["IT", "Italy"], ["PT", "Portugal"], ["SE", "Sweden"], ["NO", "Norway"],
  ["DK", "Denmark"], ["FI", "Finland"], ["PL", "Poland"], ["CZ", "Czech Republic"], ["JP", "Japan"], ["SG", "Singapore"],
  ["ZA", "South Africa"], ["JM", "Jamaica"], ["TT", "Trinidad and Tobago"], ["BS", "Bahamas"], ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"],
];
const REGION_LABEL = { US: "State", CA: "Province (e.g. ON)", AU: "State (e.g. NSW)" };
const SAVED = "dark_pod_address";
const EMPTY = { first_name: "", last_name: "", email: "", phone: "", country: "US", region: "", address1: "", address2: "", city: "", zip: "" };
const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

const field = "w-full bg-background border border-border rounded px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary";

function Input({ label, name, value, onChange, required, autoComplete, type = "text", className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">{label}{required && <span className="text-primary"> *</span>}</span>
      <input type={type} name={name} value={value} onChange={onChange} required={required} autoComplete={autoComplete} className={field} />
    </label>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState(() => getPodCart());
  const [address, setAddress] = useState(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(SAVED) || "{}") }; } catch { return EMPTY; }
  });
  const [config, setConfig] = useState(null);
  const [quote, setQuote] = useState(null);
  const [state, setState] = useState("form");   // form | quoting | pay | paying
  const [message, setMessage] = useState("");
  const holder = useRef(null);
  const latest = useRef({ items, address });
  latest.current = { items, address };

  useEffect(() => {
    const onCart = () => setItems(getPodCart());
    window.addEventListener("cart-updated", onCart);
    podConfig().then(setConfig);
    return () => window.removeEventListener("cart-updated", onCart);
  }, []);
  useEffect(() => {
    if (user?.email) setAddress((a) => (a.email ? a : { ...a, email: user.email }));
  }, [user]);

  const change = (e) => {
    const { name, value } = e.target;
    setAddress((a) => ({ ...a, [name]: value, ...(name === "country" ? { region: "" } : {}) }));
    if (quote) { setQuote(null); setState("form"); }   // a new address needs a new shipping price
  };

  const continueToPay = async (e) => {
    e.preventDefault();
    setMessage("");
    setState("quoting");
    try {
      const q = await podQuote(items, address);
      setQuote(q);
      setState("pay");
      try { localStorage.setItem(SAVED, JSON.stringify({ ...address, email: user ? "" : address.email })); } catch { /* ignore */ }
    } catch (error) {
      setState("form");
      setMessage(error.message || "Could not calculate shipping. Please check your address.");
    }
  };

  // PayPal buttons once the shipping price is known
  useEffect(() => {
    if (state !== "pay" || !config?.ready) return;
    let alive = true;
    let buttons = null;
    (async () => {
      try {
        const paypal = await loadPayPalSdk(config.client_id);
        if (!alive || !holder.current) return;
        holder.current.innerHTML = "";
        buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },
          createOrder: async () => {
            setMessage("");
            try {
              return await podCreate(latest.current.items, latest.current.address);
            } catch (error) {
              setMessage(error.message);
              throw error;
            }
          },
          onApprove: async (data, actions) => {
            setState("paying");
            try {
              const result = await podCapture(data.orderID);
              clearPodCart();
              navigate(result.after, { replace: true });
            } catch (error) {
              setState("pay");
              setMessage(error.message);
              if (error.restart) return actions.restart();
            }
          },
          onCancel: () => setMessage("Payment cancelled. You have not been charged."),
          onError: (error) => setMessage((m) => m || error?.message || "PayPal could not start. Please try again."),
        });
        await buttons.render(holder.current);
      } catch (error) {
        if (alive) setMessage(error.message || "PayPal could not start. Please try again.");
      }
    })();
    return () => { alive = false; buttons?.close?.().catch?.(() => {}); };
  }, [state, config, navigate]);

  if (items.length === 0 && state !== "paying") {
    return (
      <div className="pt-32 pb-20 max-w-md mx-auto px-4 text-center">
        <Seo title="Checkout — Dark Network" />
        <h1 className="font-heading text-3xl font-bold mb-3">Nothing to check out</h1>
        <p className="text-muted-foreground mb-8">Your apparel cart is empty.</p>
        <Link to="/shop" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded uppercase text-sm">Visit the Shop</Link>
      </div>
    );
  }

  const subtotal = podSubtotal(items);
  const regionLabel = REGION_LABEL[address.country];

  return (
    <>
      <Seo title="Checkout — Dark Network" />
      <div className="pt-24 lg:pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6"><ArrowLeft className="w-4 h-4" /> Back to cart</Link>
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <form onSubmit={continueToPay} className="lg:col-span-3 space-y-6" aria-label="Shipping address">
            <section className="bg-card border border-border rounded p-5 sm:p-6 space-y-4">
              <h2 className="font-heading text-xl font-bold">Contact</h2>
              <Input label="Email" name="email" type="email" value={address.email} onChange={change} required autoComplete="email" />
              <p className="text-xs text-muted-foreground">Your tracking link is emailed here when your order ships.</p>
            </section>

            <section className="bg-card border border-border rounded p-5 sm:p-6 space-y-4">
              <h2 className="font-heading text-xl font-bold">Shipping Address</h2>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">Country<span className="text-primary"> *</span></span>
                <select name="country" value={address.country} onChange={change} autoComplete="country" className={field}>
                  {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="First name" name="first_name" value={address.first_name} onChange={change} required autoComplete="given-name" />
                <Input label="Last name" name="last_name" value={address.last_name} onChange={change} required autoComplete="family-name" />
              </div>
              <Input label="Street address" name="address1" value={address.address1} onChange={change} required autoComplete="address-line1" />
              <Input label="Apartment, suite, etc. (optional)" name="address2" value={address.address2} onChange={change} autoComplete="address-line2" />
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="City" name="city" value={address.city} onChange={change} required autoComplete="address-level2" />
                {address.country === "US" ? (
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">State<span className="text-primary"> *</span></span>
                    <select name="region" value={address.region} onChange={change} required autoComplete="address-level1" className={field}>
                      <option value="">Select…</option>
                      {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  </label>
                ) : (
                  <Input label={regionLabel || "State / Region"} name="region" value={address.region} onChange={change} required={Boolean(regionLabel)} autoComplete="address-level1" />
                )}
                <Input label={address.country === "US" ? "ZIP code" : "Postal code"} name="zip" value={address.zip} onChange={change} required autoComplete="postal-code" />
              </div>
              <Input label="Phone (optional, for the courier)" name="phone" type="tel" value={address.phone} onChange={change} autoComplete="tel" />
            </section>

            {state !== "pay" && state !== "paying" && (
              <button type="submit" disabled={state === "quoting" || config?.ready === false} className="btn-gold w-full px-6 py-4 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                {state === "quoting" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Truck className="w-5 h-5" /> Continue to Payment</>}
              </button>
            )}
            {config && config.ready === false && (
              <p className="text-sm text-muted-foreground">Apparel checkout is opening soon. Please check back shortly.</p>
            )}
          </form>

          <aside className="lg:col-span-2 space-y-4 lg:sticky lg:top-28">
            <div className="bg-card border border-border rounded p-5 sm:p-6">
              <h2 className="font-heading text-xl font-bold mb-4">Order Summary</h2>
              <ul className="space-y-3 mb-4">
                {(quote?.lines || items).map((it) => (
                  <li key={`${it.product_id}:${it.variant_id}`} className="flex gap-3">
                    <div className="relative w-14 h-14 rounded overflow-hidden bg-secondary shrink-0">
                      {it.image && <Image src={it.image} alt={it.title} className="w-full h-full" fittingType="fill" />}
                      <span className="absolute -top-0 -right-0 min-w-[1.25rem] h-5 px-1 rounded-bl bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">{it.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="font-semibold break-words">{it.title}</p>
                      <p className="text-xs text-muted-foreground">{it.variant_title}</p>
                    </div>
                    <span className="text-sm tabular-nums shrink-0">
                      {quote ? money(it.unit_price * it.quantity) : `$${(Number(it.price) * it.quantity).toFixed(2)}`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{quote ? money(quote.subtotal) : `$${subtotal.toFixed(2)}`}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="tabular-nums">{quote ? money(quote.shipping) : "Enter address"}</span></div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Total</span><span className="text-primary tabular-nums">{quote ? `${money(quote.total)} USD` : "—"}</span>
                </div>
              </div>
            </div>

            {(state === "pay" || state === "paying") && (
              <div className="space-y-3">
                {config?.env === "sandbox" && (
                  <p className="text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 px-3 py-2">
                    Test mode (PayPal sandbox): only admins see this. No real money moves.
                  </p>
                )}
                <div className="relative rounded bg-[#f6efe1] p-3 min-h-[120px]">
                  <div ref={holder} data-testid="paypal-buttons" />
                  {state === "paying" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-[#f6efe1]/90 text-[#3a2814] text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" /> Confirming your payment…
                    </div>
                  )}
                </div>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" /> Secure payment processed by PayPal.
                </p>
              </div>
            )}
            {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
            <p className="text-xs text-muted-foreground">
              Each item is printed to order, usually within 2–5 business days, then shipped. See our <Link to="/shipping-policy" className="text-primary hover:underline">shipping</Link> and <Link to="/refund-policy" className="text-primary hover:underline">refund</Link> policies.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
