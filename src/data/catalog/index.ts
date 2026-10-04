import type { Product, RelatedProduct } from "@/types/product";
import type { ProductAttributes, ProductSummary } from "@/types/catalog";
import { buildProduct, toSummary, type ProductSeed } from "./buildProduct";
import { waterFilterSeeds } from "./productsWater";
import { sparesSeeds, upcomingSeeds } from "./productsSpares";
import { nextBatchSeeds, systemSeeds } from "./productsSystems";
import { brandNames } from "./brands";

/**
 * The assembled catalog. Everything downstream (services, pages, search,
 * compare, wishlist) reads from here through `catalogApi` — never from the
 * seed files directly.
 */
const allSeeds: ProductSeed[] = [
  ...waterFilterSeeds,
  ...sparesSeeds,
  ...systemSeeds,
  ...upcomingSeeds,
  ...nextBatchSeeds,
];

export interface CatalogEntry {
  product: Product;
  summary: ProductSummary;
}

export const catalogEntries: CatalogEntry[] = allSeeds.map((seed) => {
  const product = buildProduct(seed);
  return { product, summary: toSummary(product, seed.attributes as ProductAttributes) };
});

export const products: Product[] = catalogEntries.map((entry) => entry.product);
export const productSummaries: ProductSummary[] = catalogEntries.map((entry) => entry.summary);

const productMap = new Map(catalogEntries.map((entry) => [entry.product.slug, entry]));
const summaryMap = new Map(catalogEntries.map((entry) => [entry.summary.slug, entry.summary]));
const entryByIdMap = new Map(catalogEntries.map((entry) => [entry.product.id, entry]));

export function productBySlug(slug: string): Product | undefined {
  return productMap.get(slug)?.product;
}

export function catalogEntryBySlug(slug: string): CatalogEntry | undefined {
  return productMap.get(slug);
}

export function summaryBySlug(slug: string): ProductSummary | undefined {
  return summaryMap.get(slug);
}

/** Resolves a product by its internal id (used by cart/orders/review endpoints). */
export function catalogEntryById(productId: string): CatalogEntry | undefined {
  return entryByIdMap.get(productId);
}

/** Number of published products per category slug (parent categories include children). */
export const categoryProductCounts: Record<string, number> = (() => {
  const counts: Record<string, number> = {};
  catalogEntries.forEach(({ summary }) => {
    counts[summary.categorySlug] = (counts[summary.categorySlug] ?? 0) + 1;
    counts[summary.subcategorySlug] = (counts[summary.subcategorySlug] ?? 0) + 1;
  });
  return counts;
})();

export const brandProductCounts: Record<string, number> = (() => {
  const counts: Record<string, number> = {};
  catalogEntries.forEach(({ summary }) => {
    counts[summary.brandSlug] = (counts[summary.brandSlug] ?? 0) + 1;
  });
  return counts;
})();

export const topBrandNames = brandNames;

interface RelatedOptions {
  limit?: number;
  /** Prefer products from the same brand. */
  preferBrand?: boolean;
  exclude?: string[];
}

/**
 * Related-products engine. Groups are derived from the catalog instead of a
 * hand-written list, so every product page gets coherent recommendations.
 */
export function relatedProducts(
  slug: string,
  group: RelatedProduct["group"],
  options: RelatedOptions = {}
): RelatedProduct[] {
  const { limit = 8, preferBrand = true, exclude = [] } = options;
  const source = catalogEntries.find((entry) => entry.product.slug === slug);
  if (!source) return [];
  const { summary } = source;
  const skip = new Set([slug, ...exclude]);

  const scored = catalogEntries
    .filter((entry) => !skip.has(entry.summary.slug))
    .map((entry) => {
      const other = entry.summary;
      let score = 0;
      if (other.subcategorySlug === summary.subcategorySlug) score += 5;
      if (other.categorySlug === summary.categorySlug) score += 3;
      if (other.brandSlug === summary.brandSlug && preferBrand) score += 2;
      if (group === "bought_together") {
        // Cross-sell: consumables & accessories that complete the system.
        if (other.categorySlug === "cartridges" || other.subcategorySlug === "accessories") score += 4;
        if (other.categorySlug === "testing") score += 2;
        if (other.price < summary.price) score += 1;
      }
      if (group === "similar") {
        if (other.attributes.stages === summary.attributes.stages) score += 2;
        if (other.attributes.systemType === summary.attributes.systemType) score += 2;
      }
      if (group === "recently_viewed") {
        score += other.rating;
        if (other.categorySlug === summary.categorySlug) score += 4;
      }
      score += other.rating / 5;
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry }) => ({
    id: entry.summary.id,
    name: entry.summary.name,
    brand: entry.summary.brand,
    slug: entry.summary.slug,
    price: entry.summary.price,
    compareAtPrice: entry.summary.compareAtPrice,
    rating: entry.summary.rating,
    reviewCount: entry.summary.reviewCount,
    image: entry.summary.image ?? "",
    badge: entry.summary.badge,
    inStock: entry.summary.inStock,
    group,
  }));
}

/** Trending list used by the homepage, offers page and empty states. */
export function bestSellers(limit = 8): ProductSummary[] {
  return [...productSummaries]
    .filter((summary) => summary.inStock)
    .sort((a, b) => b.rating * Math.log10(b.reviewCount + 10) - a.rating * Math.log10(a.reviewCount + 10))
    .slice(0, limit);
}

export function newArrivals(limit = 8): ProductSummary[] {
  return [...productSummaries]
    .sort((a, b) => new Date(b.releasedAt ?? 0).getTime() - new Date(a.releasedAt ?? 0).getTime())
    .slice(0, limit);
}

export function discountedProducts(limit = 12): ProductSummary[] {
  return [...productSummaries]
    .filter((summary) => summary.compareAtPrice && summary.compareAtPrice > summary.price)
    .sort(
      (a, b) =>
        (b.compareAtPrice! - b.price) / b.compareAtPrice! - (a.compareAtPrice! - a.price) / a.compareAtPrice!
    )
    .slice(0, limit);
}
