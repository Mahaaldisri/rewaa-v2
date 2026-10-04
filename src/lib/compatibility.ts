/**
 * Compatibility engine for cartridges and spare parts.
 *
 * Everything here is derived from the catalog itself — the model codes a part
 * declares in `attributes.compatibleModels`, its SKU, its subcategory and its
 * replacement interval. Nothing is hardcoded in the UI layer, so adding a
 * cartridge to the catalog automatically makes it discoverable here.
 *
 * The engine is pure and synchronous; the async service wrapper lives in
 * `src/services/compatibilityApi.ts` so components never touch data files.
 */
import { catalogEntries, productSummaries } from "@/data/catalog";
import type { ProductAttributes, ProductSummary } from "@/types/catalog";
import type { Product as FullProduct } from "@/types/product";

export interface CompatibilityReason {
  /** Short machine-readable kind, used for tests and analytics. */
  kind: "model_match" | "sku_match" | "name_match" | "type_match" | "interval" | "availability" | "warranty";
  /** Shopper-facing Arabic explanation. */
  label: string;
}

export interface CompatiblePart {
  summary: ProductSummary;
  /** 0–100. Higher means a stronger, more explicit match. */
  confidence: number;
  reasons: CompatibilityReason[];
  /** True when a different but equivalent part can be used instead. */
  alternative: boolean;
}

export interface CompatibilityResult {
  /** Normalised query that produced the result. */
  query: string;
  /** The device the shopper is asking about, when the query names one. */
  device?: { slug: string; name: string; sku: string };
  parts: CompatiblePart[];
  /** Model codes that exist in the catalog and are close to the query. */
  suggestions: string[];
  /** Populated when nothing matched — explains what to try instead. */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

interface PartRecord {
  entry: (typeof catalogEntries)[number];
  product: FullProduct;
  summary: ProductSummary;
  attributes: ProductAttributes;
  models: string[];
  haystack: string;
  isPart: boolean;
  replacementMonths?: number;
}

const PART_CATEGORY_SLUGS = new Set(["cartridges", "accessories", "pumps-equipment"]);
const PART_SUBCATEGORY_HINTS = [
  "cartridge-sets",
  "sediment",
  "carbon",
  "membranes",
  "post-filters",
  "mineral",
  "filters",
  "spares",
];

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function modelCodes(product: FullProduct, attributes: ProductAttributes): string[] {
  const declared = Array.isArray(attributes.compatibleModels) ? attributes.compatibleModels : [];
  const extra = [attributes.model, attributes.modelCode, attributes.deviceModel].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const own = [product.sku, product.nameEn, product.slug.split("/").pop() ?? ""].filter(Boolean);
  return Array.from(new Set([...declared, ...extra, ...own].map((value) => String(value).trim()))).filter(Boolean);
}

const index: PartRecord[] = catalogEntries.map((entry) => {
  const { product, summary } = entry;
  // Attributes are projected onto the summary by the catalog builder.
  const attributes = summary.attributes ?? {};
  const models = modelCodes(product, attributes);
  const replacementMonths =
    typeof attributes.replacementMonths === "number" ? attributes.replacementMonths : undefined;
  const subcategoryHint = PART_SUBCATEGORY_HINTS.some((hint) => summary.subcategorySlug.includes(hint));
  const isPart = PART_CATEGORY_SLUGS.has(summary.categorySlug) || subcategoryHint;

  return {
    entry,
    product,
    summary,
    attributes,
    models,
    isPart,
    replacementMonths,
    haystack: normalise(
      [product.name, product.nameEn, product.sku, summary.categoryName, summary.subcategoryName, ...models].join(" ")
    ),
  };
});

/** Every model code known to the catalog, longest first (so RWA-RO5 beats RO5). */
export const knownModels: string[] = Array.from(new Set(index.flatMap((record) => record.models)))
  .filter((model) => /^[A-Za-z0-9-]{3,}$/.test(model))
  .sort((a, b) => b.length - a.length);

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

const MIN_QUERY = 2;

export function searchCompatibleParts(rawQuery: string, options: { limit?: number } = {}): CompatibilityResult {
  const query = rawQuery.trim();
  const limit = options.limit ?? 8;
  if (query.length < MIN_QUERY) {
    return { query, parts: [], suggestions: knownModels.slice(0, 6), note: "اكتب اسم الجهاز أو رقم الموديل (مثال: RWA-RO5)." };
  }

  const normalisedQuery = normalise(query);
  const queryUpper = query.toUpperCase();
  const ranked: CompatiblePart[] = [];

  for (const record of index) {
    if (!record.isPart) continue;

    const reasons: CompatibilityReason[] = [];
    let confidence = 0;

    /* 1. Explicit model match — the strongest signal, straight from the data. */
    const matchedModels = record.models.filter((model) => {
      const modelUpper = model.toUpperCase();
      return modelUpper === queryUpper || normalise(model).includes(normalisedQuery);
    });
    if (matchedModels.length > 0) {
      confidence += 60;
      reasons.push({
        kind: "model_match",
        label: `موديل مطابق في بيانات القطعة: ${matchedModels.slice(0, 3).join("، ")}`,
      });
    }

    /* 2. SKU match. */
    if (record.product.sku.toUpperCase() === queryUpper) {
      confidence += 70;
      reasons.push({ kind: "sku_match", label: `رقم القطعة (SKU) مطابق: ${record.product.sku}` });
    }

    /* 3. Name match (Arabic or English). */
    if (confidence === 0 && normalise(record.product.name).includes(normalisedQuery)) {
      confidence += 35;
      reasons.push({ kind: "name_match", label: "اسم القطعة يحتوي على ما بحثت عنه." });
    }
    if (confidence === 0 && normalise(record.product.nameEn).includes(normalisedQuery)) {
      confidence += 30;
      reasons.push({ kind: "name_match", label: `اسم القطعة بالإنجليزية: ${record.product.nameEn}` });
    }

    if (confidence === 0) continue;

    /* 4. Context: type, replacement interval, availability, warranty. */
    const type = typeof record.attributes.systemType === "string" ? record.attributes.systemType : undefined;
    if (type) reasons.push({ kind: "type_match", label: `نوع القطعة: ${type}` });
    if (record.replacementMonths) {
      reasons.push({
        kind: "interval",
        label: `يُنصح باستبدالها كل ${record.replacementMonths} شهرًا حسب بيانات المنتج.`,
      });
      confidence += 5;
    }
    if (record.summary.inStock) {
      reasons.push({ kind: "availability", label: "متوفرة للشحن الآن." });
      confidence += 5;
    }
    const warrantyMonths =
      typeof record.attributes.warrantyMonths === "number" ? record.attributes.warrantyMonths : undefined;
    if (warrantyMonths) reasons.push({ kind: "warranty", label: `ضمان معلن: ${warrantyMonths} شهرًا.` });

    ranked.push({ summary: record.summary, confidence: Math.min(100, confidence), reasons, alternative: false });
  }

  ranked.sort((a, b) => b.confidence - a.confidence || a.summary.price - b.summary.price);

  /* Devices that the query names (a system product whose SKU/name matched). */
  const device = index.find(
    (record) =>
      !record.isPart &&
      (record.product.sku.toUpperCase() === queryUpper ||
        record.models.some((model) => model.toUpperCase() === queryUpper) ||
        normalise(record.product.name).includes(normalisedQuery))
  );

  /* When a device is identified, add “compatible alternative” entries: other
     parts that declare the *same* device model but were not the top hit. */
  const parts = ranked.slice(0, limit).map((part, position) => ({
    ...part,
    alternative: position > 0 && part.confidence >= (ranked[0]?.confidence ?? 0) - 15,
  }));

  const suggestions = knownModels
    .filter((model) => normalise(model).includes(normalisedQuery) && model.toUpperCase() !== queryUpper)
    .slice(0, 6);

  return {
    query,
    device: device ? { slug: device.product.slug, name: device.product.name, sku: device.product.sku } : undefined,
    parts: parts.length > 0 ? parts : fallbackParts(query),
    suggestions: suggestions.length > 0 ? suggestions : parts.length === 0 ? knownModels.slice(0, 6) : [],
    note:
      parts.length === 0
        ? "لم نجد تطابقًا صريحًا في بيانات الكتالوج. راجع قائمة الموديلات المتاحة أو أرسل صورة لوحة الجهاز لفريق الدعم."
        : undefined,
  };
}

/** Parts of the same subcategory as a weak fallback — never presented as “compatible”. */
function fallbackParts(query: string): CompatiblePart[] {
  const normalisedQuery = normalise(query);
  const sameFamily = index
    .filter((record) => record.isPart && normalise(record.summary.subcategoryName).includes(normalisedQuery))
    .slice(0, 4)
    .map((record) => ({
      summary: record.summary,
      confidence: 20,
      alternative: true,
      reasons: [
        {
          kind: "type_match" as const,
          label: "من نفس عائلة القطع، لكن التوافق مع جهازك غير مؤكد من بيانات الكتالوج.",
        },
      ],
    }));
  return sameFamily;
}

/* ------------------------------------------------------------------ */
/* Device ↔ parts                                                      */
/* ------------------------------------------------------------------ */

export interface DeviceCompatibility {
  device: ProductSummary;
  parts: CompatiblePart[];
  /** Cartridge set recommendation derived from the device attributes. */
  setNote?: string;
}

/** All parts that declare compatibility with the given device product. */
export function partsForDeviceSlug(slug: string): DeviceCompatibility | undefined {
  const deviceRecord = index.find((record) => record.product.slug === slug && !record.isPart);
  if (!deviceRecord) return undefined;

  const modelSet = new Set([
    deviceRecord.product.sku.toUpperCase(),
    ...deviceRecord.models.map((model) => model.toUpperCase()),
  ]);
  const familySlug = deviceRecord.summary.subcategorySlug;

  const parts = index
    .filter((record) => record.isPart)
    .map<CompatiblePart | null>((record) => {
      const reasons: CompatibilityReason[] = [];
      let confidence = 0;

      const matched = record.models.filter((model) => modelSet.has(model.toUpperCase()));
      if (matched.length > 0) {
        confidence += 60;
        reasons.push({ kind: "model_match", label: `مذكور صراحةً كمتوافق: ${matched.join("، ")}` });
      }

      const deviceTokens = normalise(`${deviceRecord.product.name} ${familySlug}`).split(" ");
      const sharesFamily = deviceTokens.some((token) => token.length > 3 && record.haystack.includes(token));
      if (sharesFamily) {
        confidence += 20;
        reasons.push({ kind: "type_match", label: "من نفس عائلة الجهاز حسب الفئة في الكتالوج." });
      }

      if (confidence === 0) return null;

      if (record.replacementMonths) {
        reasons.push({ kind: "interval", label: `دورة استبدال معلنة: كل ${record.replacementMonths} شهرًا.` });
      }
      if (record.summary.inStock) reasons.push({ kind: "availability", label: "متوفرة للشحن الآن." });

      return { summary: record.summary, confidence: Math.min(100, confidence), reasons, alternative: false };
    })
    .filter((part): part is CompatiblePart => part !== null)
    .sort((a, b) => b.confidence - a.confidence);

  const withAlternatives = parts.map((part, position) => ({
    ...part,
    alternative: position > 0 && part.confidence >= (parts[0]?.confidence ?? 0) - 20,
  }));

  const stages = deviceRecord.attributes.stages;
  const setRecord = index.find(
    (record) =>
      record.isPart &&
      record.summary.subcategorySlug === "cartridge-sets" &&
      record.models.some((model) => modelSet.has(model.toUpperCase()))
  );

  return {
    device: deviceRecord.summary,
    parts: withAlternatives,
    setNote:
      setRecord && typeof stages === "number"
        ? `للجهاز ${stages} مراحل، والطقم الأنسب حسب بيانات الكتالوج: ${setRecord.summary.name}.`
        : undefined,
  };
}

/** Convenience for product pages: “القطع المتوافقة” for the current product. */
export function compatibilityForProduct(product: FullProduct | null | undefined): DeviceCompatibility | undefined {
  if (!product) return undefined;
  return partsForDeviceSlug(product.slug) ?? undefined;
}

/** Summary used by the maintenance center and product pages. */
export function replacementIntervalFor(slug: string): number | undefined {
  return index.find((record) => record.product.slug === slug)?.replacementMonths;
}

/** Public catalogue view of all spare parts (used by the checker’s empty state). */
export function sparePartSummaries(): ProductSummary[] {
  return productSummaries.filter((summary) => PART_CATEGORY_SLUGS.has(summary.categorySlug));
}
