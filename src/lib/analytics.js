// Visitor statistics: Google Analytics (full reports on analytics.google.com) and the site's
// own small counter (shown in the DN Product Studio tool). The owner's own visits are not counted.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Google Analytics 4 measurement ID ("G-XXXXXXXXXX"); empty = Google Analytics off.
const GA_ID = "";

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

export default function Analytics() {
  const { pathname } = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const skip = isLoadingAuth || user?.role === "admin";

  useEffect(() => {
    if (skip || pathname.startsWith("/admin")) return;
    loadGoogleAnalytics();
    // only the path: never the query string (it can carry a private download token)
    base44.entities.PageView.create({ path: pathname, visitor_id: visitorId(), referrer: document.referrer.slice(0, 300) || null })
      .catch(() => {});
  }, [pathname, skip]);

  return null;
}
