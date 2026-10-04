import { env } from "@/config/env";
import { consent } from "@/services/consent";
import {
  createConsoleProvider,
  createCustomProvider,
  createGa4Provider,
  createGtmProvider,
  noopProvider,
} from "./providers";
import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsProvider } from "./types";

/**
 * Central analytics facade.
 *
 * Rules enforced here:
 *  1. The provider is chosen from `VITE_ANALYTICS_PROVIDER`; no default vendor.
 *  2. Nothing is initialised (no script, no request) until the visitor has
 *     granted the analytics category — unless consent is explicitly disabled.
 *  3. Events fired before that moment are queued, not lost, and flushed once.
 *  4. Every call is exception-safe: analytics must never break the storefront.
 */

const MAX_QUEUE = 40;

let provider: AnalyticsProvider = noopProvider;
let providerReady = false;
let queue: { event: AnalyticsEventName; payload: unknown }[] = [];
let initialized = false;

function pickProvider(): AnalyticsProvider {
  switch (env.analytics.provider) {
    case "console":
      return createConsoleProvider();
    case "ga4":
      return createGa4Provider();
    case "gtm":
      return createGtmProvider();
    case "custom":
      return createCustomProvider();
    default:
      return noopProvider;
  }
}

function ensureProvider(): void {
  if (providerReady) return;
  provider = pickProvider();
  try {
    provider.init({ measurementId: env.analytics.measurementId });
    provider.setConsent({ analytics: consent.isAllowed("analytics"), marketing: consent.isAllowed("marketing") });
  } catch (error) {

    console.warn("[analytics] فشل تهيئة المزوّد — تم تعطيل التحليلات", error);
    provider = noopProvider;
  }
  providerReady = true;
}

function flush(): void {
  const pending = queue;
  queue = [];
  pending.forEach((entry) => {
    try {
      provider.track(entry.event, entry.payload as never);
    } catch {
      /* provider failures are swallowed on purpose */
    }
  });
}

/** Called once from `main.tsx`. Safe to call multiple times. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (env.analytics.provider === "none") return;

  if (consent.isAllowed("analytics")) ensureProvider();

  // React to later consent changes without a reload.
  consent.subscribe((state) => {
    const analyticsAllowed = Boolean(state?.analytics) || !env.analytics.requireConsent;
    if (analyticsAllowed) {
      ensureProvider();
      provider.setConsent({ analytics: true, marketing: Boolean(state?.marketing) });
      flush();
    } else {
      // Consent withdrawn: tell the provider, then stop sending.
      provider.setConsent({ analytics: false, marketing: false });
      queue = [];
    }
  });
}

/** Fire an ecommerce / service event. Silently ignored when not permitted. */
export function track<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventMap[E]): void {
  try {
    if (!consent.isAllowed("analytics")) {
      queue.push({ event, payload });
      if (queue.length > MAX_QUEUE) queue.shift();
      return;
    }
    ensureProvider();
    provider.track(event, payload);
  } catch {
    /* never let analytics break a user flow */
  }
}

export function trackPageView(path: string): void {
  try {
    if (!consent.isAllowed("analytics")) return;
    ensureProvider();
    provider.pageView?.(path);
  } catch {
    /* ignore */
  }
}

/** Exposed for the consent banner / privacy page. */
export function analyticsStatus(): { provider: string; active: boolean; queued: number } {
  return { provider: env.analytics.provider, active: providerReady && consent.isAllowed("analytics"), queued: queue.length };
}

export type { AnalyticsEventMap, AnalyticsEventName, AnalyticsProvider } from "./types";
