// Lemon Squeezy Lemon.js loader and checkout overlay handler.
// Loads the Lemon.js script dynamically and opens checkout in an overlay.

let lemonPromise = null;

export function loadLemonJS() {
  if (window.LemonSqueezy) return Promise.resolve();
  if (lemonPromise) return lemonPromise;

  lemonPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.async = true;
    script.onload = () => {
      if (window.LemonSqueezy) {
        window.LemonSqueezy.Setup({
          eventHandler: (event) => {
            if (event.event === "Checkout.Success") {
              // Dispatch a custom event so the UI can show "verifying..."
              window.dispatchEvent(new CustomEvent("lemon-checkout-success"));
            }
            if (event.event === "Checkout.Closed") {
              window.dispatchEvent(new CustomEvent("lemon-checkout-closed"));
            }
          },
        });
        resolve();
      } else {
        reject(new Error("Lemon Squeezy failed to initialize"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Lemon Squeezy script"));
    document.head.appendChild(script);
  });

  return lemonPromise;
}

export async function openCheckout(url) {
  await loadLemonJS();
  window.LemonSqueezy.UrlOpen(url);
}