import { env } from "@/config/env";
import type { ConfigIssue } from "@/config/config-checks";

/**
 * Error monitoring + Web Vitals abstraction.
 *
 * No DSN, project ID or credential is baked in: monitoring stays inert until
 * `VITE_MONITORING_DSN` / `VITE_MONITORING_PROVIDER` are provided.
 *
 * Supported providers:
 *   - "none"    : no-op (default)
 *   - "console" : prints to the console (useful in development)
 *   - "sentry"  : forwards to a globally-loaded Sentry SDK. The SDK is NOT
 *                 bundled — load the official loader snippet in `index.html`
 *                 (or install @sentry/react yourself) and set the DSN env var.
 *                 We deliberately avoid shipping a heavy dependency and avoid
 *                 inventing credentials.
 *   - "custom"  : forwards to `window.__REWAA_MONITORING__`, the integration
 *                 point for any other backend.
 */

export interface MonitoringContext {
  [key: string]: unknown;
}

export interface MonitoringProvider {
  readonly id: string;
  init(options: { dsn: string; environment: string }): void;
  captureException(error: unknown, context?: MonitoringContext): void;
  captureMessage(message: string, level?: "info" | "warning" | "error"): void;
  setUser(user: { id: string } | null): void;
  setTag(key: string, value: string): void;
}

declare global {
  interface Window {
    Sentry?: {
      init?: (options: Record<string, unknown>) => void;
      captureException?: (error: unknown, context?: Record<string, unknown>) => void;
      captureMessage?: (message: string, level?: string) => void;
      setUser?: (user: { id: string } | null) => void;
      setTag?: (key: string, value: string) => void;
    };
    __REWAA_MONITORING__?: Partial<MonitoringProvider>;
  }
}

const noopProvider: MonitoringProvider = {
  id: "none",
  init() {},
  captureException() {},
  captureMessage() {},
  setUser() {},
  setTag() {},
};

function createConsoleProvider(): MonitoringProvider {
  const write = (level: "info" | "warning" | "error", message: string, context?: MonitoringContext) => {

    (level === "error" ? console.error : level === "warning" ? console.warn : console.info)(
      `[monitoring:${level}] ${message}`,
      context ?? ""
    );
  };
  return {
    id: "console",
    init(options) {
      write("info", `console monitoring · env=${options.environment}`);
    },
    captureException(error, context) {
      write("error", error instanceof Error ? error.message : String(error), context);
    },
    captureMessage(message, level = "info") {
      write(level, message);
    },
    setUser() {},
    setTag() {},
  };
}

function createSentryProvider(): MonitoringProvider {
  const sdk = () => (typeof window === "undefined" ? undefined : window.Sentry);
  return {
    id: "sentry",
    init(options) {
      const client = sdk();
      if (!client?.init) {

        console.warn(
          "[monitoring] VITE_MONITORING_PROVIDER=sentry لكن SDK غير محمّل. أضف سكربت Sentry الرسمي في index.html أو ثبّت الحزمة."
        );
        return;
      }
      client.init({ dsn: options.dsn, environment: options.environment, sendDefaultPii: false });
    },
    captureException(error, context) {
      sdk()?.captureException?.(error, context);
    },
    captureMessage(message, level = "info") {
      sdk()?.captureMessage?.(message, level);
    },
    setUser(user) {
      sdk()?.setUser?.(user);
    },
    setTag(key, value) {
      sdk()?.setTag?.(key, value);
    },
  };
}

function createCustomProvider(): MonitoringProvider {
  const hook = () => (typeof window === "undefined" ? undefined : window.__REWAA_MONITORING__);
  return {
    id: "custom",
    init(options) {
      hook()?.init?.(options);
    },
    captureException(error, context) {
      hook()?.captureException?.(error, context);
    },
    captureMessage(message, level = "info") {
      hook()?.captureMessage?.(message, level);
    },
    setUser(user) {
      hook()?.setUser?.(user);
    },
    setTag(key, value) {
      hook()?.setTag?.(key, value);
    },
  };
}

let provider: MonitoringProvider = noopProvider;
let started = false;

function pickProvider(): MonitoringProvider {
  switch (env.monitoring.provider) {
    case "console":
      return createConsoleProvider();
    case "sentry":
      return createSentryProvider();
    case "custom":
      return createCustomProvider();
    default:
      return noopProvider;
  }
}

/**
 * Initialises monitoring. Called from `App.tsx` with the collected config
 * issues, so a misconfigured build reports itself the moment it loads.
 */
export function initMonitoring(configIssues: ConfigIssue[] = []): void {
  if (!started) {
    started = true;
    provider = pickProvider();
    try {
      provider.init({ dsn: env.monitoring.dsn, environment: env.appEnv });
    } catch (error) {

      console.warn("[monitoring] فشل تهيئة المراقبة — تم التعطيل", error);
      provider = noopProvider;
    }
    if (env.monitoring.webVitals && typeof window !== "undefined") {
      startWebVitals();
    }
  }

  configIssues.forEach((issue) => {
    captureMessage(`config:${issue.id} — ${issue.title}`, issue.level === "error" ? "error" : "warning", {
      detail: issue.detail,
      env: env.appEnv,
    });
  });
}

export function captureException(error: unknown, context?: MonitoringContext): void {
  try {
    provider.captureException(error, context);
  } catch {
    /* monitoring must never throw */
  }
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: MonitoringContext
): void {
  try {
    provider.captureMessage(message, level);
    if (context && provider.id === "console") {

      console.info("[monitoring] context", context);
    }
  } catch {
    /* ignore */
  }
}

export function setMonitoringUser(user: { id: string } | null): void {
  try {
    provider.setUser(user);
  } catch {
    /* ignore */
  }
}

export function monitoringStatus(): { provider: string; environment: string; active: boolean } {
  return { provider: env.monitoring.provider, environment: env.appEnv, active: provider.id !== "none" };
}

/* ------------------------------------------------------------------ */
/* Web Vitals                                                          */
/* ------------------------------------------------------------------ */

interface MetricRating {
  name: "CLS" | "LCP" | "INP" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

function rate(name: MetricRating["name"], value: number): MetricRating["rating"] {
  const thresholds: Record<MetricRating["name"], [number, number]> = {
    CLS: [0.1, 0.25],
    LCP: [2500, 4000],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name];
  return value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";
}

function report(metric: MetricRating): void {
  captureMessage(`web-vital ${metric.name}=${Math.round(metric.value * 1000) / 1000}`, "info", {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

/**
 * Collects Core Web Vitals with PerformanceObserver only (no third-party
 * dependency). Metrics are pushed through the monitoring provider above.
 */
export function startWebVitals(): void {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    /* LCP */
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) report({ name: "LCP", value: last.startTime, rating: rate("LCP", last.startTime) });
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    /* FCP + TTFB from the paint/navigation timelines */
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === "first-contentful-paint") {
          report({ name: "FCP", value: entry.startTime, rating: rate("FCP", entry.startTime) });
        }
      });
    });
    paintObserver.observe({ type: "paint", buffered: true });

    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      report({ name: "TTFB", value: navEntry.responseStart, rating: rate("TTFB", navEntry.responseStart) });
    }

    /* CLS — accumulated until the page is hidden */
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput) clsValue += layoutShift.value ?? 0;
      });
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    /* INP — longest interaction, simplified to event timing */
    let worstInp = 0;
    const inpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        worstInp = Math.max(worstInp, entry.duration);
      });
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 100 } as PerformanceObserverInit);

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState !== "hidden") return;
        report({ name: "CLS", value: clsValue, rating: rate("CLS", clsValue) });
        if (worstInp > 0) report({ name: "INP", value: worstInp, rating: rate("INP", worstInp) });
        lcpObserver.disconnect();
        clsObserver.disconnect();
        inpObserver.disconnect();
        paintObserver.disconnect();
      },
      { once: true }
    );
  } catch {
    /* older browsers: vitals are optional */
  }
}
