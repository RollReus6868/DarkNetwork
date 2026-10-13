// DN Studio service worker: shows the site's notifications (new order, new customer message)
// and keeps the red number on the app icon. No offline cache: the app always shows live data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { body: event.data && event.data.text() }; }
  const jobs = [self.registration.showNotification(msg.title || "Dark Network", {
    body: msg.body || "",
    tag: msg.tag || undefined,
    renotify: Boolean(msg.tag),
    icon: "/studio/icon-192.png",
    badge: "/studio/badge-96.png",
    data: { url: msg.url || "/studio/" },
  })];
  if (typeof msg.badge === "number" && self.navigator.setAppBadge) {
    jobs.push((msg.badge > 0 ? self.navigator.setAppBadge(msg.badge) : self.navigator.clearAppBadge()).catch(() => {}));
  }
  // an open app refreshes its lists right away
  jobs.push(self.clients.matchAll({ type: "window" }).then((list) => list.forEach((c) => c.postMessage({ type: "push", msg }))));
  event.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/studio/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => new URL(c.url).pathname.startsWith("/studio"));
    if (open) {
      open.postMessage({ type: "open", url });
      return open.focus();
    }
    return self.clients.openWindow(url);
  }));
});
