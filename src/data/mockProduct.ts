/**
 * Backwards-compatible entry point for the catalog.
 *
 * The storefront used to ship a single hand-written product. The catalog now
 * lives in `src/data/catalog/*` and this module simply exposes the flagship
 * RO-7 (plus its reviews, Q&A and related rails) for the modules that still
 * reference the original names.
 */
import { productBySlug, relatedProducts } from "./catalog";
import { flagshipQuestions, flagshipReviews } from "./reviews";
import type { RelatedProduct } from "@/types/product";

export const FLAGSHIP_SLUG = "water-filters/rewaa-pro-ro7";

export const mockProduct = productBySlug(FLAGSHIP_SLUG)!;

export const mockReviews = flagshipReviews;
export const mockQuestions = flagshipQuestions;

/** Similar / bought-together / recently-viewed rails for the flagship product. */
export const mockRelated: RelatedProduct[] = [
  ...relatedProducts(FLAGSHIP_SLUG, "similar", { limit: 6 }),
  ...relatedProducts(FLAGSHIP_SLUG, "bought_together", { limit: 4 }),
  ...relatedProducts(FLAGSHIP_SLUG, "recently_viewed", { limit: 4 }),
];
