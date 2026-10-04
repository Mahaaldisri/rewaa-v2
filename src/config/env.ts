/**
 * Environment configuration — the single place that reads `import.meta.env`.
 *
 * Rules:
 *  - Development may run fully on the mock service layer.
 *  - Staging defaults to mock data so the team can review flows, but the URL can
 *    point at a real gateway at any time.
 *  - Production NEVER falls back to mock data silently. If `VITE_API_URL` is
 *    missing, the app renders an explicit configuration error (see
 *    `src/components/system/ConfigErrorScreen.tsx`) instead of pretending to work.
 *
 * Nothing here may contain a secret: everything in this file is shipped to the
 * browser. Only publishable keys belong in `VITE_*` variables.
 */

export type AppEnv = "development" | "staging" | "production";
export type AnalyticsProviderId = "none" | "console" | "ga4" | "gtm" | "custom";
export type MonitoringProviderId = "none" | "console" | "sentry" | "custom";
export type PaymentProviderId = "none" | "demo" | "hosted-fields";
export type AiMode = "server" | "disabled";

const raw = import.meta.env;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBool(value: unknown, fallback = false): boolean {
  const text = readString(value).toLowerCase();
  if (text === "true" || text === "1" || text === "yes") return true;
  if (text === "false" || text === "0" || text === "no") return false;
  return fallback;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = readString(value).toLowerCase() as T;
  return allowed.includes(text) ? text : fallback;
}

/** Vite injects `DEV`/`PROD`; they are the fallback when VITE_APP_ENV is absent. */
const inViteDev = Boolean(import.meta.env.DEV);
const detectedEnv: AppEnv = inViteDev ? "development" : "production";

const appEnv: AppEnv = (() => {
  const value = readString(raw.VITE_APP_ENV).toLowerCase();
  if (value === "development" || value === "staging" || value === "production") return value;
  return detectedEnv;
})();

const isDev = appEnv === "development";
const isStaging = appEnv === "staging";
const isProduction = appEnv === "production";

/* ------------------------------- API ------------------------------- */

const apiUrl = readString(raw.VITE_API_URL).replace(/\/+$/, "");
const mockRequested = readBool(raw.VITE_ENABLE_MOCK, isDev);

/**
 * Mock mode is on in development by default. Outside development it requires an
 * explicit opt-in, and the app surfaces a visible "demo data" notice so nobody
 * mistakes placeholder content for live data.
 */
const mockEnabled = inViteDev ? readBool(raw.VITE_ENABLE_MOCK, true) : mockRequested;
/** True when mock data is being served by a non-development build. */
const mockForced = mockEnabled && !isDev;

/* ------------------------------ Payments ------------------------------ */

const paymentProvider = readEnum<PaymentProviderId>(
  raw.VITE_PAYMENT_PROVIDER,
  ["none", "demo", "hosted-fields"],
  // Development gets the demo provider so the checkout can be exercised end to end.
  isDev ? "demo" : "none"
);

/* ----------------------------- Analytics ----------------------------- */

const analyticsProvider = readEnum<AnalyticsProviderId>(
  raw.VITE_ANALYTICS_PROVIDER,
  ["none", "console", "ga4", "gtm", "custom"],
  isDev ? "console" : "none"
);

/* ------------------------------- AI ---------------------------------- */
/**
 * مساعد رواء الذكي.
 *
 * لا يوجد أي مفتاح مزوّد في هذه الواجهة — ولا يمكن أن يوجد: كل نداءات النموذج
 * تمر عبر بوابة الخادم (`server/ai-server.mjs` أو أي خادم يطابق نفس العقد).
 *
 * - `VITE_AI_URL` غير مضبوط في الإنتاج ⇒ المساعد **معطّل** برسالة صريحة،
 *   ولا نُظهر واجهة توحي بذكاء اصطناعي يعمل بينما هي قواعد ثابتة.
 * - في التطوير فقط، وعند تعطيل الخادم، يعمل مساعد تجريبي موسوم بوضوح
 *   (`VITE_AI_ALLOW_DEV_ASSISTANT`, افتراضيًا مفعّل في التطوير فقط).
 */
const aiUrlRaw = readString(raw.VITE_AI_URL).replace(/\/+$/, "");
/**
 * `same-origin` (أو `/`) تعني: البوابة على نفس أصل الموقع عبر reverse proxy أو
 * بروكسي التطوير — لا عنوان مطلق ولا مفاتيح في المتصفح. أي قيمة أخرى = عنوان
 * بوابة مستقل.
 */
const aiSameOrigin = aiUrlRaw === "same-origin" || aiUrlRaw === "/" || aiUrlRaw === ".";
const aiUrl = aiSameOrigin ? "" : aiUrlRaw;
const allowDevAssistant = readBool(raw.VITE_AI_ALLOW_DEV_ASSISTANT, isDev);
const aiEnabledRaw = readString(raw.VITE_AI_ENABLED).toLowerCase();
const aiEnabled = aiEnabledRaw ? readBool(raw.VITE_AI_ENABLED, true) : aiUrl.length > 0 || aiSameOrigin || allowDevAssistant;
const aiMode: AiMode = aiEnabled && (aiUrl.length > 0 || aiSameOrigin || allowDevAssistant) ? "server" : "disabled";

/* ---------------------------- Monitoring ---------------------------- */

const monitoringProvider = readEnum<MonitoringProviderId>(
  raw.VITE_MONITORING_PROVIDER,
  ["none", "console", "sentry", "custom"],
  "none"
);

export const env = {
  appEnv,
  isDev,
  isStaging,
  isProduction,

  siteUrl: readString(raw.VITE_SITE_URL),

  api: {
    /** Base URL of the gateway. Empty means "no backend configured". */
    url: apiUrl,
    configured: apiUrl.length > 0,
  },

  mock: {
    /** Whether the mock service layer is allowed to answer requests. */
    enabled: mockEnabled,
    /** Mock data served outside development — must be visibly labelled. */
    forced: mockForced,
  },

  payments: {
    provider: paymentProvider,
    /** Publishable key from the gateway. Never a secret key. */
    publicKey: readString(raw.VITE_PAYMENT_PUBLIC_KEY),
    /**
     * The demo provider is a development tool: it never touches card data and
     * never talks to a gateway. Production must configure a real provider.
     */
    isDemo: paymentProvider === "demo",
    isConfigured: paymentProvider === "hosted-fields" && readString(raw.VITE_PAYMENT_PUBLIC_KEY).length > 0,
  },

  ai: {
    /** Base URL of the AI gateway. Empty (with `sameOrigin`) means same-host `/api/ai`. */
    url: aiUrl,
    /** البوابة على نفس أصل الموقع (بروكسي) — الطريقة الموصى بها في الإنتاج. */
    sameOrigin: aiSameOrigin,
    /** True when the assistant can answer at all in this build. */
    enabled: aiEnabled,
    mode: aiMode,
    /** Development-only rule-based assistant, always labelled in the UI. */
    allowDevAssistant: allowDevAssistant && isDev,
    /** Real gateway configured (production path). */
    configured: aiUrl.length > 0 || aiSameOrigin,
    /** Image upload for multimodal questions (device labels, cartridges). */
    uploads: readBool(raw.VITE_AI_UPLOADS, true),
    /** Explicit kill switch shown to the user instead of a broken chat. */
    reason: !aiEnabled
      ? "المساعد الذكي معطّل في هذا البناء."
      : aiUrl.length > 0
        ? ""
        : aiSameOrigin
          ? ""
          : "لم يتم ضبط VITE_AI_URL، لذلك يعمل المساعد التجريبي للتطوير فقط.",
  },

  analytics: {
    provider: analyticsProvider,
    measurementId: readString(raw.VITE_ANALYTICS_ID),
    /** Consent banner + gating. Defaults to required unless switched off explicitly. */
    requireConsent: readBool(raw.VITE_ANALYTICS_REQUIRE_CONSENT, true),
  },

  monitoring: {
    provider: monitoringProvider,
    dsn: readString(raw.VITE_MONITORING_DSN),
    webVitals: readBool(raw.VITE_ENABLE_WEB_VITALS, true),
  },

  /** QA tooling (scenario switcher, demo credentials) is development-only. */
  devTools: isDev,

  /** Turn warnings into hard build failures. */
  strictConfig: readBool(raw.VITE_STRICT_CONFIG, false),
} as const;

export type Env = typeof env;
