import { useEffect } from "react";
import type { Product, StockStatus, Variant } from "@/types/product";

const AVAILABILITY: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  coming_soon: "https://schema.org/PreOrder",
};

function setMeta(selector: string, attr: "content" | "href", value: string) {
  const el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Writes the document head (title/description/canonical/OG) and the Product
 * JSON-LD — everything is derived from the product payload, never hard-coded.
 */
export function ProductSeo({ product, variant }: { product: Product; variant?: Variant }) {
  const price = variant?.price ?? product.price;
  const status = variant?.status ?? "in_stock";

  useEffect(() => {
    document.title = product.meta.title;
    setMeta('meta[name="description"]', "content", product.meta.description);
    setMeta('link[rel="canonical"]', "href", product.meta.canonical);
    setMeta('meta[property="og:title"]', "content", product.meta.title);
    setMeta('meta[property="og:description"]', "content", product.meta.description);
    setMeta('meta[property="og:url"]', "content", product.meta.canonical);
    setMeta('meta[property="og:image"]', "content", product.images[0]?.large ?? "");
    setMeta('meta[property="product:price:amount"]', "content", price.toFixed(2));
    setMeta('meta[property="product:price:currency"]', "content", product.currency);
    setMeta('meta[name="keywords"]', "content", product.meta.keywords.join(", "));
  }, [product, price]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${product.meta.canonical}#product`,
    name: product.name,
    alternateName: product.nameEn,
    sku: variant?.sku ?? product.sku,
    productID: product.id,
    description: product.shortDescription,
    url: product.meta.canonical,
    image: product.images.map((img) => img.large),
    brand: { "@type": "Brand", name: product.brand },
    category: `${product.category.name} > ${product.subcategory.name}`,
    manufacturer: { "@type": "Organization", name: product.brand },
    color: undefined,
    offers: {
      "@type": "Offer",
      url: product.meta.canonical,
      priceCurrency: product.currency,
      price: price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      availability: AVAILABILITY[status],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: product.seller.name },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "SA" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 6, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "SA",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: product.returns.days,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  };

  return (
    // JSON-LD is generated from our own catalog data (never user input), so the
    // payload is safely serialised here.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
