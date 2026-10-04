/// <reference types="vite/client" />

/**
 * Every environment variable the storefront understands.
 * Anything not listed here is ignored, so the configuration surface stays small
 * and auditable. `src/config/env.ts` is the only module that reads from it.
 */
interface ImportMetaEnv {
  /** development | staging | production */
  readonly VITE_APP_ENV?: string;
  /** Public site origin used for canonical URLs, OG tags and the sitemap. */
  readonly VITE_SITE_URL?: string;
  /** Gateway base URL, e.g. https://api.rewaa.sa — empty disables real calls. */
  readonly VITE_API_URL?: string;
  /** "true" forces the mock service layer outside development (demo/staging only). */
  readonly VITE_ENABLE_MOCK?: string;
  /** none | console | ga4 | gtm | custom */
  readonly VITE_ANALYTICS_PROVIDER?: string;
  readonly VITE_ANALYTICS_ID?: string;
  /** "true" blocks analytics + marketing scripts until the visitor opts in. */
  readonly VITE_ANALYTICS_REQUIRE_CONSENT?: string;
  /** none | console | sentry | custom */
  readonly VITE_MONITORING_PROVIDER?: string;
  readonly VITE_MONITORING_DSN?: string;
  /** "true" collects Core Web Vitals through the monitoring adapter. */
  readonly VITE_ENABLE_WEB_VITALS?: string;
  /** none | demo | hosted-fields */
  readonly VITE_PAYMENT_PROVIDER?: string;
  /** Publishable key only. Secret keys must never be shipped to the browser. */
  readonly VITE_PAYMENT_PUBLIC_KEY?: string;
  /** "true" fails the production build when placeholder business data remains. */
  readonly VITE_STRICT_CONFIG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
