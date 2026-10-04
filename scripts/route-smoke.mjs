/**
 * Route smoke test.
 *
 * Renders every public route of the storefront in jsdom against the real
 * components and service layer (development/mock configuration) and asserts the
 * page produced an <h1> instead of crashing or falling through to the 404 page.
 *
 * Usage: node scripts/route-smoke.mjs
 * Exits non-zero when any route fails.
 */
import { JSDOM } from "jsdom";
import { build } from "esbuild";

const routes = [
  "/", "/c/water-filters", "/c/cartridges", "/p/cartridges/carbon-block-cto", "/b/rewaa-pro",
  "/search?q=فلتر",
  "/c/water-filters?useCase=home&users=4-6&offers=1",
  "/c/cartridges?installationType=under-sink&sort=savings_desc",
  "/wishlist", "/compare", "/offers", "/product-finder", "/compatibility",
  "/calculator", "/calculator?mode=purchases&months=36&device=ro-7-stage&price=1899", "/brands",
  "/whole-house", "/cart", "/checkout", "/services", "/services/install", "/services/book",
  "/help/track", "/help/returns", "/help/contact", "/help/warranty-claim", "/contact/whatsapp",
  "/faq", "/about", "/stores", "/business", "/guides", "/legal/privacy", "/login", "/register",
  "/forgot-password", "/account?tab=maintenance", "/404",
];

const bundle = await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env": JSON.stringify({
      DEV: true,
      PROD: false,
      MODE: "development",
      VITE_APP_ENV: "development",
      VITE_ENABLE_MOCK: "true",
      VITE_PAYMENT_PROVIDER: "demo",
      VITE_ANALYTICS_PROVIDER: "console",
      VITE_ANALYTICS_REQUIRE_CONSENT: "false",
      VITE_MONITORING_PROVIDER: "console",
      VITE_ENABLE_WEB_VITALS: "false",
      VITE_SITE_URL: "http://localhost:5173",
    }),
  },
  alias: { "@": "./src" },
});

const code = bundle.outputFiles[0].text;
let pass = 0;
const failures = [];

for (const route of routes) {
  const dom = new JSDOM(`<!doctype html><html lang="ar" dir="rtl"><head></head><body><div id="root"></div></body></html>`, {
    url: `http://localhost${route}`,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.IntersectionObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame ||= (cb) => setTimeout(() => cb(0), 16);
  window.scrollTo = () => {};
  window.fetch ||= async () => new Response("{}", { headers: { "content-type": "application/json" } });
  window.AbortController ||= AbortController;
  window.Headers ||= Headers;
  window.Request ||= Request;
  window.Response ||= Response;

  try {
    window.eval(code);
    // Data-layer calls are asynchronous, so poll until the page has rendered its
    // heading (or give up) instead of guessing a single delay.
    const deadline = Date.now() + 2500;
    let html = "";
    let h1 = "";
    let crashed = false;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      html = window.document.getElementById("root")?.innerHTML ?? "";
      crashed = html.includes("حدث خطأ غير متوقع");
      h1 = window.document.querySelector("h1")?.textContent?.trim() ?? "";
      if (h1 || crashed) break;
    }
    if (h1 && !crashed) {
      pass += 1;
      console.log(`PASS ${route} — h1: ${h1.slice(0, 48)}`);
    } else {
      failures.push(`${route} (len=${html.length}${crashed ? ", crashed" : ", no h1"})`);
      console.log(`FAIL ${route} — len=${html.length}${crashed ? " CRASH" : " NO H1"}`);
    }
  } catch (error) {
    failures.push(`${route} (${String(error).slice(0, 80)})`);
    console.log(`FAIL ${route} — ${String(error).slice(0, 120)}`);
  }
  dom.window.close();
}

console.log(`\n${pass}/${routes.length} routes rendered`);
if (failures.length) {
  console.log("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
