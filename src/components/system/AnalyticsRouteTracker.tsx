import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/services/analytics";

/**
 * Reports SPA route changes to the analytics provider.
 * Analytics is consent-gated inside the facade, so this component is safe to
 * mount unconditionally — it produces no request while consent is missing.
 */
export function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (path === lastPath.current) return;
    lastPath.current = path;
    // Defer to the next tick so the page title (set by usePageSeo) is final.
    const timer = window.setTimeout(() => trackPageView(location.pathname), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
