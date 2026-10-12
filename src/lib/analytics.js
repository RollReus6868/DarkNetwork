// Visitor statistics: Google Analytics (full reports on analytics.google.com) and the site's
// own counter (shown in the DN Product Studio tool). The owner's own visits are not counted.
// The site's counter keeps no IP address and no personal data: random visitor / session ids kept
// in the browser, the country code Cloudflare already knows, where the visit came from, how long
// pages stayed on screen, and which ebooks went into the cart.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Google Analytics 4 measurement ID ("G-XXXXXXXXXX"); empty = Google Analytics off.
const GA_ID = "G-0EV862YX9Q";
const API = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_MS = 30 * 60 * 1000; // a new visit after 30 minutes without activity, like Google Analytics

let gaLoaded = false;
function loadGoogleAnalytics() {
  if (gaLoaded || !GA_ID) return;
  gaLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  // later page changes are picked up by GA's "enhanced measurement" (browser history events)
  window.gtag("config", GA_ID);
}

const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

function visitorId() {
  try {
    let id = localStorage.getItem("dn_visitor");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dn_visitor", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

// The current visit; a new one starts after 30 quiet minutes and remembers the campaign tags it came with.
function session() {
  const now = Date.now();
  let s = read("dn_session");
  if (!s?.id || now - s.last > SESSION_MS) {
    const q = new URLSearchParams(window.location.search);
    const tag = (k) => (q.get(k) || "").slice(0, 100) || null;
    s = { id: crypto.randomUUID(), country: s?.country, utm_source: tag("utm_source"), utm_medium: tag("utm_medium"), utm_campaign: tag("utm_campaign") };
  }
  s.last = now;
  write("dn_session", s);
  return s;
}

// Cloudflare's own address answers with the visitor's country ("loc=US"); asked once per browser.
async function country(s) {
  if (s.country !== undefined) return s.country;
  try {
    const text = await (await fetch("/cdn-cgi/trace", { cache: "no-store", signal: AbortSignal.timeout(2000) })).text();
    s.country = (text.match(/^loc=([A-Z][A-Z0-9])$/m) || [])[1] || null;
  } catch {
    s.country = null;
  }
  write("dn_session", { ...read("dn_session"), country: s.country });
  return s.country;
}

// keepalive: the row still goes out when the visitor is closing the tab
function send(table, row) {
  if (!API || !KEY) return;
  fetch(`${API}/rest/v1/${table}`, {
    method: "POST",
    keepalive: true,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  }).catch(() => {});
}

let enabled = false; // off for the owner (admin) and while sign-in is still loading

// An event the tool counts, e.g. track("add_to_cart", { item_id })
export function track(name, data = {}) {
  if (!enabled) return;
  send("site_event", { name, visitor_id: visitorId(), session_id: session().id, path: window.location.pathname.slice(0, 300), ...data });
}

// Time the current page stays on screen; sent when the page changes or the tab is hidden.
const screen = { path: null, since: 0, ms: 0 };
function flushEngagement() {
  if (screen.since) screen.ms += Date.now() - screen.since;
  screen.since = document.visibilityState === "visible" ? Date.now() : 0;
  if (screen.path && screen.ms >= 1000) track("engage", { path: screen.path, value: Math.min(screen.ms, 3600000) });
  screen.ms = 0;
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", flushEngagement);

export default function Analytics() {
  const { pathname } = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const skip = isLoadingAuth || user?.role === "admin";

  useEffect(() => {
    flushEngagement(); // the page being left
    enabled = !skip && !pathname.startsWith("/admin");
    screen.path = enabled ? pathname.slice(0, 300) : null;
    if (!enabled) return;
    loadGoogleAnalytics();
    const s = session();
    // only the path: never the query string (it can carry a private download token)
    country(s).then((code) => send("page_view", {
      path: pathname, visitor_id: visitorId(), referrer: document.referrer.slice(0, 300) || null,
      session_id: s.id, country: code, utm_source: s.utm_source, utm_medium: s.utm_medium, utm_campaign: s.utm_campaign,
    }));
  }, [pathname, skip]);

  return null;
}
