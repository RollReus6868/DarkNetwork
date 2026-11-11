import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { openCheckout } from "@/lib/lemonSqueezy";
import { paypalConfig } from "@/lib/paypal";
import { useToast } from "@/components/ui/use-toast";

// Asks a visitor who is not signed in how they want to buy. Answered by the one
// <CheckoutChoiceDialog /> in the layout: "login" | "guest" | null (closed).
const askLoginOrGuest = () =>
  new Promise((resolve) => window.dispatchEvent(new CustomEvent("checkout-choice", { detail: { resolve } })));

// Opens the one <PayPalCheckoutDialog /> in the layout -> { status, after } | null (closed).
const payWithPayPal = (ebooks, config) =>
  new Promise((resolve) => window.dispatchEvent(new CustomEvent("paypal-checkout", { detail: { ebooks, config, resolve } })));

// Buy one or several ebooks in a single checkout: PayPal when it is set up for this visitor
// (paypalCheckout "config"), otherwise the old Lemon Squeezy overlay (until that store closes).
// start(ids) opens the checkout; once paid the buyer lands on their books.
export function useEbookCheckout({ onPaid } = {}) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const after = useRef(null); // where to go once this checkout is paid
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onSuccess = () => {
      if (!after.current) return;
      const target = after.current;
      after.current = null;
      setVerifying(true);
      toast({ title: "Payment received", description: "Opening your downloads…" });
      onPaid?.();
      setTimeout(() => {
        window.LemonSqueezy?.Url?.Close?.();
        navigate(target);
        setVerifying(false);
      }, 2500);
    };
    window.addEventListener("lemon-checkout-success", onSuccess);
    return () => window.removeEventListener("lemon-checkout-success", onSuccess);
  }, [navigate, toast, onPaid]);

  const start = async (ebookIds) => {
    if (!isAuthenticated) {
      const choice = await askLoginOrGuest();
      if (choice === "login") return base44.auth.redirectToLogin(window.location.href);
      if (choice !== "guest") return;
    }
    setLoading(true);
    try {
      const config = await paypalConfig();
      if (config.ready) {
        const ebooks = await base44.entities.Ebook.filter({ id: ebookIds });
        if (ebooks.length === 0) throw new Error("These ebooks are not available right now.");
        const order = ebookIds.map((id) => ebooks.find((e) => e.id === id)).filter(Boolean);
        setLoading(false);
        const result = await payWithPayPal(order, config);
        if (!result) return;
        setVerifying(true);
        if (result.status === "paid") {
          toast({ title: "Payment received", description: "Opening your downloads…" });
        } else {
          toast({ title: "Payment is being reviewed by PayPal", description: "Your ebooks unlock as soon as PayPal confirms it. Keep this page's link." });
        }
        onPaid?.();
        navigate(result.after || "/account");
        setVerifying(false);
        return;
      }

      const res = await base44.functions.invoke("createEbookCheckout", { ebook_ids: ebookIds });
      const data = res?.data || res;
      if (!data?.url) throw new Error("No checkout URL returned");
      after.current = data.after || "/account";
      await openCheckout(data.url);
    } catch (error) {
      after.current = null;
      setVerifying(false);
      toast({
        title: "Checkout failed",
        description: error?.message || "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { start, loading, verifying };
}
