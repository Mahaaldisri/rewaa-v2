/**
 * Derived filter model for the catalogue.
 *
 * The catalogue stores factual attributes (system type, stages, flow rate,
 * capacity, tank/pump, warranty, replacement interval). Some shopper questions —
 * “مناسب لكم شخص؟”, “تركيب تحت المغسلة؟”, “هل يحتاج فني؟” — are not stored
 * verbatim, so they are *derived* here with explicit, documented rules instead of
 * being invented per component.
 *
 * Every rule below is a threshold or a category mapping, never a quality claim.
 * When a product does not declare the attribute a rule needs, the product is
 * excluded from that filter (never guessed in).
 */
import type { ProductSummary } from "@/types/catalog";

/* ------------------------------ Use case ------------------------------ */

export const USE_CASE_OPTIONS = [
  { id: "home", label: "منزل", hint: "استخدام منزلي عام" },
  { id: "apartment", label: "شقة", hint: "مساحة محدودة وتحت المغسلة" },
  { id: "villa", label: "فيلا أو دور مستقل", hint: "نقاط استخدام متعددة" },
  { id: "office", label: "مكتب", hint: "مياه شرب للموظفين" },
  { id: "restaurant", label: "مطعم", hint: "استهلاك تشغيلي مستمر" },
  { id: "cafe", label: "مقهى", hint: "استهلاك تشغيلي مستمر" },
  { id: "commercial", label: "استخدام تجاري", hint: "منشآت ومصانع" },
] as const;

export type UseCaseId = (typeof USE_CASE_OPTIONS)[number]["id"];

/** True when the product is classified for commercial operation in the data. */
function isCommercial(summary: ProductSummary): boolean {
  const usage = summary.attributes?.usage;
  return usage === "commercial" || usage === "both";
}

/** True when the product is classified for home use (or for both). */
function isHome(summary: ProductSummary): boolean {
  const usage = summary.attributes?.usage;
  return usage === undefined || usage === "home" || usage === "both";
}

export function matchUseCase(summary: ProductSummary, value: string): boolean {
  const attrs = summary.attributes ?? {};
  const type = typeof attrs.systemType === "string" ? attrs.systemType : "";
  const sub = summary.subcategorySlug;
  const flow = typeof attrs.flowRateGpd === "number" ? attrs.flowRateGpd : 0;
  const capacity = typeof attrs.capacityLiters === "number" ? attrs.capacityLiters : 0;

  switch (value) {
    case "home":
      return isHome(summary);
    case "apartment":
      // Compact installations: under-sink/countertop units or a clearly small flow.
      return sub === "under-sink" || sub === "countertop" || (flow > 0 && flow <= 100);
    case "villa":
      // Multi-point installations: central units or a flow rate that serves them.
      return type === "whole-house" || sub === "central-filters" || flow >= 150 || capacity > 20;
    case "office":
      return isHome(summary) && (capacity >= 10 || flow >= 75);
    case "restaurant":
    case "cafe":
    case "commercial":
      return isCommercial(summary);
    default:
      return true;
  }
}

/* ------------------------------- Users -------------------------------- */

export const USERS_OPTIONS = [
  { id: "1", label: "فرد واحد" },
  { id: "2-3", label: "2 – 3 أشخاص" },
  { id: "4-6", label: "4 – 6 أشخاص" },
  { id: "7-plus", label: "7 أشخاص وأكثر" },
] as const;

export type UsersId = (typeof USERS_OPTIONS)[number]["id"];

/**
 * Household size is mapped onto the flow rate / tank capacity published for the
 * product — the only capacity signals the catalogue carries. The mapping is
 * approximate by nature and the UI labels the group accordingly.
 */
export function matchUsers(summary: ProductSummary, value: string): boolean {
  const attrs = summary.attributes ?? {};
  const flow = typeof attrs.flowRateGpd === "number" ? attrs.flowRateGpd : 0;
  const capacity = typeof attrs.capacityLiters === "number" ? attrs.capacityLiters : 0;
  if (flow === 0 && capacity === 0) return false;

  switch (value) {
    case "1":
      return (flow > 0 && flow <= 75) || (flow === 0 && capacity <= 8);
    case "2-3":
      return (flow > 75 && flow <= 150) || (flow === 0 && capacity > 8 && capacity <= 12);
    case "4-6":
      return (flow > 150 && flow <= 300) || (flow === 0 && capacity > 12 && capacity <= 20);
    case "7-plus":
      return flow > 300 || capacity > 20 || isCommercial(summary);
    default:
      return true;
  }
}

/* --------------------------- Installation ----------------------------- */

export const INSTALLATION_TYPE_OPTIONS = [
  { id: "under-sink", label: "تحت المغسلة" },
  { id: "countertop", label: "على الطاولة" },
  { id: "central", label: "تركيب مركزي" },
  { id: "standalone", label: "جهاز مستقل" },
] as const;

export type InstallationTypeId = (typeof INSTALLATION_TYPE_OPTIONS)[number]["id"];

export function matchInstallationType(summary: ProductSummary, value: string): boolean {
  const type = summary.attributes?.systemType ?? "";
  const sub = summary.subcategorySlug;
  switch (value) {
    case "under-sink":
      return sub === "under-sink";
    case "countertop":
      return sub === "countertop";
    case "central":
      return sub === "central-filters" || type === "whole-house";
    case "standalone":
      return ["dispenser", "tank", "pump", "testing", "softener"].includes(String(type));
    default:
      return true;
  }
}

/* ---------------------------- Feature flags --------------------------- */

/** UV stages exist in the data only when a product declares `hasUv`. */
export function hasUv(summary: ProductSummary): boolean {
  return summary.attributes?.hasUv === true;
}

export function hasRo(summary: ProductSummary): boolean {
  return summary.attributes?.systemType === "ro";
}

/* ------------------------------ Offers -------------------------------- */

export function isDiscounted(summary: ProductSummary): boolean {
  return typeof summary.compareAtPrice === "number" && summary.compareAtPrice > summary.price;
}

/** Absolute saving in riyals for the “most saving” sort. */
export function savingsAmount(summary: ProductSummary): number {
  if (!isDiscounted(summary)) return 0;
  return (summary.compareAtPrice as number) - summary.price;
}

/** Labels used by chips and the mobile sheet. */
export function labelForOption(group:
  | "useCase"
  | "users"
  | "installationType"
  | "features"
  | "offers", optionId: string): string {
  switch (group) {
    case "useCase":
      return USE_CASE_OPTIONS.find((option) => option.id === optionId)?.label ?? optionId;
    case "users":
      return USERS_OPTIONS.find((option) => option.id === optionId)?.label ?? optionId;
    case "installationType":
      return INSTALLATION_TYPE_OPTIONS.find((option) => option.id === optionId)?.label ?? optionId;
    case "features":
      return optionId === "ro" ? "تناضح عكسي (RO)" : optionId === "uv" ? "أشعة فوق بنفسجية (UV)" : optionId;
    case "offers":
      return "عليه خصم";
    default:
      return optionId;
  }
}
