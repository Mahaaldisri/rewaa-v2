/**
 * Internal link audit.
 *
 * Collects every static internal target used in `to="…"` / `href="…"` across the
 * source, then checks it against the real route table (static routes plus the
 * dynamic prefixes handled by `src/router.tsx`). Dynamic URLs built with
 * template literals are validated by the route smoke test instead.
 *
 * Usage: node scripts/link-audit.mjs
 * Exits non-zero when a link points at a route that does not exist.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("grep -rlE 'to=\"/|href=\"/' src --include=*.tsx --include=*.ts", { encoding: "utf8" })
  .trim().split("\n");
const literals = new Map();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const re = /(?:to|href)="(\/[^"$]*)"/g;
  let m;
  while ((m = re.exec(text))) {
    const path = m[1].split("?")[0].split("#")[0];
    if (!path) continue;
    if (!literals.has(path)) literals.set(path, file);
  }
}
const dynamic = [/^\/p\//, /^\/c\//, /^\/b\//, /^\/services\//, /^\/guides\//, /^\/legal\//, /^\/account/, /^\/order\//];
const staticOk = new Set([
  "/", "/search", "/wishlist", "/compare", "/offers", "/product-finder", "/compatibility", "/calculator", "/brands",
  "/whole-house", "/cart", "/checkout", "/services", "/services/book", "/help/track", "/help/returns", "/help/contact",
  "/help/warranty-claim", "/contact/whatsapp", "/faq", "/about", "/stores", "/business", "/guides", "/login",
  "/register", "/forgot-password", "/reset-password", "/account", "/404",
]);
const bad = [];
for (const [path, file] of literals) {
  if (staticOk.has(path) || dynamic.some((re) => re.test(path))) continue;
  bad.push(`${path}  <-  ${file}`);
}
if (bad.length === 0) {
  console.log(`✔ كل الروابط الداخلية الثابتة (${literals.size}) تشير إلى مسارات موجودة.`);
} else {
  console.error(`✖ ${bad.length} رابط داخلي يشير إلى مسار غير موجود:`);
  console.error(bad.join("\n"));
  process.exit(1);
}
