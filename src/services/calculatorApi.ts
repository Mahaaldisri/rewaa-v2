import { readJSON, writeJSON } from "@/lib/localStore";
import { catalogEntries, productBySlug, summaryBySlug } from "@/data/catalog";
import { serviceAreas, legal } from "@/config/site";
import { partsForDeviceSlug } from "@/lib/compatibility";
import type { ProductSummary } from "@/types/catalog";
import type { OwnershipInput } from "@/types/calculator";

/**
 * Calculator data access.
 *
 * Everything the calculator knows about a product comes from the catalogue:
 * device price, installation inclusion, replacement interval, and the price of
 * the matching cartridge set. When the catalogue does not publish a value the
 * service reports it as `undefined` (and the UI asks the shopper) — it never
 * invents a cost.
 */

function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SAVED_KEY = "rewaa_saved_calculations";

export interface CalculatorProduct {
  summary: ProductSummary;
  /** Costs taken from the catalogue. */
  devicePrice: number;
  installationCost?: number;
  installationIncluded: boolean;
  /** Cheapest compatible cartridge set, when the catalogue declares one. */
  replacementKit?: { slug: string; name: string; price: number };
  replacementIntervalMonths?: number;
  warrantyMonths?: number;
  /** Notes about what could not be derived from the data. */
  missingData: string[];
  /** Short, non-committal reason this product may suit the shopper. */
  reason: string;
}

export interface SavedCalculation {
  id: string;
  createdAt: string;
  label: string;
  months: number;
  savings: number;
  productSlug?: string;
  /** Only the numbers the shopper entered — never personal data. */
  shareParams: Record<string, string>;
}

/** Products that can be owned and maintained (systems, not accessories). */
function deviceCandidates(): ProductSummary[] {
  const DEVICE_CATEGORIES = ["water-filters", "whole-house", "desalination", "pumps-equipment"];
  return catalogEntries
    .filter((entry) => DEVICE_CATEGORIES.includes(entry.summary.categorySlug))
    .map((entry) => entry.summary);
}

function reasonFor(summary: ProductSummary): string {
  const attributes = summary.attributes ?? {};
  const bits: string[] = [];
  const flow = typeof attributes.flowRateGpd === "number" ? attributes.flowRateGpd : 0;
  if (attributes.stages) bits.push(`${attributes.stages} مراحل ترشيح`);
  if (flow > 0) bits.push(`${flow} جالون/يوم`);
  if (attributes.hasTank) bits.push("بخزان تخزين");
  if (attributes.hasPump) bits.push("بمضخة تعزيز");
  const detail = bits.length > 0 ? ` (${bits.join(" · ")})` : "";
  return `قد يكون مناسبًا لاحتياجك بناءً على المعلومات التي أدخلتها${detail}.`;
}

export const calculatorApi = {
  /** Every device that can be used in the comparison. */
  async devices(): Promise<ProductSummary[]> {
    await delay(200);
    return deviceCandidates();
  },

  /** Full costing picture for one product, straight from the catalogue. */
  async costModel(slug: string): Promise<CalculatorProduct | undefined> {
    await delay(180);
    const product = productBySlug(slug);
    const summary = summaryBySlug(slug);
    if (!product || !summary) return undefined;

    const attributes = summary.attributes ?? {};
    const missingData: string[] = [];

    const installationIncluded = attributes.installationIncluded === true;
    const installationCost = installationIncluded ? 0 : undefined;
    if (!installationIncluded) missingData.push("تكلفة التركيب (غير مذكورة في بيانات المنتج)");

    const interval = typeof attributes.replacementMonths === "number" ? attributes.replacementMonths : undefined;
    if (!interval) missingData.push("دورة استبدال الشمعات (غير مذكورة في بيانات المنتج)");

    // Cheapest compatible cartridge set — the same data the compatibility engine uses.
    const compatibility = partsForDeviceSlug(slug);
    const sets = (compatibility?.parts ?? [])
      .filter((part) => part.summary.subcategorySlug === "cartridge-sets" || part.summary.categorySlug === "cartridges")
      .map((part) => part.summary)
      .sort((a, b) => a.price - b.price);
    const replacementKit = sets[0];
    if (!replacementKit) missingData.push("سعر طقم الاستبدال (لم تُسجَّل قطعة متوافقة)");

    return {
      summary,
      devicePrice: product.price,
      installationCost,
      installationIncluded,
      replacementKit: replacementKit
        ? { slug: replacementKit.slug, name: replacementKit.name, price: replacementKit.price }
        : undefined,
      replacementIntervalMonths: interval,
      warrantyMonths: typeof attributes.warrantyMonths === "number" ? attributes.warrantyMonths : undefined,
      missingData,
      reason: reasonFor(summary),
    };
  },

  /** Builds the ownership inputs for a product, leaving unknown values at 0. */
  ownershipFrom(cost: CalculatorProduct, defaults: { maintenanceIntervalMonths: number }): OwnershipInput {
    return {
      productSlug: cost.summary.slug,
      productName: cost.summary.name,
      devicePrice: cost.devicePrice,
      installationCost: cost.installationCost ?? 0,
      initialAccessoriesCost: 0,
      replacementKitPrice: cost.replacementKit?.price ?? 0,
      replacementIntervalMonths: cost.replacementIntervalMonths ?? 0,
      maintenancePrice: 0,
      maintenanceIntervalMonths: defaults.maintenanceIntervalMonths,
      extraMonthlyCost: 0,
      manual: false,
    };
  },

  /**
   * Maintenance visit price. The configured figure is an editable business
   * setting shown as an estimate; nothing else is assumed.
   */
  suggestedMaintenancePrice(): { value: number; note: string } {
    return {
      value: serviceAreas.estimatedFees.maintenanceVisit,
      note: "قيمة تقديرية من إعدادات المتجر — عدّلها حسب ما تدفعه فعليًا.",
    };
  },

  /**
   * Recommends up to three systems for the shopper's numbers. Deliberately
   * hedged: it ranks catalogue attributes against consumption, never water
   * quality, and every card says it may suit the entered information.
   */
  async recommendations(input: {
    monthlyLiters: number;
    budget?: number;
  }): Promise<{ summary: ProductSummary; reason: string; estimatedOwnership: number }[]> {
    await delay(260);
    const candidates = deviceCandidates();
    const litersPerDay = input.monthlyLiters / 30;
    const people = Math.max(1, Math.round(litersPerDay / 3));

    const scored = candidates
      .map((summary) => {
        const flow = typeof summary.attributes?.flowRateGpd === "number" ? summary.attributes.flowRateGpd : 0;
        const capacity = typeof summary.attributes?.capacityLiters === "number" ? summary.attributes.capacityLiters : 0;
        let score = 0;
        if (flow > 0 && litersPerDay > 0) {
          const coverage = flow / Math.max(10, litersPerDay * 4);
          score += coverage >= 1 ? 6 : coverage >= 0.5 ? 4 : 1;
        }
        if (capacity > 0 && people >= 4 && capacity >= 10) score += 3;
        if (people >= 6 && flow >= 300) score += 3;
        if (summary.stockStatus !== "out_of_stock") score += 2;
        if (summary.reviewCount > 20) score += 1;
        if (input.budget && input.budget > 0) {
          score += summary.price <= input.budget ? 3 : summary.price <= input.budget * 1.2 ? 1 : -4;
        }
        return { summary, score };
      })
      .filter((entry) => entry.score > 2)
      .sort((a, b) => b.score - a.score || a.summary.price - b.summary.price)
      .slice(0, 3);

    return scored.map((entry) => ({
      summary: entry.summary,
      reason: reasonFor(entry.summary),
      estimatedOwnership: entry.summary.price,
    }));
  },

  /** Cities served, used by the coverage note (configuration, not invented). */
  servedCity(city: string): boolean {
    return serviceAreas.cities.some((entry) => entry.trim() === city.trim());
  },

  /* ----------------------------- Persistence ----------------------------- */

  async listSaved(): Promise<SavedCalculation[]> {
    await delay(160);
    return readJSON<SavedCalculation[]>(SAVED_KEY, []);
  },

  async save(entry: Omit<SavedCalculation, "id" | "createdAt">): Promise<SavedCalculation> {
    await delay(180);
    const record: SavedCalculation = {
      ...entry,
      id: `calc_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const existing = readJSON<SavedCalculation[]>(SAVED_KEY, []);
    writeJSON(SAVED_KEY, [record, ...existing].slice(0, 12));
    return record;
  },

  async removeSaved(id: string): Promise<{ id: string }> {
    await delay(140);
    writeJSON(
      SAVED_KEY,
      readJSON<SavedCalculation[]>(SAVED_KEY, []).filter((entry) => entry.id !== id)
    );
    return { id };
  },

  currency(): string {
    return legal.currencyLabel;
  },
};
