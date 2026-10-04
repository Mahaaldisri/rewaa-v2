import { describe, expect, it } from "vitest";
import { knownModels, partsForDeviceSlug, searchCompatibleParts, sparePartSummaries } from "@/lib/compatibility";
import { catalogEntries } from "@/data/catalog";

describe("compatibility engine", () => {
  it("exposes model codes straight from the catalogue", () => {
    expect(knownModels.length).toBeGreaterThan(0);
    knownModels.forEach((model) => expect(model).toMatch(/^[A-Za-z0-9-]{3,}$/));
  });

  it("returns only parts whose data declares the searched model", () => {
    const model = knownModels.find((entry) => /^RWA-/i.test(entry));
    expect(model).toBeTruthy();
    const result = searchCompatibleParts(model!);
    expect(result.parts.length).toBeGreaterThan(0);
    result.parts.forEach((part) => {
      const entry = catalogEntries.find((item) => item.product.slug === part.summary.slug);
      const declared = (entry?.summary.attributes?.compatibleModels ?? []) as string[];
      const matchesDeclared = declared.some((value) => value.toUpperCase() === model!.toUpperCase());
      const matchesSku = part.summary.sku.toUpperCase() === model!.toUpperCase();
      expect(matchesDeclared || matchesSku).toBe(true);
      expect(part.reasons.length).toBeGreaterThan(0);
    });
  });

  it("never claims compatibility it cannot justify", () => {
    const result = searchCompatibleParts("جهاز-غير-موجود-12345");
    result.parts.forEach((part) => {
      // Fallback suggestions must be flagged as uncertain instead of “compatible”.
      if (part.confidence < 40) {
        expect(part.alternative).toBe(true);
        expect(part.reasons.some((reason) => reason.kind === "type_match")).toBe(true);
      }
    });
  });

  it("lists parts for a device with a stated reason", () => {
    const device = catalogEntries.find((entry) => entry.summary.categorySlug === "water-filters");
    expect(device).toBeTruthy();
    const compatibility = partsForDeviceSlug(device!.product.slug);
    if (compatibility) {
      expect(compatibility.device.slug).toBe(device!.product.slug);
      compatibility.parts.forEach((part) => expect(part.reasons.length).toBeGreaterThan(0));
    }
  });

  it("only offers real catalogue entries as spare parts", () => {
    const slugs = sparePartSummaries().map((summary) => summary.slug);
    expect(slugs.length).toBeGreaterThan(0);
    slugs.forEach((slug) => expect(catalogEntries.some((entry) => entry.product.slug === slug)).toBe(true));
  });
});
