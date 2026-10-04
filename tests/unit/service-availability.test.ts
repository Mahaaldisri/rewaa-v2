import { describe, expect, it } from "vitest";
import { availabilityApi } from "@/services/serviceAvailability";
import { serviceAreas } from "@/config/site";

describe("service availability", () => {
  it("serves cities from configuration, not invented coverage", () => {
    const cities = availabilityApi.servedCities();
    expect(cities.length).toBe(serviceAreas.cities.length);
    cities.forEach((city) => expect(serviceAreas.cities).toContain(city.name));
  });

  it("marks a configured city as covered", () => {
    expect(availabilityApi.coverageFor("الرياض").covered).toBe(true);
  });

  it("reports unknown cities as uncovered with the configuration note", async () => {
    const answer = await availabilityApi.forCity({ city: "مدينة-وهمية" });
    expect(answer.covered).toBe(false);
    expect(answer.installation.available).toBe(false);
    expect(answer.note).toContain(serviceAreas.note);
  });

  it("labels demo slots and fees as samples, and never in a live build", async () => {
    const answer = await availabilityApi.forCity({ city: "جدة" });
    if (answer.source === "sample") {
      expect(answer.nearestSlot?.sample).toBe(true);
      expect(answer.installation.sampleFee).toBe(true);
      expect(answer.note).toMatch(/تجريبي/);
    } else {
      // Without a backend nothing may be invented.
      expect(answer.nearestSlot).toBeUndefined();
      expect(answer.installation.fee).toBeUndefined();
    }
  });
});
