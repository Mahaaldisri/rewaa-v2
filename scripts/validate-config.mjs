#!/usr/bin/env node
/**
 * Build-time configuration guard.
 *
 * Reads the same rules the app uses at runtime (`src/config/config-checks.ts`,
 * `src/config/site.ts`) by bundling them with esbuild, then reports every
 * placeholder / missing value for the environment being built.
 *
 * Usage:
 *   node scripts/validate-config.mjs [--env production] [--strict] [--json]
 *
 * Exit codes:
 *   0 — no blocking problems
 *   1 — blocking problems (missing API URL in production, demo payment in
 *       production, or any placeholder when --strict / VITE_STRICT_CONFIG=true)
 */
import { build } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { readFileSync, existsSync } = await import("node:fs");
const args = process.argv.slice(2);
const json = args.includes("--json");
const strictFlag = args.includes("--strict");
const envIndex = args.indexOf("--env");
const mode = envIndex !== -1 ? args[envIndex + 1] : process.env.NODE_ENV || "production";
const isDevMode = mode === "development";
const warnOnly = args.includes("--warn-only");

/** Minimal `.env` reader — mirrors Vite's load order without the dependency. */
function loadEnvFiles(target) {
  const files = [".env", `.env.${target}`, `.env.${target}.local`, ".env.local"];
  const values = {};
  for (const file of files) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    for (const rawLine of readFileSync(full, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  }
  return values;
}

const fileEnv = loadEnvFiles(mode);
const resolvedEnv = { ...fileEnv, ...process.env };

const COLOR = {
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  reset: "\u001b[0m",
};

/** Loads the TS config modules through esbuild so we share one source of truth. */
async function loadConfig() {
  const dir = mkdtempSync(path.join(tmpdir(), "rewaa-config-"));
  const entry = path.join(dir, "entry.ts");
  writeFileSync(
    entry,
    `export { collectConfigIssues, inspectOfficialData } from "${path.join(root, "src/config/config-checks.ts")}";
     export { env } from "${path.join(root, "src/config/env.ts")}";`
  );

  const outfile = path.join(dir, "bundle.mjs");
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    alias: { "@": path.join(root, "src") },
    // Vite replaces import.meta.env at build time; emulate it for the CLI.
    define: {
      "import.meta.env.DEV": JSON.stringify(isDevMode),
      "import.meta.env.PROD": JSON.stringify(!isDevMode),
      "import.meta.env.MODE": JSON.stringify(mode),
      "import.meta.env": JSON.stringify({
        DEV: isDevMode,
        PROD: !isDevMode,
        MODE: mode,
        // CLI/process values win; otherwise mirror what the Vite env file would inject.
        VITE_APP_ENV: resolvedEnv.VITE_APP_ENV || (["development", "staging", "production"].includes(mode) ? mode : ""),
        ...resolvedEnv,
      }),
    },
  });

  const mod = await import(pathToFileURL(outfile).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

const { collectConfigIssues, inspectOfficialData, env } = await loadConfig();
const issues = collectConfigIssues();
const errors = issues.filter((issue) => issue.level === "error");
const warnings = issues.filter((issue) => issue.level === "warning");
const placeholders = inspectOfficialData();

const strict = strictFlag || process.env.VITE_STRICT_CONFIG === "true" || env.strictConfig;
const blocking = [...errors];
if (strict && placeholders.length > 0) {
  blocking.push({
    id: "strict_placeholders",
    level: "error",
    title: `البناء الصارم: ${placeholders.length} حقول رسمية ببيانات تجريبية`,
    detail: placeholders.map((entry) => entry.label).join(" · "),
  });
}

if (json) {
  console.log(
    JSON.stringify(
      {
        mode,
        appEnv: env.appEnv,
        strict,
        apiConfigured: env.api.configured,
        mockEnabled: env.mock.enabled,
        paymentProvider: env.payments.provider,
        analyticsProvider: env.analytics.provider,
        monitoringProvider: env.monitoring.provider,
        issues,
        placeholders,
        blocking: blocking.length,
      },
      null,
      2
    )
  );
  process.exit(warnOnly || blocking.length === 0 ? 0 : 1);
}

console.log(`\n${COLOR.bold}Rewaa · فحص إعداد البيئة (${mode})${COLOR.reset}`);
console.log(
  `${COLOR.dim}env=${env.appEnv} · api=${env.api.configured ? env.api.url : "غير مضبوط"} · mock=${
    env.mock.enabled ? "مفعّل" : "معطّل"
  } · payments=${env.payments.provider} · analytics=${env.analytics.provider} · monitoring=${env.monitoring.provider}${
    strict ? " · strict" : ""
  }${COLOR.reset}\n`
);

for (const issue of errors) {
  console.log(`${COLOR.red}✖ ${issue.title}${COLOR.reset}\n   ${issue.detail}${issue.hint ? `\n   ↳ ${issue.hint}` : ""}`);
}
for (const issue of warnings) {
  console.log(`${COLOR.yellow}⚠ ${issue.title}${COLOR.reset}\n   ${issue.detail}${issue.hint ? `\n   ↳ ${issue.hint}` : ""}`);
}

if (placeholders.length > 0) {
  console.log(`\n${COLOR.yellow}بيانات رسمية بانتظار الاستبدال (${placeholders.length}):${COLOR.reset}`);
  placeholders.forEach((entry) => console.log(`   • ${entry.label} ${COLOR.dim}(${entry.key}) — ${entry.reason}${COLOR.reset}`));
}

if (blocking.length === 0) {
  console.log(`\n${COLOR.green}✔ لا توجد مشاكل مانعة في إعداد هذه البيئة.${COLOR.reset}\n`);
  process.exit(0);
}

if (warnOnly) {
  console.log(
    `\n${COLOR.red}${COLOR.bold}✖ ${blocking.length} مشكلة مانعة في الإعداد${COLOR.reset}` +
      `\n${COLOR.dim}البناء يكمل لأنه يعمل بوضع التحذير فقط. للإيقاف: npm run config:check:strict${COLOR.reset}\n`
  );
  process.exit(0);
}

console.log(
  `\n${COLOR.red}${COLOR.bold}✖ ${blocking.length} مشكلة مانعة — أوقف البناء.${COLOR.reset}` +
    `\n${COLOR.dim}راجع .env.example واضبط القيم، أو شغّل --warn-only لإصدار تحذيرات فقط.${COLOR.reset}\n`
);
process.exit(1);
