import { useState, useEffect, useRef } from "react";
import { Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadPayPalSdk, createPayPalOrder, capturePayPalOrder } from "@/lib/paypal";

// The PayPal buttons for one checkout. Opened by useEbookCheckout through the "paypal-checkout"
// event ({ ebooks: [{id, title, price}], config, resolve }); resolves with the capture answer
// ({ status: 'paid' | 'pending', after }) or null when the buyer closes it.
export default function PayPalCheckoutDialog() {
  const [pending, setPending] = useState(null);
  const [state, setState] = useState("loading");   // loading | ready | paying | error
  const [message, setMessage] = useState("");
  const holder = useRef(null);
  const buttons = useRef(null);

  useEffect(() => {
    const onOpen = (e) => {
      setState("loading");
      setMessage("");
      setPending(e.detail);
    };
    window.addEventListener("paypal-checkout", onOpen);
    return () => window.removeEventListener("paypal-checkout", onOpen);
  }, []);

  const close = (result = null) => {
    buttons.current?.close?.().catch?.(() => {});
    buttons.current = null;
    pending?.resolve(result);
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    let alive = true;
    const ids = pending.ebooks.map((e) => e.id);
    (async () => {
      try {
        const paypal = await loadPayPalSdk(pending.config.client_id);
        // the dialog content mounts a moment after it opens
        for (let i = 0; i < 20 && alive && !holder.current; i++) await new Promise((r) => setTimeout(r, 50));
        if (!alive || !holder.current) return;
        holder.current.innerHTML = "";
        buttons.current = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },
          createOrder: async () => {
            setMessage("");
            try {
              return await createPayPalOrder(ids);
            } catch (error) {
              setMessage(error.message);
              throw error;
            }
          },
          onApprove: async (data, actions) => {
            setState("paying");
            try {
              const result = await capturePayPalOrder(data.orderID);
              close(result);
            } catch (error) {
              setState("ready");
              setMessage(error.message);
              if (error.restart) return actions.restart();
            }
          },
          onCancel: () => setMessage("Payment cancelled. You have not been charged."),
          onError: (error) => {
            setState("ready");
            setMessage((current) => current || error?.message || "PayPal could not start. Please try again.");
          },
        });
        await buttons.current.render(holder.current);
        if (alive) setState("ready");
      } catch (error) {
        if (!alive) return;
        setState("error");
        setMessage(error.message || "PayPal could not start. Please try again.");
      }
    })();
    return () => { alive = false; };
  }, [pending]);

  const books = pending?.ebooks || [];
  const total = books.reduce((sum, e) => sum + Number(e.price || 0), 0);

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && state !== "paying" && close(null)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Checkout</DialogTitle>
          <DialogDescription>
            Pay with PayPal or a debit / credit card. Your download opens right after payment.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border rounded-sm divide-y divide-border text-sm">
          {books.map((e) => (
            <div key={e.id} className="flex justify-between gap-4 px-4 py-2.5">
              <span className="min-w-0 break-words">{e.title}</span>
              <span className="shrink-0 tabular-nums">${Number(e.price || 0).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 px-4 py-2.5 font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-primary">${total.toFixed(2)} USD</span>
          </div>
        </div>

        {pending?.config?.env === "sandbox" && (
          <p className="text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 px-3 py-2">
            Test mode (PayPal sandbox): only admins see this. Pay with a sandbox buyer account, no real money moves.
          </p>
        )}

        {/* PayPal draws its buttons here; a light panel keeps them readable on the dark theme */}
        <div className="relative rounded bg-[#f6efe1] p-3 min-h-[120px]">
          <div ref={holder} data-testid="paypal-buttons" />
          {(state === "loading" || state === "paying") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-[#f6efe1]/90 text-[#3a2814] text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              {state === "paying" ? "Confirming your payment…" : "Loading PayPal…"}
            </div>
          )}
        </div>

        {message && <p role="alert" className="text-sm text-red-400">{message}</p>}

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" /> Secure payment processed by PayPal. We never see your card details.
        </p>
      </DialogContent>
    </Dialog>
  );
}
