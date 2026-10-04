/**
 * Static route model for SEO.
 *
 * This module is deliberately framework-free (no React, no `document`), so the
 * same data drives two things:
 *   1. the client-side `usePageSeo` calls in the pages, and
 *   2. the build-time prerender step (`scripts/prerender.mjs`), which writes a
 *      real HTML file per public route with title/description/canonical/OG/
 *      JSON-LD and a meaningful static summary for crawlers that do not run JS.
 *
 * Anything that must never be indexed (account, cart, checkout, auth, search…)
 * lives in `NOINDEX_PATHS` and feeds both `robots.txt` and the meta robots tag.
 */
import { productSummaries, products } from "@/data/catalog";
import { allCategories } from "@/data/catalog/categories";
import { brands } from "@/data/catalog/brands";
import { serviceOfferings } from "@/data/content/services";
import { guides } from "@/data/content/guides";
import { legalDocuments } from "@/data/content/legal";
import { branches } from "@/data/content/branches";
import { faqs } from "@/data/content/faqs";
import { seo as seoConfig, brand, contact, legal, serviceAreas, shipping } from "@/config/site";

export interface PrerenderLink {
  label: string;
  href: string;
}

export interface PrerenderRoute {
  /** Absolute path on the storefront, e.g. `/p/ro-500`. */
  path: string;
  title: string;
  description: string;
  type: "website" | "product" | "article" | "profile";
  image?: string;
  robots?: string;
  jsonLd?: Record<string, unknown>[];
  /** Static <h1> + summary + links rendered into the prerendered HTML. */
  heading: string;
  summary: string;
  links?: PrerenderLink[];
  /** Sitemap hints. */
  priority: number;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  lastmod?: string;
}

export interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: string;
  lastmod?: string;
}

/** Routes that must never appear in search results. */
export const NOINDEX_PATHS: { path: string; note: string }[] = [
  { path: "/cart", note: "سلة خاصة بالزائر" },
  { path: "/checkout", note: "مسار دفع" },
  { path: "/order", note: "تتبع طلب" },
  { path: "/account", note: "حساب العميل" },
  { path: "/login", note: "تسجيل دخول" },
  { path: "/register", note: "إنشاء حساب" },
  { path: "/forgot-password", note: "استعادة كلمة المرور" },
  { path: "/reset-password", note: "تعيين كلمة مرور" },
  { path: "/wishlist", note: "قائمة رغبات" },
  { path: "/compare", note: "مقارنة" },
  { path: "/search", note: "نتائج بحث" },
  { path: "/services/book", note: "نموذج حجز خدمة" },
  { path: "/help/track", note: "تتبع" },
  { path: "/help/returns", note: "نموذج إرجاع" },
  { path: "/help/warranty-claim", note: "نموذج ضمان" },
  { path: "/404", note: "صفحة غير موجودة" },
];

/** Path prefixes that are never indexable (kept separate for readability). */
export const NOINDEX_PREFIXES = ["/account", "/order"];

/** Convenience: is a path indexable at all (used by runtime + script)? */
export function isIndexable(path: string): boolean {
  if (NOINDEX_PATHS.some((entry) => path === entry.path || path.startsWith(`${entry.path}/`))) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Structured data helpers (framework-free mirrors of lib/seo.ts)       */
/* ------------------------------------------------------------------ */

const siteUrl = () => seoConfig.siteUrl;

export function abs(path: string): string {
  if (/^https?:/.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    alternateName: brand.nameEn,
    url: siteUrl(),
    slogan: brand.tagline,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "SA",
      ...(contact.addressLine ? { streetAddress: contact.addressLine } : {}),
    },
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: siteUrl(),
    inLanguage: "ar-SA",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { label: string; href: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: abs(item.href),
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function articleJsonLd(article: {
  title: string;
  excerpt: string;
  slug: string;
  heroImage: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: abs(article.heroImage),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.author },
    publisher: { "@type": "Organization", name: brand.name, url: siteUrl() },
    mainEntityOfPage: abs(`/guides/${article.slug}`),
    inLanguage: "ar-SA",
  };
}

export function productJsonLd(slug: string): Record<string, unknown> | undefined {
  const product = products.find((entry) => entry.slug === slug);
  if (!product) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.nameEn ? { alternateName: product.nameEn } : {}),
    sku: product.sku,
    description: product.shortDescription ?? product.description?.slice(0, 300),
    image: product.images?.map((image) => abs(image.large)) ?? [],
    brand: { "@type": "Brand", name: product.brand },
    category: product.category.name,
    inLanguage: "ar-SA",
    offers: {
      "@type": "Offer",
      url: abs(`/p/${product.slug}`),
      priceCurrency: legal.currency === "SAR" ? "SAR" : legal.currency,
      price: product.price,
      availability:
        product.variants.some((variant) => variant.stock > 0)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: brand.name },
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Route builders                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_ROBOTS = "index, follow, max-image-preview:large";

function staticRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [
    {
      path: "/",
      title: seoConfig.defaultTitle,
      description: seoConfig.defaultDescription,
      type: "website",
      heading: brand.name,
      summary: brand.tagline,
      jsonLd: [organizationJsonLd(), websiteJsonLd()],
      priority: 1,
      changefreq: "daily",
      links: [
        { label: "فلاتر المياه", href: "/c/water-filters" },
        { label: "أنظمة الترشيح المركزية", href: "/c/whole-house" },
        { label: "الخدمات", href: "/services" },
        { label: "مستشار المياه", href: "/product-finder" },
      ],
    },
    {
      path: "/product-finder",
      title: "مستشار المياه — اختر النظام المناسب | رواء",
      description:
        "أجب عن أسئلة قصيرة عن مدينتك ومصدر المياه ونسبة الأملاح وعدد الأفراد، واحصل على ترشيح مرتّب للأنظمة المناسبة مع سبب واضح لكل ترشيح.",
      type: "website",
      heading: "مستشار المياه",
      summary: "ترشيحات مرتّبة لأنظمة التنقية حسب مصدر المياه والاستهلاك، مع بيان سبب كل ترشيح.",
      priority: 0.9,
      changefreq: "monthly",
    },
    {
      path: "/compatibility",
      title: "فاحص توافق الشمعات وقطع الغيار | رواء",
      description:
        "ابحث باسم الجهاز أو رقم الموديل لتعرف القطع المتوافقة معه من كتالوج رواء، مع سبب التوافق والبدائل المتاحة وأسعار القطع.",
      type: "website",
      heading: "فاحص التوافق",
      summary: "تطابق القطع من بيانات الكتالوج: موديلات التوافق، النوع، المقاس، وسبب كل تطابق.",
      priority: 0.8,
      changefreq: "monthly",
      links: [
        { label: "الشمعات وقطع الغيار", href: "/c/cartridges" },
        { label: "خدمات التركيب والصيانة", href: "/services" },
      ],
    },
    {
      path: "/brands",
      title: "العلامات التجارية | رواء",
      description:
        "تصفّح العلامات التجارية المتوفرة في كتالوج رواء، مع صفحة لكل علامة توضح المنتجات والضمان وخدمة التركيب وقطع الغيار.",
      type: "website",
      heading: "دليل العلامات التجارية",
      summary: "علامات موجودة فعليًا في الكتالوج، ولكل علامة صفحة بالمنتجات والضمان والخدمة.",
      priority: 0.6,
      changefreq: "monthly",
      links: [
        { label: "فلاتر المياه", href: "/c/water-filters" },
        { label: "الشمعات وقطع الغيار", href: "/c/cartridges" },
      ],
    },
    {
      path: "/calculator",
      title: "حاسبة توفير المياه — معبأة مقابل فلتر | رواء",
      description:
        "قارن تكلفة مياه الشرب المعبأة مع تكلفة شراء وتشغيل نظام تنقية: نقطة التعادل، التوفير المتوقع، وتكلفة اللتر — بأرقام تقدر تعدّلها كلها.",
      type: "website",
      heading: "حاسبة توفير المياه",
      summary: "مقارنة تفاعلية بين المياه المعبأة وامتلاك فلتر مياه، مع نقطة تعادل وتوفير متوقع خلال مدة تختارها.",
      priority: 0.8,
      changefreq: "monthly",
      links: [
        { label: "فلاتر المياه", href: "/c/water-filters" },
        { label: "أنظمة الترشيح المركزية", href: "/c/whole-house" },
        { label: "خدمات التركيب والصيانة", href: "/services" },
      ],
    },
    {
      path: "/services",
      title: "خدمات التركيب والصيانة وفحص المياه | رواء",
      description:
        "احجز تركيب أنظمة التنقية، الصيانة الدورية، فحص جودة المياه، وخدمات المنشآت التجارية من فرق رواء الفنية.",
      type: "website",
      heading: "خدمات رواء",
      summary: serviceOfferings.map((service) => service.name).join(" · "),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "خدمات رواء",
          itemListElement: serviceOfferings.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: service.name,
            url: abs(`/services/${service.slug}`),
          })),
        },
      ],
      priority: 0.9,
      changefreq: "monthly",
      links: serviceOfferings.map((service) => ({ label: service.name, href: `/services/${service.slug}` })),
    },
    {
      path: "/whole-house",
      title: "أنظمة تنقية المياه للمنزل بالكامل | رواء",
      description:
        "حلول ترشيح مركزية تغطي الشرب والاستخدام اليومي في المنزل، مع تحديد النظام حسب عدد الأدوار ونقاط الاستخدام واستهلاك الأسرة.",
      type: "website",
      heading: "تنقية المنزل بالكامل",
      summary: "اختر نظامًا مركزيًا يحمي كل نقاط المياه في المنزل مع خطة تركيب وصيانة.",
      priority: 0.8,
      changefreq: "monthly",
    },
    {
      path: "/offers",
      title: "عروض رواء على أنظمة تنقية المياه والخدمات",
      description: "العروض السارية على الأنظمة والشمعات وخدمات التركيب والصيانة، بأسعار ومدد واضحة.",
      type: "website",
      heading: "عروض رواء",
      summary: "عروض على الأنظمة والشمعات وباقات التركيب والصيانة.",
      priority: 0.7,
      changefreq: "weekly",
    },
    {
      path: "/about",
      title: "عن رواء | متجر أنظمة تنقية وتحلية المياه",
      description:
        "رواء متجر سعودي متخصص في أنظمة تنقية وتحلية المياه وقطعها الأصلية، مع خدمات تركيب وصيانة وفحص مياه.",
      type: "website",
      heading: "عن رواء",
      summary: `رواء | ${brand.nameEn} — ${brand.tagline}.`,
      jsonLd: [organizationJsonLd()],
      priority: 0.6,
      changefreq: "yearly",
    },
    {
      path: "/faq",
      title: "الأسئلة الشائعة | رواء",
      description: "إجابات عن أكثر الأسئلة تكرارًا حول أنظمة التنقية، الشمعات، التركيب، الصيانة، الشحن والإرجاع والضمان.",
      type: "website",
      heading: "الأسئلة الشائعة",
      summary: `${faqs.length} سؤالًا وجوابًا عن الأنظمة والطلب والدعم الفني.`,
      jsonLd: [faqJsonLd(faqs.slice(0, 12).map((item) => ({ q: item.question, a: item.answer })))],
      priority: 0.7,
      changefreq: "monthly",
    },
    {
      path: "/stores",
      title: "فروع رواء ومواقع الخدمة",
      description: `فروع رواء ومخازن الخدمة${serviceAreas.cities?.length ? ` في ${serviceAreas.cities.join("، ")}` : ""} مع ساعات العمل وأرقام التواصل.`,
      type: "website",
      heading: "الفروع ومواقع الخدمة",
      summary: branches.map((branch) => `${branch.name} — ${branch.city}`).join(" · "),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "فروع رواء",
          itemListElement: branches.map((branch, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${branch.name} — ${branch.district}`,
          })),
        },
      ],
      priority: 0.7,
      changefreq: "monthly",
    },
    {
      path: "/guides",
      title: "أدلة المياه والصيانة | رواء",
      description: "أدلة عملية لاختيار أنظمة التنقية، قراءة نتائج فحص المياه، والصيانة الدورية للفلاتر والشمعات.",
      type: "website",
      heading: "أدلة رواء",
      summary: `${guides.length} دليلًا عن جودة المياه والصيانة واختيار الأنظمة.`,
      priority: 0.7,
      changefreq: "weekly",
      links: guides.slice(0, 12).map((guide) => ({ label: guide.title, href: `/guides/${guide.slug}` })),
    },
    {
      path: "/business",
      title: "حلول المياه للجهات التجارية | رواء",
      description:
        "توريد وتركيب أنظمة تنقية المياه للمنشآت: مقاهي، مطاعم، مصانع، جهات حكومية وعقارات، مع عرض سعر حسب الاستهلاك اليومي.",
      type: "website",
      heading: "حلول المنشآت التجارية",
      summary: "دراسة احتياج حسب الاستهلاك اليومي ونوع النشاط، مع عرض سعر وصيانة دورية.",
      priority: 0.6,
      changefreq: "monthly",
    },
    {
      path: "/help/contact",
      title: "تواصل معنا | رواء",
      description: "بيانات التواصل مع خدمة عملاء رواء والدعم الفني، مع نموذج رسالة وساعات العمل.",
      type: "website",
      heading: "تواصل معنا",
      summary: contact.phone || contact.email ? `خدمة العملاء: ${contact.phone || contact.email}` : "",
      priority: 0.6,
      changefreq: "monthly",
    },
    {
      path: "/contact/whatsapp",
      title: "تواصل عبر واتساب | رواء",
      description: "افتح محادثة واتساب مع خدمة عملاء رواء أو أرسل بيانات الطلب للمتابعة.",
      type: "website",
      heading: "تواصل عبر واتساب",
      summary: "محادثة مباشرة مع خدمة العملاء لمتابعة الطلب أو طلب عرض سعر.",
      priority: 0.5,
      changefreq: "monthly",
    },
  ];
  return routes;
}

function categoryRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [];
  for (const category of allCategories.length ? allCategories : []) {
    const children = category.children ?? [];
    routes.push({
      path: `/c/${category.slug}`,
      title: `${category.seo?.title ?? category.name} | رواء`,
      description: category.seo?.description ?? category.shortDescription,
      type: "website",
      image: category.heroImage,
      heading: category.name,
      summary: category.description,
      jsonLd: [
        breadcrumbJsonLd([
          { label: "الرئيسية", href: "/" },
          { label: category.name, href: `/c/${category.slug}` },
        ]),
      ],
      priority: children.length > 0 ? 0.9 : 0.8,
      changefreq: "weekly",
    });
    for (const child of children) {
      routes.push({
        path: `/c/${category.slug}/${child.slug}`,
        title: `${child.seo?.title ?? child.name} | رواء`,
        description: child.seo?.description ?? child.shortDescription,
        type: "website",
        image: child.heroImage,
        heading: child.name,
        summary: child.description,
        jsonLd: [
          breadcrumbJsonLd([
            { label: "الرئيسية", href: "/" },
            { label: category.name, href: `/c/${category.slug}` },
            { label: child.name, href: `/c/${category.slug}/${child.slug}` },
          ]),
        ],
        priority: 0.7,
        changefreq: "weekly",
      });
    }
  }
  return routes;
}

function productRoutes(): PrerenderRoute[] {
  return products.map((product) => {
    const schema = productJsonLd(product.slug);
    const summary = productSummaries.find((entry) => entry.slug === product.slug);
    return {
      path: `/p/${product.slug}`,
      title: product.meta?.title ?? `${product.name} | رواء`,
      description:
        product.meta?.description ??
        product.shortDescription ??
        `${product.name} من ${product.brand} — ${product.category.name}. ${shipping.note}`,
      type: "product" as const,
      image: summary?.image ?? product.images?.[0]?.large,
      heading: product.name,
      summary: `${product.shortDescription ?? ""} ${product.brand} · ${product.category.name} · ${product.sku}`.trim(),
      jsonLd: schema ? [schema] : [],
      priority: 0.8,
      changefreq: "weekly" as const,
    };
  });
}

function brandRoutes(): PrerenderRoute[] {
  return brands.map((entry) => ({
    path: `/b/${entry.slug}`,
    title: `منتجات ${entry.name} | رواء`,
    description:
      entry.description ?? `تشكيلة منتجات ${entry.name} المتوفرة لدى رواء مع أسعار وضمانات واضحة.`,
    type: "website" as const,
    heading: `منتجات ${entry.name}`,
    summary: entry.description ?? `منتجات ${entry.name} من كتالوج رواء.`,
    priority: 0.6,
    changefreq: "weekly" as const,
  }));
}

function serviceRoutes(): PrerenderRoute[] {
  return serviceOfferings.map((service) => ({
    path: `/services/${service.slug}`,
    title: `${service.name} | خدمات رواء`,
    description: service.summary,
    type: "website" as const,
    heading: service.name,
    summary: `${service.tagline} — ${service.durationLabel}. ${service.coverageNote}`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: service.name,
        description: service.summary,
        serviceType: service.shortName,
        provider: { "@type": "Organization", name: brand.name, url: siteUrl() },
        areaServed: serviceAreas.cities ?? [],
        url: abs(`/services/${service.slug}`),
        ...(service.startingPrice
          ? {
              offers: {
                "@type": "Offer",
                price: service.startingPrice,
                priceCurrency: legal.currency,
                description: service.priceNote,
              },
            }
          : {}),
      },
    ],
    priority: 0.8,
    changefreq: "monthly" as const,
  }));
}

function guideRoutes(): PrerenderRoute[] {
  return guides.map((guide) => ({
    path: `/guides/${guide.slug}`,
    title: `${guide.title} | أدلة رواء`,
    description: guide.excerpt,
    type: "article" as const,
    image: guide.heroImage,
    heading: guide.title,
    summary: guide.excerpt,
    links: guide.relatedProductSlugs.slice(0, 4).map((slug) => ({
      label: productSummaries.find((item) => item.slug === slug)?.name ?? slug,
      href: `/p/${slug}`,
    })),
    jsonLd: [
      articleJsonLd({
        title: guide.title,
        excerpt: guide.excerpt,
        slug: guide.slug,
        heroImage: guide.heroImage,
        publishedAt: guide.publishedAt,
        updatedAt: guide.updatedAt,
        author: guide.author,
      }),
    ],
    priority: 0.7,
    changefreq: "monthly" as const,
  }));
}

function legalRoutes(): PrerenderRoute[] {
  return legalDocuments.map((doc) => ({
    path: `/legal/${doc.slug}`,
    title: `${doc.title} | رواء`,
    description: doc.summary ?? doc.title,
    // Policies stay crawlable so they can be linked from consent banners, but
    // they carry no commercial value — low priority in the sitemap.
    type: "website" as const,
    heading: doc.title,
    summary: doc.summary ?? doc.title,
    priority: 0.3,
    changefreq: "yearly" as const,
    lastmod: doc.updatedAt,
  }));
}

let cache: PrerenderRoute[] | undefined;

/** Every prerenderable public route, deduplicated by path. */
export function prerenderRoutes(): PrerenderRoute[] {
  if (cache) return cache;
  const all = [
    ...staticRoutes(),
    ...categoryRoutes(),
    ...productRoutes(),
    ...brandRoutes(),
    ...serviceRoutes(),
    ...guideRoutes(),
    ...legalRoutes(),
  ];
  const seen = new Set<string>();
  cache = all.filter((route) => {
    if (seen.has(route.path)) return false;
    seen.add(route.path);
    return true;
  });
  return cache;
}

/** Sitemap payload: prerenderable routes plus a derived lastmod where known. */
export function sitemapEntries(today = new Date().toISOString().slice(0, 10)): SitemapEntry[] {
  return prerenderRoutes()
    .filter((route) => isIndexable(route.path))
    .map((route) => ({
      path: route.path,
      priority: route.priority,
      changefreq: route.changefreq,
      lastmod: route.lastmod ?? today,
    }));
}

/** Priority order used for “related links” blocks inside the static shell. */
export function featuredRoutes(limit = 8): SitemapEntry[] {
  return sitemapEntries()
    .filter((entry) => entry.path !== "/")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
