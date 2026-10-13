// Data and notifications for the owner's phone app. Everything goes through the signed-in admin session.
import { base44 } from "@/api/base44Client";

export const call = async (fn, body) => (await base44.functions.invoke(fn, body)).data;
export const app = (action, body = {}) => call("adminApp", { action, ...body });
export const chat = (action, body = {}) => call("chatAdmin", { action, ...body });

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

// Orders newer than the newest one this phone has seen (kept on the phone; first run: nothing is "new").
const SEEN = "studio_orders_seen";
const time = (iso) => new Date(iso).getTime() || 0;
export const newestOrder = (orders) => orders.reduce((a, o) => (time(o.date) > time(a) ? o.date : a), "");
export function newOrders(orders) {
  const seen = read(SEEN);
  if (!seen) { if (orders.length) write(SEEN, newestOrder(orders)); return 0; }
  return orders.filter((o) => time(o.date) > time(seen)).length;
}
export async function markOrdersSeen(orders) {
  const newest = newestOrder(orders);
  if (!newest || newest === read(SEEN)) return;
  write(SEEN, newest);
  const sub = await pushSubscription();
  if (sub) app("seen", { endpoint: sub.endpoint, orders_seen: newest }).catch(() => {});
}
export const ordersSeen = () => read(SEEN);

// Red number on the home-screen icon (iPhone with iOS 16.4+, Android Chrome).
export function setIconBadge(n) {
  try {
    if (!navigator.setAppBadge) return;
    (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  } catch { /* not supported */ }
}

// ---- notifications
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const registerWorker = () =>
  "serviceWorker" in navigator ? navigator.serviceWorker.register("/studio/sw.js", { scope: "/studio/" }).catch(() => null) : Promise.resolve(null);

export async function pushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/studio/");
  return reg ? reg.pushManager.getSubscription() : null;
}

const keyBytes = (b64) => {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

// Must run straight from a tap: iPhone only shows the permission question for a user gesture.
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bạn chưa cho phép thông báo. Mở Cài đặt của điện thoại › Thông báo › DN Studio để bật lại.");
  const reg = (await registerWorker()) || (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  const { public_key } = await app("push_key");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(public_key) });
  await app("push_subscribe", { subscription: sub.toJSON(), orders_seen: ordersSeen() });
  return sub;
}

export async function disablePush() {
  const sub = await pushSubscription();
  if (!sub) return;
  await app("push_unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}
