#!/usr/bin/env node
/**
 * Static prerender + sitemap/robots generator.
 *
 * Runs after `vite build`. For every public route it writes a real HTML file
 * (`dist/<path>/index.html`) that already contains the route's title,
 * description, canonical, Open Graph, Twitter card and JSON-LD plus a readable
 * static summary — so search engines and social crawlers no longer depend on
 * client JavaScript for the metadata.
 *
 * The SPA bundle is untouched: once the file is served, React hydrates over the
 * static shell exactly as before. Private routes (account, cart, checkout,
 * auth, search…) are excluded and additionally disallowed in robots.txt.
 *
 * Usage: node scripts/prerender.mjs [--strict]
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const strict = process.argv.includes("--strict");
/** Writes only public/robots.txt + public/sitemap.xml (used before a dev server). */
const publicOnly = process.argv.includes("--public-only");

if (!publicOnly && !existsSync(path.join(dist, "index.html"))) {
  console.error("✖ dist/index.html غير موجود — شغّل `npm run build` أولًا.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Load the framework-free route model through esbuild                 */
/* ------------------------------------------------------------------ */

async function loadRouteModel() {
  const dir = mkdtempSync(path.join(tmpdir(), "rewaa-seo-"));
  const entry = path.join(dir, "entry.ts");
  writeFileSync(entry, `export * from "${path.join(root, "src/lib/seo-routes.ts")}";`);
  const outfile = path.join(dir, "bundle.mjs");
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    alias: { "@": path.join(root, "src") },
    define: { "import.meta.env": JSON.stringify(process.env) },
  });
  const mod = await import(pathToFileURL(outfile).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

const { prerenderRoutes, sitemapEntries, NOINDEX_PATHS, DEFAULT_ROBOTS } = await loadRouteModel();

const baseHtml = publicOnly ? "" : readFileSync(path.join(dist, "index.html"), "utf8");
/** Deep pages are built from the stripped shell (no duplicated inline bundle). */
let pageBase = baseHtml;
const siteUrl = (process.env.VITE_SITE_URL || "https://rewaa.sa").replace(/\/+$/, "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const abs = (url) => (url?.startsWith("http") ? url : `${siteUrl}${url ?? ""}`);

/* ------------------------------------------------------------------ */
/* Head rewriting                                                      */
/* ------------------------------------------------------------------ */

/** Replaces (or inserts) a `<meta>` tag regardless of attribute order. */
function setMeta(html, attr, key, content) {
  if (content === undefined || content === null || content === "") {
    return html.replace(new RegExp(`\\s*<meta[^>]*${attr}="${key}"[^>]*>`, "gi"), "");
  }
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta[^>]*${attr}="${key}"[^>]*>`, "i");
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function setLink(html, rel, href) {
  const pattern = new RegExp(`\\s*<link[^>]*rel="${rel}"[^>]*>`, "gi");
  if (href === undefined) return html.replace(pattern, "");
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  const single = new RegExp(`<link[^>]*rel="${rel}"[^>]*>`, "i");
  if (single.test(html)) return html.replace(single, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function setTitle(html, title) {
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  }
  return html.replace("</head>", `    <title>${escapeHtml(title)}</title>\n  </head>`);
}

function buildHead(route, base = pageBase) {
  let html = setTitle(base, route.title);
  html = setMeta(html, "name", "description", route.description);
  html = setMeta(html, "name", "robots", route.robots ?? DEFAULT_ROBOTS);

  const url = abs(route.path);
  html = setLink(html, "canonical", route.path === "/" ? `${siteUrl}/` : url);

  html = setMeta(html, "property", "og:type", route.type);
  html = setMeta(html, "property", "og:url", route.path === "/" ? `${siteUrl}/` : url);
  html = setMeta(html, "property", "og:title", route.title);
  html = setMeta(html, "property", "og:description", route.description);
  if (route.image) {
    html = setMeta(html, "property", "og:image", abs(route.image));
    html = setMeta(html, "name", "twitter:image", abs(route.image));
  }

  html = setMeta(html, "name", "twitter:card", route.image ? "summary_large_image" : "summary");
  html = setMeta(html, "name", "twitter:title", route.title);
  html = setMeta(html, "name", "twitter:description", route.description);

  const jsonLd = (route.jsonLd ?? []).filter(Boolean);
  const scripts = jsonLd
    .map((doc) => `    <script type="application/ld+json" data-seo="prerender">${JSON.stringify(doc)}</script>`)
    .join("\n");
  html = html.replace("</head>", `${scripts ? `\n${scripts}` : ""}\n  </head>`);

  return html;
}

/* ------------------------------------------------------------------ */
/* Static fallback content                                             */
/* ------------------------------------------------------------------ */

function buildStaticContent(route) {
  const links = (route.links ?? [])
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join("");
  const breadcrumb =
    route.path === "/"
      ? ""
      : `<nav aria-label="مسار التنقل"><a href="/">الرئيسية</a> / <span>${escapeHtml(route.heading)}</span></nav>`;

  return `
      <div id="rewaa-static" data-prerendered="${escapeHtml(route.path)}" dir="rtl" lang="ar">
        ${breadcrumb}
        <h1>${escapeHtml(route.heading)}</h1>
        <p>${escapeHtml(route.summary)}</p>
        ${links ? `<ul>${links}</ul>` : ""}
        <p><a href="${escapeHtml(route.path)}">افتح هذه الصفحة في متجر رواء</a></p>
      </div>`;
}

/**
 * The root build is a single self-contained HTML file (vite-plugin-singlefile).
 * Deep pages must not duplicate a 1.3 MB inline bundle 100+ times, so we extract
 * the very same script/style once into /assets and let the route files reference
 * it. Same code, one download, cached across every prerendered page.
 */
function extractSharedAssets(html) {
  let script = "";
  let style = "";
  const extracted = html
    .replace(/<script type="module"[^>]*>([\s\S]*?)<\/script>/i, (_match, body) => {
      script = body;
      return "";
    })
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/i, (_match, body) => {
      style = body;
      return "";
    });

  const refs = [];
  const assetsDir = path.join(dist, "assets");
  mkdirSync(assetsDir, { recursive: true });
  if (script) {
    writeFileSync(path.join(assetsDir, "app.js"), script);
    refs.push('<script type="module" src="/assets/app.js"></script>');
  }
  if (style) {
    writeFileSync(path.join(assetsDir, "app.css"), style);
    refs.unshift('<link rel="stylesheet" href="/assets/app.css" />');
  }
  return { shell: extracted, refs: refs.join("\n    ") };
}

const { shell, refs } = publicOnly ? { shell: "", refs: "" } : extractSharedAssets(baseHtml);
// `/` keeps the self-contained single-file build; every other route uses the shell.
pageBase = shell;

function buildDocument(route) {
  const isHome = route.path === "/";
  // Deep routes boot the shared bundle from /assets; `/` stays self-contained.
  let html = buildHead(route, isHome ? baseHtml : pageBase);
  const content = buildStaticContent(route);

  if (!isHome && refs) {
    html = html.replace("</head>", `    ${refs}\n  </head>`);
  }

  // The static block lives inside the mount node: React replaces it on hydrate,
  // and crawlers that never run JS still read a heading, a summary and links.
  if (html.includes('<div id="root">')) {
    html = html.replace('<div id="root">', `<div id="root">${content}`);
  } else {
    html = html.replace("<body>", `<body>${content}`);
  }
  return html;
}

/* ------------------------------------------------------------------ */
/* Sitemap + robots                                                    */
/* ------------------------------------------------------------------ */

function sitemapXml() {
  const entries = sitemapEntries();
  const urls = entries
    .map((entry) => {
      const loc = entry.path === "/" ? `${siteUrl}/` : `${siteUrl}${entry.path}`;
      return [
        "  <url>",
        `    <loc>${escapeHtml(loc)}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "",
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function robotsTxt() {
  const lines = [
    "# robots.txt — رواء | REWAA",
    "# مسارات الحساب والدفع والسلة والبحث مستثناة من الفهرسة.",
    "User-agent: *",
    "Allow: /",
  ];
  NOINDEX_PATHS.forEach((entry) => lines.push(`Disallow: ${entry.path}`));
  // Facet/sorting/tracking query strings duplicate the same content.
  lines.push("", "# استعلامات الفلترة والترتيب لا تُفهرس منفصلة", "Disallow: /*?", "");
  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`, "");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

if (publicOnly) {
  const publicDir = path.join(root, "public");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml());
  writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt());
  console.log(`✔ public/sitemap.xml (${sitemapEntries().length} رابط) و public/robots.txt محدّثان.`);
  process.exit(0);
}

const routes = prerenderRoutes();
let written = 0;

for (const route of routes) {
  const html = buildDocument(route);
  if (route.path === "/") {
    writeFileSync(path.join(dist, "index.html"), html);
  } else {
    const dir = path.join(dist, route.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), html);
  }
  written += 1;
}

// Keep the raw assets available for hosts that serve /public verbatim.
if (existsSync(path.join(root, "public"))) cpSync(path.join(root, "public"), dist, { recursive: true });

// Written after the copy: a stale public/sitemap.xml must never overwrite the
// sitemap generated from the current route model.
writeFileSync(path.join(dist, "sitemap.xml"), sitemapXml());
writeFileSync(path.join(dist, "robots.txt"), robotsTxt());

/* ---------------------------- Verification ---------------------------- */

const problems = [];
if (written < 40) problems.push(`عدد الصفحات المولّدة غير متوقع: ${written}`);
for (const route of ["/", "/c/water-filters", "/services", "/guides", "/faq"]) {
  const file = route === "/" ? path.join(dist, "index.html") : path.join(dist, route, "index.html");
  if (!existsSync(file)) {
    problems.push(`لم تُولَّد صفحة ${route}`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  if (!html.includes('data-prerendered="' + route + '"')) problems.push(`محتوى ثابت مفقود في ${route}`);
  if (!html.includes('rel="canonical"')) problems.push(`canonical مفقود في ${route}`);
  if (!html.includes('property="og:title"')) problems.push(`og:title مفقود في ${route}`);
}
if (!readFileSync(path.join(dist, "sitemap.xml"), "utf8").includes("<urlset")) problems.push("sitemap.xml غير صالح");
if (!readFileSync(path.join(dist, "robots.txt"), "utf8").includes("Sitemap:")) problems.push("robots.txt بلا Sitemap");

console.log(`\n✔ تم توليد ${written} صفحة ثابتة + sitemap.xml + robots.txt في dist/`);
if (problems.length > 0) {
  problems.forEach((problem) => console.error(`✖ ${problem}`));
  if (strict) process.exit(1);
} else {
  console.log("✔ تحقق العلامات: canonical و og:title و المحتوى الثابت موجودة في العينات المفحوصة.\n");
}
