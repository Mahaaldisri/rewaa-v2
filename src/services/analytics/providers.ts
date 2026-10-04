import type {
  AnalyticsConsent,
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsProvider,
} from "./types";

/**
 * Built-in providers.
 *
 * None of them contain an account, ID, DSN or credential — the measurement ID
 * always comes from `VITE_ANALYTICS_ID`. Scripts are injected lazily, and only
 * after consent, so no third-party request happens before the visitor agrees.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __REWAA_ANALYTICS__?: {
      track: (event: string, payload: Record<string, unknown>) => void;
      init?: (settings: { measurementId: string }) => void;
    };
  }
}

/** Swallows everything: used when no provider is configured or consent is denied. */
export const noopProvider: AnalyticsProvider = {
  id: "none",
  init() {},
  track() {},
  setConsent() {},
};

/** Development provider — prints events so the team can verify the payloads. */
export function createConsoleProvider(): AnalyticsProvider {
  const seen: string[] = [];
  return {
    id: "console",
    init({ measurementId }) {

      console.info(`%c[analytics] console provider${measurementId ? ` · ${measurementId}` : ""}`, "color:#22A9E0");
    },
    track(event, payload) {
      seen.push(event);

      console.info(`%c[analytics] ${event}`, "color:#22B573;font-weight:bold", payload, `(total: ${seen.length})`);
    },
    pageView(path) {

      console.info(`%c[analytics] page_view`, "color:#22B573", { page_path: path });
    },
    setConsent(consent) {

      console.info("[analytics] consent updated", consent);
    },
  };
}

function injectScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) return resolve();
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/** GA4 via gtag.js. Requires `VITE_ANALYTICS_ID` (G-XXXXXXX). */
export function createGa4Provider(): AnalyticsProvider {
  let ready = false;
  return {
    id: "ga4",
    init({ measurementId }) {
      if (!measurementId || ready) return;
      window.dataLayer = window.dataLayer ?? [];
      window.gtag = (...args: unknown[]) => {
        window.dataLayer?.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
      void injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, "ga4-loader");
      ready = true;
    },
    track(event, payload) {
      if (!ready) return;
      window.gtag?.("event", event, payload);
    },
    pageView(path) {
      if (!ready) return;
      window.gtag?.("event", "page_view", { page_path: path });
    },
    setConsent(consent) {
      if (!ready) return;
      window.gtag?.("consent", "update", {
        analytics_storage: consent.analytics ? "granted" : "denied",
        ad_storage: consent.marketing ? "granted" : "denied",
      });
    },
  };
}

/** GTM container. Requires `VITE_ANALYTICS_ID` (GTM-XXXXXXX). */
export function createGtmProvider(): AnalyticsProvider {
  let ready = false;
  return {
    id: "gtm",
    init({ measurementId }) {
      if (!measurementId || ready) return;
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      void injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(measurementId)}`, "gtm-loader");
      ready = true;
    },
    track(event, payload) {
      if (!ready) return;
      window.dataLayer?.push({ event, ...payload });
    },
    pageView(path) {
      if (!ready) return;
      window.dataLayer?.push({ event: "page_view", page_path: path });
    },
    setConsent(consent) {
      if (!ready) return;
      window.dataLayer?.push({ event: "consent_update", ...consent });
    },
  };
}

/**
 * Escape hatch for teams wiring their own pipeline (Segment, Amplitude, an
 * internal collector…): expose `window.__REWAA_ANALYTICS__` from your loader
 * script and every event is forwarded, untouched.
 */
export function createCustomProvider(): AnalyticsProvider {
  let ready = false;
  return {
    id: "custom",
    init(settings) {
      const hook = window.__REWAA_ANALYTICS__;
      if (!hook) {

        console.warn(
          "[analytics] VITE_ANALYTICS_PROVIDER=custom لكن window.__REWAA_ANALYTICS__ غير معرّف — لن تُرسل الأحداث."
        );
        return;
      }
      hook.init?.(settings);
      ready = true;
    },
    track(event, payload) {
      if (!ready) return;
      window.__REWAA_ANALYTICS__?.track(event, payload as Record<string, unknown>);
    },
    pageView(path) {
      if (!ready) return;
      window.__REWAA_ANALYTICS__?.track("page_view", { page_path: path });
    },
    setConsent() {},
  };
}

export type { AnalyticsConsent, AnalyticsEventMap, AnalyticsEventName, AnalyticsProvider };
