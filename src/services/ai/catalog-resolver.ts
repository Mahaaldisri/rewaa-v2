/**
 * جسر بين كتل المساعد والكتالوج الحقيقي.
 *
 * الواجهة تتحقق من كل كتلة قبل عرضها: معرّف منتج غير موجود ⇒ لا بطاقة.
 * رابط صورة غير مسجّل في وسائط المنتج ⇒ لا صورة.
 *
 * لا يقرأ أي مكوّن بيانات الكتالوج مباشرة؛ هذا الملف هو نقطة الوصول الوحيدة
 * لطبقة المساعد، ومستقبلًا يمكن استبداله بنداء `/v1/catalog/media`.
 */
import { catalogEntries, productBySlug, summaryBySlug } from "@/data/catalog";
import type { ProductSummary } from "@/types/catalog";
import type { Product as FullProduct, ProductImage } from "@/types/product";
import type { AiBlockResolver } from "@/lib/ai/blocks";

/** صور محلية مسموح بها في المحادثة (لا تُقبل أي روابط أخرى من النموذج). */
const LOCAL_IMAGES = new Set(["/images/hero-kitchen.jpg", "/images/hero-technician.jpg"]);

let idIndex: Map<string, string> | null = null;

/** فهرس معرّفات المنتجات (يُبنى مرة واحدة). */
function ensureIdIndex(): Map<string, string> {
  if (!idIndex) {
    idIndex = new Map();
    catalogEntries.forEach((entry) => {
      idIndex!.set(entry.summary.id, entry.summary.id);
      idIndex!.set(entry.summary.slug, entry.summary.id);
    });
  }
  return idIndex;
}

/** يحوّل معرّفًا أو slug إلى معرّف منتج حقيقي. */
export function resolveProductId(value: string): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const index = ensureIdIndex();
  return index.get(value.trim()) ?? index.get(value.trim().toLowerCase());
}

export function resolveSummary(value: string): ProductSummary | undefined {
  const id = resolveProductId(value);
  if (!id) return undefined;
  const entry = catalogEntries.find((item) => item.summary.id === id);
  return entry?.summary;
}

export function resolveProduct(value: string): FullProduct | undefined {
  const summary = resolveSummary(value);
  return summary ? productBySlug(summary.slug) : undefined;
}

/** كل روابط الصور المسجّلة لمنتج (بكل المقاسات). */
export function productImageUrls(productId?: string): Set<string> {
  const urls = new Set<string>();
  if (!productId) return urls;
  const product = resolveProduct(productId);
  product?.images.forEach((image: ProductImage) => {
    urls.add(image.thumb);
    urls.add(image.medium);
    urls.add(image.large);
    urls.add(image.zoom);
  });
  return urls;
}

export const catalogResolver: AiBlockResolver = {
  hasProduct(productId: string): boolean {
    return resolveProductId(productId) !== undefined;
  },
  productIdFromSlug(slug: string): string | undefined {
    const summary = summaryBySlug(slug);
    return summary?.id;
  },
  allowedImageUrl(url: string, productId?: string): boolean {
    if (typeof url !== "string" || url.length === 0) return false;
    if (LOCAL_IMAGES.has(url)) return true;
    if (productId) return productImageUrls(productId).has(url);
    // بلا منتج: يُسمح فقط بصور المتجر المحلية المعروفة.
    return LOCAL_IMAGES.has(url);
  },
};

/** للاختبارات: بعد تغيير الكتالوج في بيئة الاختبار. */
export function resetCatalogResolver(): void {
  idIndex = null;
}
