import { describe, expect, it } from "vitest";
import {
  BOTTLE_PRESETS,
  DEFAULT_MONTHS,
  bottledCostPerLiter,
  breakEvenSentence,
  buildTimeline,
  calculate,
  eventsForMonth,
  findBreakEvenMonth,
  formatRiyals,
  initialCost,
  monthlyBottledCost,
  monthlyLiters,
  presetById,
  savingsBand,
} from "@/lib/calculator-logic";
import type { CalculatorInput } from "@/types/calculator";

function baseInput(overrides: Partial<CalculatorInput> = {}): CalculatorInput {
  const input: CalculatorInput = {
    mode: "estimate",
    estimate: { people: 4, litersPerPersonPerDay: 3, extraMonthlyCost: 0 },
    purchases: { presetId: "gallon", unitLiters: 18.9, unitPrice: 12, unitsPerPeriod: 6, frequency: "monthly" },
    ownership: {
      devicePrice: 1200,
      installationCost: 0,
      initialAccessoriesCost: 0,
      replacementKitPrice: 300,
      replacementIntervalMonths: 6,
      maintenancePrice: 99,
      maintenanceIntervalMonths: 12,
      extraMonthlyCost: 0,
      manual: true,
    },
    months: DEFAULT_MONTHS,
    waterPriceGrowthPercent: 0,
  };
  return { ...input, ...overrides };
}

describe("calculator — consumption and current spend", () => {
  it("derives monthly litres from people × daily intake × 30 days", () => {
    const input = baseInput();
    expect(monthlyLiters(input)).toBeCloseTo(4 * 3 * 30, 5);
  });

  it("keeps the same monthly litres whichever spending mode is used", () => {
    const input = baseInput();
    expect(monthlyLiters(input)).toBeCloseTo(360, 5);
  });

  it("converts purchases to a monthly cost honouring weekly frequency", () => {
    const monthly = monthlyBottledCost(
      baseInput({
        mode: "purchases",
        purchases: { presetId: "gallon", unitLiters: 19, unitPrice: 10, unitsPerPeriod: 2, frequency: "monthly" },
      })
    );
    const weekly = monthlyBottledCost(
      baseInput({
        mode: "purchases",
        purchases: { presetId: "gallon", unitLiters: 19, unitPrice: 10, unitsPerPeriod: 2, frequency: "weekly" },
      })
    );
    expect(monthly).toBeCloseTo(20, 5);
    expect(weekly).toBeGreaterThan(monthly);
  });

  it("prices the estimated litres at the shopper's own unit price", () => {
    const cost = monthlyBottledCost(baseInput());
    // 360 litres/month at 12 ر.س per 18.9 L bottle.
    expect(cost).toBeCloseTo(360 * (12 / 18.9), 4);
  });

  it("leaves the estimate at the extra cost when no priced unit is given", () => {
    const cost = monthlyBottledCost(
      baseInput({ purchases: { presetId: "custom", unitLiters: 0, unitPrice: 0, unitsPerPeriod: 0, frequency: "monthly" } })
    );
    expect(cost).toBe(0);
  });

  it("adds the optional extra monthly cost on top", () => {
    const withExtra = monthlyBottledCost(baseInput({ estimate: { people: 4, litersPerPersonPerDay: 3, extraMonthlyCost: 50 } }));
    const without = monthlyBottledCost(baseInput());
    expect(withExtra - without).toBeCloseTo(50, 5);
  });

  it("never divides by zero when computing cost per litre", () => {
    const input = baseInput({ estimate: { people: 0, litersPerPersonPerDay: 0, extraMonthlyCost: 0 } });
    expect(Number.isFinite(bottledCostPerLiter(input))).toBe(true);
  });
});

describe("calculator — filter ownership costs", () => {
  it("sums one-off costs and only bills replacements when due", () => {
    const input = baseInput();
    expect(initialCost(input)).toBe(1200);
    expect(eventsForMonth(input, 1).some((event) => event.kind === "device")).toBe(true);
    expect(eventsForMonth(input, 2).some((event) => event.kind === "replacement")).toBe(false);
    expect(eventsForMonth(input, 6).some((event) => event.kind === "replacement")).toBe(true);
    expect(eventsForMonth(input, 12).some((event) => event.kind === "maintenance")).toBe(true);
  });

  it("skips recurring events when a value or interval is missing", () => {
    const input = baseInput({
      ownership: {
        devicePrice: 900,
        installationCost: 0,
        initialAccessoriesCost: 0,
        replacementKitPrice: 0,
        replacementIntervalMonths: 0,
        maintenancePrice: 150,
        maintenanceIntervalMonths: 0,
        extraMonthlyCost: 0,
        manual: true,
      },
    });
    expect(eventsForMonth(input, 6).some((event) => event.kind === "replacement")).toBe(false);
    expect(eventsForMonth(input, 24).some((event) => event.kind === "maintenance")).toBe(false);
  });

  it("builds a cumulative timeline that matches the requested horizon", () => {
    const timeline = buildTimeline(baseInput({ months: 24 }));
    expect(timeline).toHaveLength(24);
    const last = timeline[timeline.length - 1];
    expect(last.month).toBe(24);
    expect(last.bottledCumulative).toBeGreaterThanOrEqual(last.filterCumulative);
    // Cumulative series must never decrease.
    timeline.forEach((point, index) => {
      if (index === 0) return;
      expect(point.bottledCumulative).toBeGreaterThanOrEqual(timeline[index - 1].bottledCumulative);
      expect(point.filterCumulative).toBeGreaterThanOrEqual(timeline[index - 1].filterCumulative);
    });
  });

  it("applies the yearly price growth to purchased water only", () => {
    const flat = calculate(baseInput({ months: 24 }));
    const rising = calculate(baseInput({ months: 24, waterPriceGrowthPercent: 10 }));
    expect(rising.bottledTotal).toBeGreaterThan(flat.bottledTotal);
    expect(rising.filterTotal).toBeCloseTo(flat.filterTotal, 5);
  });
});

describe("calculator — result contract", () => {
  it("finds a break-even month and reports positive savings for the sample", () => {
    const result = calculate(baseInput({ months: 60 }));
    expect(result.breakEvenMonth).toBeGreaterThan(0);
    expect(result.breakEvenMonth! <= 60).toBe(true);
    expect(result.savings).toBeGreaterThan(0);
    expect(findBreakEvenMonth(result.timeline)).toBe(result.breakEvenMonth);
    expect(result.annualSaving).toBeCloseTo(result.monthlyAverageSaving * 12, 4);
  });

  it("reports no break-even (and negative savings) when owning is more expensive", () => {
    const result = calculate(
      baseInput({
        months: 12,
        estimate: { people: 1, litersPerPersonPerDay: 1, extraMonthlyCost: 0 },
        ownership: {
          devicePrice: 6000,
          installationCost: 500,
          initialAccessoriesCost: 0,
          replacementKitPrice: 400,
          replacementIntervalMonths: 3,
          maintenancePrice: 200,
          maintenanceIntervalMonths: 6,
          extraMonthlyCost: 0,
          manual: true,
        },
      })
    );
    expect(result.savings).toBeLessThan(0);
    expect(result.breakEvenMonth).toBeNull();
    expect(breakEvenSentence(result)).toMatch(/لم تصل/);
  });

  it("surfaces assumptions and never fabricates missing data", () => {
    const result = calculate(baseInput({ months: 36 }));
    expect(result.assumptions.length).toBeGreaterThan(0);
    result.assumptions.forEach((assumption) => {
      expect(assumption.label.length).toBeGreaterThan(0);
      expect(assumption.value.length).toBeGreaterThan(0);
    });
    expect(Array.isArray(result.missingData)).toBe(true);
  });

  it("clamps the horizon to the supported 1–240 month window", () => {
    expect(buildTimeline(baseInput({ months: 0 })).length).toBeGreaterThanOrEqual(1);
    expect(buildTimeline(baseInput({ months: 9999 })).length).toBe(240);
  });
});

describe("calculator — helpers", () => {
  it("offers editable bottle presets with a safe fallback", () => {
    expect(BOTTLE_PRESETS.length).toBeGreaterThanOrEqual(4);
    BOTTLE_PRESETS.forEach((preset) => {
      expect(preset.unitLiters).toBeGreaterThan(0);
      expect(preset.defaultUnitPrice).toBeGreaterThan(0);
    });
    expect(presetById("does-not-exist").id).toBe(BOTTLE_PRESETS[0].id);
  });

  it("formats riyals without inventing a currency", () => {
    expect(formatRiyals(1234.6)).toContain("ر.س");
    expect(formatRiyals(1234.6)).toMatch(/[0-9\u0660-\u0669]/);
    expect(formatRiyals(0)).toContain("ر.س");
  });

  it("labels savings bands without over-claiming", () => {
    expect(savingsBand(-10)).toBeTruthy();
    expect(savingsBand(0)).toBeTruthy();
    expect(savingsBand(5000)).toBeTruthy();
  });
});
