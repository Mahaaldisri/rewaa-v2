import type { ProductSummary } from "@/types/catalog";
import type { Product } from "@/types/product";
import type { AnalyticsItem } from "./types";

/** Shared mappers so every page reports identical, well-formed items. */

export function itemFromSummary(product: ProductSummary, index?: number): AnalyticsItem {
  return {
    item_id: product.sku || product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.categoryName,
    item_category2: product.subcategoryName,
    price: product.price,
    quantity: 1,
    ...(index === undefined ? {} : { index }),
  };
}

export function itemsFromSummaries(products: ProductSummary[]): AnalyticsItem[] {
  return products.map((product, index) => itemFromSummary(product, index + 1));
}

export function itemFromProduct(product: Product, variantSku: string, price: number, variantLabel: string): AnalyticsItem {
  return {
    item_id: variantSku,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category.name,
    item_category2: product.subcategory.name,
    item_variant: variantLabel,
    price,
    quantity: 1,
  };
}

export function itemFromCartLine(line: {
  variantId: string;
  sku: string;
  name: string;
  selectionLabel: string;
  unitPrice: number;
  quantity: number;
}): AnalyticsItem {
  return {
    item_id: line.sku || line.variantId,
    item_name: line.name,
    item_variant: line.selectionLabel,
    price: line.unitPrice,
    quantity: line.quantity,
  };
}
