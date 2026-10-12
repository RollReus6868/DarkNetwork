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
      // Loaded after the page: Lemon.js only starts itself on page load, so start it here.
      window.createLemonSqueezy?.();
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
        lemonPromise = null;
        reject(new Error("Lemon Squeezy failed to initialize"));
      }
    };
    script.onerror = () => {
      lemonPromise = null; // let the next click try again
      reject(new Error("Failed to load Lemon Squeezy script"));
    };
    document.head.appendChild(script);
  });

  return lemonPromise;
}

export async function openCheckout(url) {
  try {
    await loadLemonJS();
    window.LemonSqueezy.Url.Open(url);
  } catch {
    // Fallback: if Lemon.js fails to load or Url.Open throws, go to the checkout in this tab
    // (a new tab opened this late is blocked by the browser as a pop-up). Once paid, Lemon Squeezy
    // brings the buyer back to the site.
    window.location.assign(url);
  }
}