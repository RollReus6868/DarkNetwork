import { base44 } from "@/api/base44Client";

// PayPal checkout on the site (server side: the paypalCheckout edge function).
// config() says whether this visitor pays with PayPal now: "live" for everyone, "sandbox" for
// admins only (test money). Everyone else keeps the previous checkout until PayPal is live.

let sdkPromise = null;

// Asked on every checkout: it depends on who is signed in (sandbox = admins only).
export function paypalConfig() {
  return base44.functions
    .invoke("paypalCheckout", { action: "config" })
    .then((r) => r?.data || r || { ready: false })
    .catch(() => ({ ready: false }));
}

export function loadPayPalSdk(clientId) {
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({ "client-id": clientId, currency: "USD", intent: "capture", components: "buttons" });
    script.src = `https://www.paypal.com/sdk/js?${params}`;
    script.async = true;
    script.dataset.namespace = "paypal";
    script.onload = () => (window.paypal?.Buttons ? resolve(window.paypal) : (sdkPromise = null, reject(new Error("PayPal failed to start"))));
    script.onerror = () => {
      sdkPromise = null;   // let the next try load it again
      reject(new Error("Could not load PayPal. Check your connection or ad blocker and try again."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

const call = async (payload) => {
  try {
    const r = await base44.functions.invoke("paypalCheckout", payload);
    return r?.data || r;
  } catch (error) {
    error.restart = Boolean(error?.data?.restart);   // declined card: PayPal lets the buyer pick another
    throw error;
  }
};

export const createPayPalOrder = (ebookIds) => call({ action: "create", ebook_ids: ebookIds }).then((d) => d.id);
export const capturePayPalOrder = (orderId) => call({ action: "capture", order_id: orderId });
