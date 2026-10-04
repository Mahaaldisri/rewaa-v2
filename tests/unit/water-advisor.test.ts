import { describe, expect, it } from "vitest";
import { advise, EMPTY_ANSWERS, type AdvisorAnswers } from "@/lib/water-advisor";
import { catalogEntries } from "@/data/catalog";

const base: AdvisorAnswers = {
  ...EMPTY_ANSWERS,
  city: "الرياض",
  housing: "villa",
  usage: "drinking",
  users: "3-5",
  consumption: "medium",
  source: "network",
  tds: "300-600",
  problem: "salty",
};

const catalogSlugs = new Set(catalogEntries.map((entry) => entry.product.slug));

describe("water advisor", () => {
  it("only recommends real catalogue products", () => {
    const result = advise(base);
    expect(result.recommendations.length).toBeGreaterThan(0);
    result.recommendations.forEach((entry) => {
      expect(catalogSlugs.has(entry.summary.slug)).toBe(true);
      expect(entry.reasons.length).toBeGreaterThan(0);
      entry.reasons.forEach((reason) => expect(reason.length).toBeGreaterThan(10));
    });
  });

  it("ranks RO systems for salty water and medium TDS", () => {
    const result = advise({ ...base, problem: "salty", tds: "300-600" });
    const top = result.recommendations[0];
    expect(["رو", "ro", "direct-flow"]).toContain(top.summary.attributes?.systemType);
  });

  it("states that it performs no laboratory analysis", () => {
    const result = advise({ ...base, tds: "above-600" });
    expect(result.notes.join(" ")).toContain("تحليل");
    expect(result.notes.join(" ")).toMatch(/مخبري|ميداني/);
  });

  it("reports coverage from configuration, never inventing it", () => {
    expect(advise({ ...base, city: "الرياض" }).coverage.covered).toBe(true);
    const outside = advise({ ...base, city: "مدينة-غير-مخدومة" });
    expect(outside.coverage.covered).toBe(false);
    expect(outside.coverage.label).toContain("خارج هذه المدن");
  });

  it("warns instead of guessing when the source is a well", () => {
    const result = advise({ ...base, source: "well" });
    const cautions = result.recommendations.flatMap((entry) => entry.cautions).join(" ");
    expect(cautions).toMatch(/قياس|الآبار/);
  });

  it("recommends spare parts when the shopper only needs replacements", () => {
    const result = advise({ ...base, usage: "cartridge", problem: "taste" });
    result.recommendations.forEach((entry) => expect(entry.summary.categorySlug).toBe("cartridges"));
  });

  it("returns an empty list rather than inventing a match", () => {
    const result = advise({ ...EMPTY_ANSWERS });
    expect(result.recommendations).toEqual([]);
  });
});
