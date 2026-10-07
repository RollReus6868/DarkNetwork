import { useState, useEffect } from "react";
import { LogIn, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Shown when a visitor who is not signed in starts a purchase (see useEbookCheckout).
export default function CheckoutChoiceDialog() {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    const onAsk = (e) => setPending(e.detail);
    window.addEventListener("checkout-choice", onAsk);
    return () => window.removeEventListener("checkout-choice", onAsk);
  }, []);

  const answer = (choice) => {
    pending?.resolve(choice);
    setPending(null);
  };

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && answer(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">How would you like to check out?</DialogTitle>
          <DialogDescription>
            We recommend an account: your ebooks stay in your library and you can download them again anytime, on any device.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <button
            onClick={() => answer("login")}
            className="btn-gold w-full px-6 py-3.5 rounded uppercase text-sm tracking-wide flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Log in or create account
          </button>
          <button
            onClick={() => answer("guest")}
            className="w-full border border-border px-6 py-3.5 rounded uppercase text-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4" /> Continue as guest
          </button>
          <p className="text-xs text-muted-foreground text-center">
            As a guest, your download link is sent in your receipt email. Keep that email safe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
