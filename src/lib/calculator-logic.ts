/**
 * Water-savings calculator — pure calculation logic.
 *
 * Rules this module follows (they matter for what the UI is allowed to claim):
 *  1. No invented inputs. Every missing value arrives as 0 and is reported back
 *     through `missingData` instead of being guessed.
 *  2. The break-even month is computed from a real month-by-month timeline: the
 *     device is paid in month 1, replacement kits fall due on the product's own
 *     interval, maintenance visits on their own interval.
 *  3. Nothing here is health, quality or performance advice — it is arithmetic
 *     on the shopper's numbers and the catalogue prices.
 */
import type {
  CalculatorInput,
  CalculatorResult,
  FilterEvent,
  MonthlyPoint,
} from "@/types/calculator";
import type { BottlePreset } from "@/types/calculator";

export const DEFAULT_LITERS_PER_PERSON = 3;
export const DEFAULT_MONTHS = 60;

/* ------------------------------------------------------------------ */
/* Bottled water side                                                  */
/* ------------------------------------------------------------------ */

/** Litres the household buys per month. */
export function monthlyLiters(input: CalculatorInput): number {
  if (input.mode === "estimate") {
    const { people, litersPerPersonPerDay } = input.estimate;
    return Math.max(0, people) * Math.max(0, litersPerPersonPerDay) * 30;
  }
  const { unitLiters, unitsPerPeriod, frequency } = input.purchases;
  const perMonth = frequency === "weekly" ? unitsPerPeriod * 4.345 : unitsPerPeriod;
  return Math.max(0, unitLiters) * Math.max(0, perMonth);
}

/**
 * Riyals the household spends on water per month today, before any price growth.
 *
 * - Purchases mode: units bought × unit price.
 * - Estimate mode: the estimated litres priced at the shopper's own unit price
 *   (the bottle preset they picked), plus anything else they pay for water.
 *   When no priced preset is available the estimate is left at the extra cost —
 *   the calculator does not invent a price per litre.
 */
export function monthlyBottledCost(input: CalculatorInput): number {
  const { unitPrice, unitLiters, unitsPerPeriod, frequency } = input.purchases;
  if (input.mode === "purchases") {
    const perMonth = frequency === "weekly" ? unitsPerPeriod * 4.345 : unitsPerPeriod;
    return Math.max(0, unitPrice) * Math.max(0, perMonth);
  }

  const extra = Math.max(0, input.estimate.extraMonthlyCost);
  if (Math.max(0, unitLiters) <= 0 || Math.max(0, unitPrice) <= 0) return extra;
  const perLitre = Math.max(0, unitPrice) / Math.max(0, unitLiters);
  return monthlyLiters(input) * perLitre + extra;
}

/**
 * Cost per litre of purchased water. Returns 0 when the shopper has not given
 * enough information — the UI then hides the value instead of showing a fake one.
 */
export function bottledCostPerLiter(input: CalculatorInput): number {
  const liters = monthlyLiters(input);
  const cost = monthlyBottledCost(input);
  if (liters <= 0 || cost <= 0) return 0;
  return cost / liters;
}

/* ------------------------------------------------------------------ */
/* Filter ownership side                                               */
/* ------------------------------------------------------------------ */

export function initialCost(input: CalculatorInput): number {
  const { devicePrice, installationCost, initialAccessoriesCost } = input.ownership;
  return Math.max(0, devicePrice) + Math.max(0, installationCost) + Math.max(0, initialAccessoriesCost);
}

export function monthlyExtraCost(input: CalculatorInput): number {
  return Math.max(0, input.ownership.extraMonthlyCost);
}

/** Which ownership events fall due in a given month (1-based). */
export function eventsForMonth(input: CalculatorInput, month: number): FilterEvent[] {
  const events: FilterEvent[] = [];
  const { ownership } = input;

  if (month === 1) {
    if (ownership.devicePrice > 0) {
      events.push({ kind: "device", label: "جهاز التنقية", amount: ownership.devicePrice });
    }
    if (ownership.installationCost > 0) {
      events.push({ kind: "extra", label: "التركيب", amount: ownership.installationCost });
    }
    if (ownership.initialAccessoriesCost > 0) {
      events.push({
        kind: "extra",
        label: "ملحقات/قطع أولية",
        amount: ownership.initialAccessoriesCost,
      });
    }
  }

  // A missing interval means “no schedule declared” — never bill it monthly.
  const interval = Math.round(ownership.replacementIntervalMonths);
  if (ownership.replacementKitPrice > 0 && interval >= 1 && month % interval === 0) {
    events.push({
      kind: "replacement",
      label: `طقم شمعات (كل ${interval} شهرًا)`,
      amount: ownership.replacementKitPrice,
    });
  }

  const maintenance = Math.round(ownership.maintenanceIntervalMonths);
  if (ownership.maintenancePrice > 0 && maintenance >= 1 && month % maintenance === 0) {
    events.push({
      kind: "maintenance",
      label: `زيارة صيانة (كل ${maintenance} شهرًا)`,
      amount: ownership.maintenancePrice,
    });
  }

  if (ownership.extraMonthlyCost > 0) {
    events.push({
      kind: "extra",
      label: "تكاليف تشغيل شهرية",
      amount: ownership.extraMonthlyCost,
    });
  }

  return events;
}

/* ------------------------------------------------------------------ */
/* Timeline + break-even                                               */
/* ------------------------------------------------------------------ */

export function buildTimeline(input: CalculatorInput): MonthlyPoint[] {
  const months = Math.max(1, Math.min(240, Math.round(input.months)));
  const baseBottled = monthlyBottledCost(input);
  const growth = Math.max(0, input.waterPriceGrowthPercent) / 100;

  const points: MonthlyPoint[] = [];
  let bottledCumulative = 0;
  let filterCumulative = 0;

  for (let month = 1; month <= months; month += 1) {
    const bottledMonth = baseBottled * Math.pow(1 + growth, month - 1);
    const events = eventsForMonth(input, month);
    const filterMonth = events.reduce((sum, event) => sum + event.amount, 0);

    bottledCumulative += bottledMonth;
    filterCumulative += filterMonth;

    points.push({
      month,
      bottledCumulative,
      filterCumulative,
      bottledMonth,
      filterMonth,
      events,
    });
  }

  return points;
}

/** First month where the filter has cost the same or less than buying water. */
export function findBreakEvenMonth(timeline: MonthlyPoint[]): number | null {
  const hit = timeline.find((point) => point.filterCumulative <= point.bottledCumulative);
  return hit ? hit.month : null;
}

/* ------------------------------------------------------------------ */
/* Result assembly                                                     */
/* ------------------------------------------------------------------ */

export function calculate(input: CalculatorInput): CalculatorResult {
  const months = Math.max(1, Math.min(240, Math.round(input.months)));
  const timeline = buildTimeline(input);
  const liters = monthlyLiters(input);
  const baseBottled = monthlyBottledCost(input);

  const last = timeline[timeline.length - 1];
  const bottledTotal = last?.bottledCumulative ?? 0;
  const filterTotal = last?.filterCumulative ?? 0;
  const savings = bottledTotal - filterTotal;

  const recurringCost = filterTotal - initialCost(input);
  const breakEvenMonth = findBreakEvenMonth(timeline);

  const totalLiters = liters * months;
  const bottledPerLiter = totalLiters > 0 ? bottledTotal / totalLiters : 0;
  const filterPerLiter = totalLiters > 0 ? filterTotal / totalLiters : 0;

  const missingData: string[] = [];
  if (liters <= 0) missingData.push("كمية المياه المستهلكة شهريًا");
  if (baseBottled <= 0) missingData.push("تكلفة المياه الحالية شهريًا");
  if (input.ownership.devicePrice <= 0) missingData.push("سعر الجهاز");
  if (input.ownership.replacementKitPrice <= 0) missingData.push("سعر طقم الشمعات");
  if (input.ownership.replacementIntervalMonths <= 0) missingData.push("دورة استبدال الشمعات");
  if (input.ownership.maintenancePrice > 0 && input.ownership.maintenanceIntervalMonths <= 0) {
    missingData.push("دورية زيارة الصيانة");
  }

  const assumptions = [
    {
      label: "مدة المقارنة",
      value: `${months} شهرًا (${Math.round((months / 12) * 10) / 10} سنة)`,
      editable: true,
    },
    {
      label: "الاستهلاك الشهري",
      value: liters > 0 ? `${Math.round(liters)} لترًا` : "غير محدد",
      editable: true,
    },
    {
      label: "ارتفاع سعر المياه سنويًا",
      value: `${input.waterPriceGrowthPercent}%`,
      editable: true,
    },
    {
      label: "تكلفة الشراء والتركيب",
      value: initialCost(input) > 0 ? formatRiyals(initialCost(input)) : "غير محددة",
      editable: true,
    },
    {
      label: "دورة استبدال الشمعات",
      value:
        input.ownership.replacementIntervalMonths > 0 && input.ownership.replacementKitPrice > 0
          ? `كل ${input.ownership.replacementIntervalMonths} شهرًا — ${formatRiyals(input.ownership.replacementKitPrice)}`
          : "غير محددة",
      editable: true,
    },
    {
      label: "زيارات الصيانة",
      value:
        input.ownership.maintenancePrice > 0 && input.ownership.maintenanceIntervalMonths > 0
          ? `كل ${input.ownership.maintenanceIntervalMonths} شهرًا — ${formatRiyals(input.ownership.maintenancePrice)}`
          : "غير محددة",
      editable: true,
    },
  ];

  return {
    monthlyLiters: liters,
    monthlyBottledCost: baseBottled,
    initialCost: initialCost(input),
    recurringCost,
    months,
    bottledTotal,
    filterTotal,
    savings,
    monthlyAverageSaving: months > 0 ? savings / months : 0,
    annualSaving: months > 0 ? (savings / months) * 12 : 0,
    bottledCostPerLiter: bottledPerLiter,
    filterCostPerLiter: filterPerLiter,
    costPerLiterDropPercent: bottledPerLiter > 0 ? ((bottledPerLiter - filterPerLiter) / bottledPerLiter) * 100 : 0,
    breakEvenMonth,
    timeline,
    assumptions,
    missingData,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers shared with the UI                                          */
/* ------------------------------------------------------------------ */

export function formatRiyals(value: number): string {
  return `${Math.round(value).toLocaleString("ar-SA")} ر.س`;
}

/** Human sentence describing the break-even point (never hard-coded). */
export function breakEvenSentence(result: CalculatorResult): string {
  if (result.missingData.length > 0) {
    return "أكمل البيانات الناقصة أدناه ليُحسب موعد بداية التوفير.";
  }
  if (result.breakEvenMonth === null) {
    return `خلال ${result.months} شهرًا لم تصل تكلفة الفلتر إلى تكلفة شراء المياه — جرّب مدة أطول أو راجع الأرقام.`;
  }
  const years = Math.floor(result.breakEvenMonth / 12);
  const rest = result.breakEvenMonth % 12;
  const duration = years > 0 ? `${years} سنة${rest > 0 ? ` و${rest} شهرًا` : ""}` : `${rest} شهرًا`;
  return `بعد ${duration} تقريبًا (الشهر ${result.breakEvenMonth}) تبدأ تكلفة الفلتر في الانخفاض عن تكلفة شرائك الحالية.`;
}

/** Band used for analytics so no exact figure leaves the browser context. */
export function savingsBand(value: number): string {
  if (value <= 0) return "none";
  if (value < 1000) return "under_1k";
  if (value < 5000) return "1k_5k";
  if (value < 20000) return "5k_20k";
  return "above_20k";
}

/** Preset catalogue used by the purchases mode (prices are editable defaults). */
export const BOTTLE_PRESETS: BottlePreset[] = [
  {
    id: "small-bottle",
    label: "عبوات صغيرة 330 مل",
    unitLiters: 0.33,
    defaultUnitPrice: 0.5,
    unitLabel: "عبوة",
  },
  {
    id: "carton",
    label: "كرتون مياه (12 عبوة 330 مل)",
    unitLiters: 3.96,
    defaultUnitPrice: 6,
    unitLabel: "كرتون",
  },
  {
    id: "gallon",
    label: "جالون 5 جالون (18.9 لتر)",
    unitLiters: 18.9,
    defaultUnitPrice: 12,
    unitLabel: "عبوة",
  },
  {
    id: "dispenser",
    label: "عبوة موزع مياه (19 لتر)",
    unitLiters: 19,
    defaultUnitPrice: 14,
    unitLabel: "عبوة",
  },
  {
    id: "custom",
    label: "خيار مخصص (أدخل الحجم والسعر)",
    unitLiters: 1,
    defaultUnitPrice: 1,
    unitLabel: "وحدة",
  },
];

export function presetById(id: string): BottlePreset {
  return BOTTLE_PRESETS.find((preset) => preset.id === id) ?? BOTTLE_PRESETS[0];
}
