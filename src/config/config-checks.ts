/**
 * Configuration checks shared by the runtime (dev console + error screen) and
 * the production build script (`scripts/validate-config.mjs`).
 *
 * We only ever *report* problems here — deciding whether a problem blocks the
 * build is the caller's job (`env.strictConfig`, or a missing API URL in
 * production which always blocks the UI).
 */
import { env } from "./env";
import { contact, legal, officialFields, pendingOfficialFields } from "./site";

export type IssueLevel = "error" | "warning";

export interface ConfigIssue {
  id: string;
  level: IssueLevel;
  title: string;
  detail: string;
  hint?: string;
}

/** Extra safety net for values that look like sample data even if not flagged. */
const PLACEHOLDER_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /x{3,}/i, reason: "القيمة تحتوي على أحرف إخفاء (X) بدل رقم حقيقي" },
  { pattern: /^0*(\d)\1{5,}$/, reason: "رقم متكرر لا يبدو رقمًا رسميًا" },
  { pattern: /1234|5678|0000/, reason: "تسلسل تجريبي شائع" },
  { pattern: /example\.(com|org)/i, reason: "نطاق مثال غير حقيقي" },
  { pattern: /REPLACE|PLACEHOLDER|TODO|TBD/i, reason: "نص مؤقت صريح" },
];

function looksLikeSample(value: string | number): string | undefined {
  const text = String(value);
  return PLACEHOLDER_PATTERNS.find((entry) => entry.pattern.test(text))?.reason;
}

/** Business fields that still hold sample data, with the reason why we think so. */
export function inspectOfficialData(): { key: string; label: string; reason: string }[] {
  return officialFields
    .map((field) => {
      if (field.placeholder) {
        return { key: field.key, label: field.label, reason: "معلَّمة كبيانات تجريبية في site.ts" };
      }
      const suspicious = looksLikeSample(field.value);
      return suspicious ? { key: field.key, label: field.label, reason: suspicious } : null;
    })
    .filter((entry): entry is { key: string; label: string; reason: string } => entry !== null);
}

/** Every configuration problem the current build is carrying. */
export function collectConfigIssues(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const pending = inspectOfficialData();

  /* ------------------------------- API ------------------------------- */
  if (!env.api.configured && !env.mock.enabled) {
    issues.push({
      id: "api_url_missing",
      level: "error",
      title: "عنوان الـAPI غير مضبوط",
      detail: "المتجر مضبوط على بيئة إنتاج/تجريبية بدون VITE_API_URL ومع تعطيل بيانات العرض.",
      hint: "اضبط VITE_API_URL في ملف البيئة (مثال: https://api.rewaa.sa) ثم أعد البناء.",
    });
  }

  if (!env.api.configured && env.mock.forced) {
    issues.push({
      id: "mock_in_non_dev",
      level: "warning",
      title: "بيانات عرض في بيئة غير التطوير",
      detail: `البناء يعمل على طبقة البيانات الوهمية داخل «${env.appEnv}». لن تظهر أي بيانات حقيقية.`,
      hint: "استخدم VITE_ENABLE_MOCK فقط للعرض التجريبي، وأضف VITE_API_URL قبل الإطلاق.",
    });
  }

  /* ----------------------------- Payments ----------------------------- */
  if (env.isProduction && env.payments.isDemo) {
    issues.push({
      id: "demo_payment_in_production",
      level: "error",
      title: "بوابة دفع تجريبية في بيئة الإنتاج",
      detail: "مزوّد الدفع مضبوط على الوضع التجريبي، ولا يجب تحصيل أي مبلغ حقيقي بهذا الإعداد.",
      hint: "اضبط VITE_PAYMENT_PROVIDER على بوابة حقيقية مع VITE_PAYMENT_PUBLIC_KEY (مفتاح عام فقط).",
    });
  }

  if (env.isProduction && !env.payments.isConfigured) {
    issues.push({
      id: "payment_not_configured",
      level: "warning",
      title: "لا توجد بوابة دفع مهيأة",
      detail: "خطوة الدفع ستعرض رسالة «الدفع غير مهيأ» ولن يُنشأ أي طلب.",
      hint: "أكمل إعداد المزوّد ومفتاحه العام قبل استقبال الطلبات.",
    });
  }

  /* -------------------------------- AI -------------------------------- */
  if (env.ai.enabled && !env.ai.configured && !env.ai.allowDevAssistant) {
    issues.push({
      id: "ai_gateway_missing",
      // Never blocks the storefront: the site must keep working without AI.
      level: "warning",
      title: "المساعد الذكي بلا بوابة خادم",
      detail: "VITE_AI_URL غير مضبوط، لذلك لن يستطيع المساعد الإجابة في هذه البيئة.",
      hint: "اضبط VITE_AI_URL على بوابة الخادم (server/README.md)، أو عطّل المساعد صراحةً.",
    });
  }

  if (env.isProduction && !env.ai.configured) {
    issues.push({
      id: "ai_disabled_in_production",
      level: "warning",
      title: "المساعد الذكي غير مهيّأ في الإنتاج",
      detail: "سيظهر زر المساعد مع رسالة صريحة بأن الخدمة غير مهيّأة — ولا يعمل أي رد آلي على قواعد ثابتة.",
      hint: "شغّل بوابة الذكاء الاصطناعي واضبط VITE_AI_URL قبل الإطلاق.",
    });
  }

  if (env.ai.allowDevAssistant && !env.isDev) {
    issues.push({
      id: "ai_dev_assistant_outside_dev",
      level: "warning",
      title: "المساعد التطويري مفعّل خارج بيئة التطوير",
      detail: "المساعد التطويري قائم على قواعد ثابتة وموسوم بوضوح، لكنه ليس ذكاءً اصطناعيًا حقيقيًا.",
      hint: "اضبط VITE_AI_ALLOW_DEV_ASSISTANT=false وحدّد VITE_AI_URL.",
    });
  }

  /* ---------------------------- Analytics ---------------------------- */
  if (env.analytics.provider !== "none" && env.analytics.provider !== "console" && !env.analytics.measurementId) {
    issues.push({
      id: "analytics_id_missing",
      level: "warning",
      title: "مزوّد التحليلات بدون معرّف",
      detail: `VITE_ANALYTICS_PROVIDER=${env.analytics.provider} بدون VITE_ANALYTICS_ID، لذلك لن تُرسل أي أحداث.`,
    });
  }

  /* --------------------------- Monitoring --------------------------- */
  if ((env.monitoring.provider === "sentry" || env.monitoring.provider === "custom") && !env.monitoring.dsn) {
    issues.push({
      id: "monitoring_dsn_missing",
      level: "warning",
      title: "مراقبة الأخطاء بدون DSN",
      detail: "المزوّد مختار بدون VITE_MONITORING_DSN، لذا تُسجَّل الأخطاء محليًا فقط.",
    });
  }

  /* ------------------------- Business data -------------------------- */
  if (pending.length > 0) {
    issues.push({
      id: "official_data_pending",
      level: env.isProduction ? "warning" : "warning",
      title: `${pending.length} حقول رسمية ببيانات تجريبية`,
      detail: pending.map((entry) => `${entry.label} (${entry.key})`).join(" · "),
      hint: "استبدلها بالبيانات الرسمية في src/config/site.ts قبل الإطلاق.",
    });
  }

  if (!env.siteUrl) {
    issues.push({
      id: "site_url_missing",
      level: env.isProduction ? "warning" : "warning",
      title: "VITE_SITE_URL غير مضبوط",
      detail: "سيُستخدم النطاق الافتراضي من site.ts في روابط canonical وخريطة الموقع.",
    });
  }

  return issues;
}

export function fatalIssues(issues: ConfigIssue[]): ConfigIssue[] {
  return issues.filter((issue) => issue.level === "error");
}

export function hasFatalIssues(issues: ConfigIssue[]): boolean {
  return fatalIssues(issues).length > 0;
}

/** Compact one-line summary of official data still missing. */
export function officialDataSummary(): string {
  if (pendingOfficialFields.length === 0) return "لا توجد بيانات رسمية ناقصة";
  return `${pendingOfficialFields.length} من ${officialFields.length} حقول رسمية بحاجة إلى استبدال`;
}

export const officialContact = { contact, legal };
