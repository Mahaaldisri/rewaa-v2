/** Shared types for the water-savings calculator. */

export type CalculatorMode = "estimate" | "purchases";

export interface BottlePreset {
  id: string;
  label: string;
  /** Litres in one purchased unit. */
  unitLiters: number;
  /** Editable default price; the shopper overrides it with their own numbers. */
  defaultUnitPrice: number;
  unitLabel: string;
  note?: string;
}

/** How the household currently buys drinking water (mode B). */
export interface PurchaseInput {
  presetId: string;
  /** Litres per purchased unit (editable for the custom preset). */
  unitLiters: number;
  /** Riyals per purchased unit. */
  unitPrice: number;
  /** Units bought per period. */
  unitsPerPeriod: number;
  frequency: "weekly" | "monthly";
}

/** Estimated drinking-water intake (mode A). */
export interface EstimateInput {
  people: number;
  litersPerPersonPerDay: number;
  /** Optional: fixed monthly cost of anything else currently paid for water. */
  extraMonthlyCost: number;
}

/** Ownership costs of a filtration system. */
export interface OwnershipInput {
  /** Catalogue slug when a real product was chosen. */
  productSlug?: string;
  productName?: string;
  /** Purchase + one-off costs, in riyals. */
  devicePrice: number;
  installationCost: number;
  initialAccessoriesCost: number;
  /** Recurring costs. */
  replacementKitPrice: number;
  replacementIntervalMonths: number;
  /** Maintenance visit price applied every `maintenanceIntervalMonths`. */
  maintenancePrice: number;
  maintenanceIntervalMonths: number;
  /** Anything else paid per month (electricity, extra filters…), 0 when unknown. */
  extraMonthlyCost: number;
  /** True when the shopper entered the values by hand instead of picking a product. */
  manual: boolean;
}

export interface CalculatorInput {
  mode: CalculatorMode;
  estimate: EstimateInput;
  purchases: PurchaseInput;
  ownership: OwnershipInput;
  /** Comparison horizon in months. */
  months: number;
  /** Yearly price increase applied to purchased water, as a percentage. */
  waterPriceGrowthPercent: number;
}

export interface MonthlyPoint {
  month: number;
  /** Cumulative spend on purchased water up to and including this month. */
  bottledCumulative: number;
  /** Cumulative cost of buying and running the filter. */
  filterCumulative: number;
  /** Cost incurred in this specific month (used by the timeline view). */
  bottledMonth: number;
  filterMonth: number;
  /** Which filter costs fell due in this month. */
  events: FilterEvent[];
}

export interface FilterEvent {
  kind: "device" | "replacement" | "maintenance" | "extra";
  label: string;
  amount: number;
}

export interface CalculatorResult {
  /** Litres consumed per month (same for both sides of the comparison). */
  monthlyLiters: number;
  /** What the household spends on water per month today. */
  monthlyBottledCost: number;
  /** Filter costs split for transparency. */
  initialCost: number;
  recurringCost: number;
  /** Totals across the chosen horizon. */
  months: number;
  bottledTotal: number;
  filterTotal: number;
  savings: number;
  monthlyAverageSaving: number;
  annualSaving: number;
  /** Unit economics. */
  bottledCostPerLiter: number;
  filterCostPerLiter: number;
  costPerLiterDropPercent: number;
  /** First month where cumulative filter cost is at or below bottled water. */
  breakEvenMonth: number | null;
  timeline: MonthlyPoint[];
  /** Assumptions surfaced to the shopper. */
  assumptions: { label: string; value: string; editable: boolean }[];
  /** Facts the calculator could not obtain and therefore did not invent. */
  missingData: string[];
}
