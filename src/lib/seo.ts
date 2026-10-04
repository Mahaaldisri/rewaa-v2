import { useEffect } from "react";
import type { Article, Branch, FaqItem, Offer } from "@/types/content";
import type { Product, Variant } from "@/types/product";
import type { ProductSummary } from "@/types/catalog";
import { brand, contact, legal, seo as seoConfig, social } from "@/config/site";

/**
 * SPA SEO layer.
 * Every page declares its own title/description/canonical/OG data and the
 * matching structured data. The hook creates the tags when they are missing and
 * always cleans up the JSON-LD it injected, so navigating between pages never
 * leaves a stale product schema behind.
 */

export interface SeoInput {
  title: string;
  description?: string;
  /** Path (e.g. `/c/water-filters`) or absolute URL. */
  canonical?: string;
  image?: string;
  type?: "website" | "product" | "article" | "profile";
  robots?: string;
  keywords?: string[];
  /** One or more JSON-LD documents. */
  jsonLd?: Record<string, unknown>[];
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${seoConfig.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string | undefined): void {
  if (content === undefined) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string | undefined): void {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSONLD_ID = "page-jsonld";

function writeJsonLd(documents: Record<string, unknown>[]): void {
  document.querySelectorAll(`script[data-seo="${JSONLD_ID}"]`).forEach((node) => node.remove());
  documents.forEach((doc) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = JSONLD_ID;
    script.textContent = JSON.stringify(doc);
    document.head.appendChild(script);
  });
}

/** Applies all head tags for the current page. */
export function usePageSeo({
  title,
  description,
  canonical,
  image,
  type = "website",
  robots = "index, follow, max-image-preview:large",
  keywords,
  jsonLd,
}: SeoInput): void {
  const url = canonical ? absoluteUrl(canonical) : undefined;

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";

    upsertMeta("name", "description", description ?? seoConfig.defaultDescription);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "author", `${brand.name} | ${brand.nameEn}`);
    if (keywords?.length) upsertMeta("name", "keywords", keywords.join(", "));

    upsertLink("canonical", url);

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:locale", seoConfig.locale);
    upsertMeta("property", "og:site_name", `${brand.name} | ${brand.nameEn}`);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description ?? seoConfig.defaultDescription);
    upsertMeta("property", "og:url", url);
    if (image) upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:site", seoConfig.twitterHandle);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description ?? seoConfig.defaultDescription);
    if (image) upsertMeta("name", "twitter:image", image);

    if (jsonLd && jsonLd.length > 0) writeJsonLd(jsonLd);
    else document.querySelectorAll(`script[data-seo="${JSONLD_ID}"]`).forEach((node) => node.remove());
  }, [title, description, url, image, type, robots, keywords, jsonLd]);
}

/* ------------------------------------------------------------------ */
/* Structured data builders                                            */
/* ------------------------------------------------------------------ */
export const organizationSchema = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: brand.name,
  alternateName: brand.nameEn,
  url: seoConfig.siteUrl,
  description: brand.description,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: contact.phone,
      contactType: "customer service",
      areaServed: "SA",
      availableLanguage: ["ar"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: contact.countryCode,
    addressLocality: contact.city,
    addressRegion: contact.region,
    streetAddress: contact.addressLine,
  },
  sameAs: Object.values(social),
});

export const websiteSchema = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: `${brand.name} | ${brand.nameEn}`,
  url: seoConfig.siteUrl,
  inLanguage: "ar-SA",
  potentialAction: {
    "@type": "SearchAction",
    target: `${seoConfig.siteUrl}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumbSchema = (items: { label: string; href: string }[]): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    item: absoluteUrl(item.href),
  })),
});

export const faqSchema = (items: { question: string; answer: string }[]): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const articleSchema = (article: Article): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.excerpt,
  image: article.heroImage,
  datePublished: article.publishedAt,
  dateModified: article.updatedAt,
  inLanguage: "ar-SA",
  author: { "@type": "Organization", name: article.author },
  publisher: { "@type": "Organization", name: `${brand.name} | ${brand.nameEn}`, url: seoConfig.siteUrl },
  mainEntityOfPage: absoluteUrl(`/guides/${article.slug}`),
});

export const itemListSchema = (items: ProductSummary[], name: string): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(`/p/${item.slug}`),
    name: item.name,
  })),
});

const AVAILABILITY: Record<Variant["status"], string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  coming_soon: "https://schema.org/PreOrder",
};

export const productSchema = (product: Product, variant?: Variant): Record<string, unknown> => {
  const price = variant?.price ?? product.price;
  const status = variant?.status ?? "in_stock";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(`/p/${product.slug}`)}#product`,
    name: product.name,
    alternateName: product.nameEn,
    sku: variant?.sku ?? product.sku,
    productID: product.id,
    description: product.shortDescription,
    url: absoluteUrl(`/p/${product.slug}`),
    image: product.images.slice(0, 6).map((img) => img.large),
    brand: { "@type": "Brand", name: product.brand },
    category: `${product.category.name} > ${product.subcategory.name}`,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/p/${product.slug}`),
      priceCurrency: product.currency,
      price: price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      availability: AVAILABILITY[status],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: product.seller.name },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: contact.countryCode },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 6, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: contact.countryCode,
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: product.returns.days,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
};

export const serviceSchema = (service: {
  name: string;
  summary: string;
  slug: string;
  startingPrice?: number;
}): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: service.name,
  description: service.summary,
  serviceType: service.name,
  areaServed: { "@type": "Country", name: contact.country },
  provider: { "@type": "Organization", name: brand.name, url: seoConfig.siteUrl },
  url: absoluteUrl(`/services/${service.slug}`),
  ...(service.startingPrice !== undefined
    ? {
        offers: {
          "@type": "Offer",
          priceCurrency: legal.currency,
          price: service.startingPrice.toFixed(2),
          url: absoluteUrl(`/services/${service.slug}`),
        },
      }
    : {}),
});

export const branchSchema = (branch: Branch): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: branch.name,
  image: `${seoConfig.siteUrl}${brand.logo}`,
  telephone: branch.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: branch.address,
    addressLocality: branch.city,
    addressCountry: contact.countryCode,
  },
  geo: { "@type": "GeoCoordinates", latitude: branch.coordinates.lat, longitude: branch.coordinates.lng },
  openingHours: branch.hours,
  url: absoluteUrl("/stores"),
});

export const offersSchema = (items: Offer[]): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "عروض رواء",
  itemListElement: items.map((offer, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: offer.title,
    url: absoluteUrl(offer.href ?? "/offers"),
  })),
});

export const faqItemsToSchema = (items: FaqItem[]) =>
  faqSchema(items.map((item) => ({ question: item.question, answer: item.answer })));
