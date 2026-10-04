import type { CategoryNode, ProductAttributes, ProductSummary } from "@/types/catalog";
import type { RelatedProduct } from "@/types/product";

/* ------------------------------------------------------------------ */
/* Summary → card shape                                                */
/* ------------------------------------------------------------------ */

/** Maps a catalogue summary onto the lighter card/rail shape used by `ProductCard`. */
export function summaryToRelated(
  product: ProductSummary,
  group: RelatedProduct["group"] = "similar"
): RelatedProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    rating: product.rating,
    reviewCount: product.reviewCount,
    image: product.image,
    badge: product.badge,
    inStock: product.inStock,
    group,
  };
}

export function summariesToRelated(
  products: ProductSummary[],
  group: RelatedProduct["group"] = "similar"
): RelatedProduct[] {
  return products.map((product) => summaryToRelated(product, group));
}

/* ------------------------------------------------------------------ */
/* Compare-table attribute presentation                                */
/* ------------------------------------------------------------------ */

/** Arabic labels for the attributes shown in the compare table and spec lists. */
export const attributeLabels: Record<string, string> = {
  stages: "عدد المراحل",
  systemType: "نوع النظام",
  capacityLiters: "سعة الخزان",
  flowRateGpd: "معدل الإنتاج",
  replacementMonths: "دورة استبدال الشمعات",
  hasPump: "مضخة تعزيز",
  hasTank: "خزان تخزين",
  usage: "الاستخدام",
  installationIncluded: "يشمل التركيب",
  warrantyMonths: "الضمان",
  voltage: "الجهد",
  dimensions: "الأبعاد",
  weightKg: "الوزن",
  compatibleModels: "الموديلات المتوافقة",
};

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  ro: "تناضح عكسي",
  "direct-flow": "تدفق مباشر",
  under_sink: "تحت المغسلة",
  countertop: "على الطاولة",
  cartridge: "شمعات وقطع",
  softener: "منقّي عسر",
  "whole-house": "فلترة مركزية",
  central: "فلترة مركزية",
  desalination: "تحلية",
  pump: "مضخة",
  tank: "خزان",
  meter: "جهاز قياس",
  kit: "طقم فحص",
  dispenser: "موزّع مياه",
  accessory: "ملحق",
};

const USAGE_LABELS: Record<string, string> = {
  home: "منزلي",
  commercial: "تجاري",
  both: "منزلي وتجاري",
};

const bucketLabels: Record<string, string> = {
  small: "أقل من 10 لتر",
  medium: "10 – 20 لتر",
  large: "أكثر من 20 لتر",
  low: "حتى 100 جالون/يوم",
  mid: "100 – 400 جالون/يوم",
  high: "أكثر من 400 جالون/يوم",
};

/** Renders one raw attribute value for display (numbers, booleans, lists). */
export function formatAttribute(key: string, value: ProductAttributes[string] | unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.length > 0 ? value.join("، ") : undefined;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") {
    if (key === "capacityLiters") return `${value} لتر`;
    if (key === "flowRateGpd") return `${value} جالون/يوم`;
    if (key === "replacementMonths") return `كل ${value} أشهر`;
    if (key === "warrantyMonths") return `${value} شهرًا`;
    if (key === "weightKg") return `${value} كجم`;
    return String(value);
  }
  const text = String(value);
  if (key === "usage") return USAGE_LABELS[text] ?? text;
  if (key === "systemType") return SYSTEM_TYPE_LABELS[text] ?? text;
  return bucketLabels[text] ?? text;
}

/** Long-form attribute list used inside product spec tabs. */
export function attributeEntries(attributes: ProductAttributes): { key: string; label: string; value: string }[] {
  return Object.keys(attributeLabels)
    .filter((key) => attributes[key] !== undefined)
    .map((key) => ({
      key,
      label: attributeLabels[key],
      value: formatAttribute(key, attributes[key]) ?? "—",
    }));
}

/* ------------------------------------------------------------------ */
/* Paths & breadcrumbs                                                 */
/* ------------------------------------------------------------------ */

/** `/c/<category>` or `/c/<category>/<subcategory>`. */
export function categoryPath(categorySlug: string, subcategorySlug?: string): string {
  return subcategorySlug ? `/c/${categorySlug}/${subcategorySlug}` : `/c/${categorySlug}`;
}

/** Breadcrumb trail for a listing page (root → optional subcategory). */
export function listingBreadcrumbs(
  category: Pick<CategoryNode, "slug" | "name">,
  subcategory?: Pick<CategoryNode, "slug" | "name">
): { label: string; href: string }[] {
  const trail = [{ label: "الرئيسية", href: "/" }];
  trail.push({ label: category.name, href: categoryPath(category.slug) });
  if (subcategory) trail.push({ label: subcategory.name, href: categoryPath(category.slug, subcategory.slug) });
  return trail;
}
