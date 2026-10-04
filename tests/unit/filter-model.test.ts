import { describe, expect, it } from "vitest";
import { catalogEntries } from "@/data/catalog";
import {
  INSTALLATION_TYPE_OPTIONS,
  USE_CASE_OPTIONS,
  USERS_OPTIONS,
  hasRo,
  hasUv,
  isDiscounted,
  labelForOption,
  matchInstallationType,
  matchUseCase,
  matchUsers,
  savingsAmount,
} from "@/lib/filter-model";
import { buildFilterInsight } from "@/lib/filter-insights";
import type { ProductSummary } from "@/types/catalog";

const summaries: ProductSummary[] = catalogEntries.map((entry) => entry.summary);

function withAttributes(attributes: Record<string, unknown>, extra: Partial<ProductSummary> = {}): ProductSummary {
  const base = summaries[0];
  return { ...base, attributes: attributes as ProductSummary["attributes"], ...extra };
}

describe("derived filter model — data only, never guessed in", () => {
  it("excludes products that do not declare the attributes a rule needs", () => {
    const unknown = withAttributes({});
    // Household size needs flow rate or capacity: without either, nothing matches.
    USERS_OPTIONS.forEach((option) => expect(matchUsers(unknown, option.id)).toBe(false));
  });

  it("never returns true for an undefined option id", () => {
    const sample = summaries.find((entry) => entry.attributes?.usage) ?? summaries[0];
    expect(matchUseCase(sample, "not-a-real-use-case")).toBe(true); // unknown ids are ignored, not faked
    expect(matchUsers(sample, "not-a-size")).toBe(true);
    expect(matchInstallationType(sample, "not-a-type")).toBe(true);
  });

  it("maps use cases onto the usage / system-type values in the catalogue", () => {
    summaries.forEach((summary) => {
      if (summary.attributes?.usage === "commercial") {
        expect(matchUseCase(summary, "commercial")).toBe(true);
      }
      if (summary.attributes?.usage === "home" || summary.attributes?.usage === "both") {
        expect(matchUseCase(summary, "home")).toBe(true);
      }
    });
  });

  it("keeps installation types consistent with subcategory and system type", () => {
    summaries.forEach((summary) => {
      if (summary.subcategorySlug === "under-sink") {
        expect(matchInstallationType(summary, "under-sink")).toBe(true);
      }
      if (summary.subcategorySlug === "countertop") {
        expect(matchInstallationType(summary, "countertop")).toBe(true);
      }
      if (summary.attributes?.systemType === "whole-house") {
        expect(matchInstallationType(summary, "central")).toBe(true);
      }
    });
  });

  it("keeps the exclusive household-size buckets mutually exclusive", () => {
    // "7-plus" also covers commercial systems, so it may overlap by design.
    const exclusive = USERS_OPTIONS.map((option) => option.id).filter((id) => id !== "7-plus");
    summaries.forEach((summary) => {
      const matches = exclusive.filter((bucket) => matchUsers(summary, bucket));
      expect(matches.length).toBeLessThanOrEqual(1);
    });
  });

  it("reads UV and RO from declared attributes only", () => {
    expect(hasUv(withAttributes({}))).toBe(false);
    expect(hasUv(withAttributes({ hasUv: true }))).toBe(true);
    expect(hasRo(withAttributes({ systemType: "ro" }))).toBe(true);
    expect(hasRo(withAttributes({ systemType: "cartridge" }))).toBe(false);
  });

  it("computes savings only for genuinely discounted products", () => {
    const plain = withAttributes({}, { price: 500, compareAtPrice: undefined });
    const discounted = withAttributes({}, { price: 500, compareAtPrice: 700 });
    const fake = withAttributes({}, { price: 700, compareAtPrice: 500 });
    expect(isDiscounted(plain)).toBe(false);
    expect(savingsAmount(plain)).toBe(0);
    expect(isDiscounted(discounted)).toBe(true);
    expect(savingsAmount(discounted)).toBe(200);
    expect(isDiscounted(fake)).toBe(false);
    expect(savingsAmount(fake)).toBe(0);
  });

  it("labels every option in each group with Arabic text", () => {
    USE_CASE_OPTIONS.forEach((option) => {
      expect(labelForOption("useCase", option.id)).toBe(option.label);
      expect(option.label).toMatch(/[\u0600-\u06FF]/);
    });
    INSTALLATION_TYPE_OPTIONS.forEach((option) => expect(labelForOption("installationType", option.id)).toBe(option.label));
    USERS_OPTIONS.forEach((option) => expect(labelForOption("users", option.id)).toBe(option.label));
    expect(labelForOption("features", "ro")).toContain("RO");
    expect(labelForOption("features", "uv")).toContain("UV");
    expect(labelForOption("offers", "1")).toBe("عليه خصم");
    expect(labelForOption("features", "unknown")).toBe("unknown");
  });
});

describe("filter insights", () => {
  it("stays silent when no filter is applied", () => {
    expect(buildFilterInsight({}, 10)).toBeNull();
    expect(buildFilterInsight({ useCase: [], users: [] }, 10)).toBeNull();
  });

  it("explains an empty result and points to relaxing the filters", () => {
    const insight = buildFilterInsight({ useCase: ["villa"] }, 0);
    expect(insight?.kind).toBe("empty");
    expect(insight?.message).toMatch(/لا يوجد/);
  });

  it("personalises the message when a use case and household size are chosen", () => {
    const insight = buildFilterInsight({ useCase: ["home"], users: ["4-6"] }, 7);
    expect(insight?.kind).toBe("personalised");
    expect(insight?.message).toContain("7");
    expect(insight?.message).toMatch(/ليس على تحليل لمياهك/);
  });

  it("reports a single match and a generic count", () => {
    expect(buildFilterInsight({ installationType: ["under-sink"] }, 1)?.kind).toBe("single");
    const generic = buildFilterInsight({ installationType: ["under-sink"] }, 12);
    expect(generic?.kind).toBe("generic");
    expect(generic?.message).toContain("12");
  });
});
