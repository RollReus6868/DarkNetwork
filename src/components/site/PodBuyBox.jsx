import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Zap, Truck, Check } from "lucide-react";
import { addToPodCart, variantPrice } from "@/lib/podCart";
import { formatPrice } from "@/lib/pricing";

// Size / colour choice for a Printify product. The selection lives in ProductDetail (usePodSelection)
// so the gallery and the phone's sticky bar follow it.

// a single choice (one colour, one size) is made for the buyer; colour starts at the first one
function startingChoice(options, variants) {
  const start = {};
  options.forEach((o, i) => {
    if (o.values.length === 1 || o.type === "color") {
      const first = o.values.find((val) => variants.some((v) => v.options[i] === val.id));
      if (first) start[i] = first.id;
    }
  });
  return start;
}

export function usePodSelection(product) {
  const options = useMemo(() => product?.options || [], [product]);
  const variants = useMemo(() => (product?.variants || []).filter((v) => v.available !== false), [product]);
  const [picked, setPicked] = useState(() => startingChoice(options, variants));
  // another product (or the product finished loading): start over
  useEffect(() => { setPicked(startingChoice(options, variants)); }, [options, variants]);

  const matches = (v, sel) => Object.entries(sel).every(([i, id]) => v.options[Number(i)] === id);
  const variant = options.length && Object.keys(picked).length === options.length
    ? variants.find((v) => matches(v, picked)) || null
    : null;
  // which values can still be bought with what is picked in the other options
  const possible = (index, valueId) => variants.some((v) => v.options[index] === valueId
    && matches(v, Object.fromEntries(Object.entries(picked).filter(([i]) => Number(i) !== index))));
  const choose = (index, valueId) => setPicked((p) => {
    const next = { ...p, [index]: valueId };
    // drop a choice that no longer exists with the new one (e.g. a size not made in that colour)
    Object.keys(next).forEach((i) => {
      if (Number(i) !== index && !variants.some((v) => matches(v, { [index]: valueId, [i]: next[i] }))) delete next[i];
    });
    return next;
  });
  // the variant whose mockups to show: the full choice, or any variant in the picked colour
  const colorIndex = options.findIndex((o) => o.type === "color");
  const pictureVariant = variant || (colorIndex >= 0 && picked[colorIndex] != null
    ? variants.find((v) => v.options[colorIndex] === picked[colorIndex]) : null);
  const missing = options.filter((_, i) => picked[i] == null).map((o) => o.name.replace(/s$/i, "").toLowerCase());
  const minPrice = variants.length ? Math.min(...variants.map((v) => variantPrice(product, v))) : Number(product?.price || 0);
  return { options, variants, picked, choose, possible, variant, pictureVariant, missing, minPrice };
}

export function cartItemFor(product, variant, quantity, image) {
  return {
    product_id: product.id,
    variant_id: variant.id,
    title: product.title,
    variant_title: variant.title,
    image: image || product.images?.[0] || "",
    slug: product.slug,
    price: variantPrice(product, variant),
    quantity,
  };
}

export default function PodBuyBox({ product, selection, image }) {
  const navigate = useNavigate();
  const { options, choose, possible, picked, variant, missing, minPrice } = selection;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [hint, setHint] = useState("");
  const soldOut = selection.variants.length === 0;

  const add = (go) => {
    if (!variant) { setHint(`Please choose a ${missing.join(" and ")}.`); return; }
    addToPodCart(cartItemFor(product, variant, qty, image));
    setHint("");
    setQty(1);
    if (go) navigate("/checkout");
    else setAdded(true);
  };

  const price = variant ? variantPrice(product, variant) : minPrice;

  return (
    <div id="pod-buy" className="mt-6 space-y-5">
      <p className="font-heading text-4xl font-bold text-primary" aria-live="polite">
        {!variant && selection.variants.some((v) => v.extra > 0) && <span className="text-base font-body font-normal text-muted-foreground mr-2">From</span>}
        {formatPrice(price)}
      </p>

      {options.map((o, index) => (
        <fieldset key={o.name} className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
            {o.name}{picked[index] != null && <span className="ml-2 normal-case tracking-normal font-normal text-foreground">{o.values.find((v) => v.id === picked[index])?.title}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((val) => {
              const on = picked[index] === val.id;
              const can = possible(index, val.id);
              if (o.type === "color") {
                return (
                  <button
                    key={val.id}
                    type="button"
                    onClick={() => can && choose(index, val.id)}
                    disabled={!can}
                    title={val.title}
                    aria-label={val.title}
                    aria-pressed={on}
                    className={`relative w-9 h-9 rounded-full border-2 transition-all ${on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60"} ${can ? "" : "opacity-30 cursor-not-allowed"}`}
                    style={{ background: val.colors?.length > 1 ? `linear-gradient(135deg, ${val.colors[0]} 50%, ${val.colors[1]} 50%)` : (val.colors?.[0] || "#888") }}
                  >
                    {on && <Check className="w-4 h-4 absolute inset-0 m-auto text-white mix-blend-difference" />}
                  </button>
                );
              }
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => can && choose(index, val.id)}
                  disabled={!can}
                  aria-pressed={on}
                  className={`min-w-[3rem] px-3 py-2 rounded border text-sm font-semibold transition-colors ${on ? "btn-gold border-transparent" : "border-border text-foreground hover:border-primary"} ${can ? "" : "opacity-30 line-through cursor-not-allowed"}`}
                >
                  {val.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">Quantity</span>
        <div className="flex items-center border border-border rounded">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 hover:text-primary"><Minus className="w-4 h-4" /></button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} className="p-2.5 hover:text-primary"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {soldOut ? (
        <p className="text-sm text-muted-foreground">This design is currently unavailable.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => add(false)} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded border border-primary text-primary uppercase text-sm font-semibold tracking-wide hover:bg-primary/10 transition-colors">
            <ShoppingBag className="w-5 h-5" /> Add to Cart
          </button>
          <button type="button" onClick={() => add(true)} className="flex-1 btn-gold inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded uppercase text-sm tracking-wide">
            <Zap className="w-5 h-5" /> Buy Now
          </button>
        </div>
      )}
      {hint && !variant && <p role="alert" className="text-sm text-red-400">{hint}</p>}
      {added && (
        <p role="status" className="text-sm text-foreground/80 flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" /> Added to your cart. <Link to="/cart" className="text-primary hover:underline">View cart</Link>
        </p>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Truck className="w-4 h-4 shrink-0 mt-0.5" />
        Printed on demand just for you by our print partner. Shipping is calculated at checkout.
      </p>
    </div>
  );
}
