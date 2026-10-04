import { env } from "./env";
import { collectConfigIssues, type ConfigIssue } from "./config-checks";

/**
 * Runs once before React mounts.
 *  - Development / staging: prints a grouped report so problems are impossible
 *    to miss while working.
 *  - Production: stays silent in the console for shoppers, but the same issue
 *    list drives the blocking configuration screen in `App.tsx`.
 */
export function reportStartupConfiguration(): ConfigIssue[] {
  const issues = collectConfigIssues();

  if (env.isProduction) return issues;
  if (issues.length === 0) return issues;

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");


  console.groupCollapsed(
    `%c[Rewaa config] ${errors.length} أخطاء · ${warnings.length} تحذيرات`,
    "color:#16306B;font-weight:bold"
  );
  console.info(`البيئة: ${env.appEnv} · mock: ${env.mock.enabled ? "مفعّل" : "معطّل"} · API: ${env.api.url || "غير مضبوط"}`);
  [...errors, ...warnings].forEach((issue) => {
    const label = issue.level === "error" ? "✖" : "⚠";
    console.warn(`${label} ${issue.title}\n   ${issue.detail}${issue.hint ? `\n   ↳ ${issue.hint}` : ""}`);
  });
  console.groupEnd();


  return issues;
}
