import { describe, expect, it } from "vitest";
import { adviceFor, defaultIntervalMonths, planFor, reminderPreview, type CustomerDevice } from "@/lib/maintenance";
import { catalogEntries } from "@/data/catalog";

const device: CustomerDevice = {
  id: "dev_1",
  deviceSlug: "water-filters/ro-500-lux",
  deviceName: "نظام تنقية",
  installedAt: "2025-01-10",
  lastCartridgeChange: "2026-01-10",
  intervalMonths: 6,
  reminderChannels: { whatsapp: true, sms: false, email: false, leadDays: 14 },
  createdAt: "2025-01-10T00:00:00.000Z",
};

const now = new Date("2026-03-01T00:00:00.000Z");

describe("maintenance planning", () => {
  it("computes the next replacement from the recorded change date", () => {
    const plan = planFor(device, now);
    expect(new Date(plan.nextChangeAt).getMonth()).toBe(6); // July (0-based month 6)
    expect(plan.daysUntil).toBeGreaterThan(100);
    expect(plan.state).toBe("ok");
  });

  it("clamps the remaining lifetime into 0–100", () => {
    const overdue = planFor({ ...device, lastCartridgeChange: "2025-01-01" }, now);
    expect(overdue.percentRemaining).toBe(0);
    expect(overdue.state).toBe("overdue");
    const fresh = planFor({ ...device, lastCartridgeChange: "2026-03-01" }, now);
    expect(fresh.percentRemaining).toBe(100);
  });

  it("describes the next action without promising anything it cannot", () => {
    expect(adviceFor(planFor(device, now))).toMatch(/الموعد التالي|لا حاجة/);
    expect(adviceFor(planFor({ ...device, lastCartridgeChange: "2024-01-01" }, now))).toMatch(/تجاوز|اطلب/);
  });

  it("never claims a reminder was sent", () => {
    const preview = reminderPreview(device, planFor(device, now));
    expect(preview).toContain("واتساب");
    expect(preview).toMatch(/لم يتم ربط مزوّد/);
  });

  it("derives the replacement interval from the catalogue", () => {
    const withInterval = catalogEntries.find(
      (entry) => typeof entry.summary.attributes?.replacementMonths === "number"
    );
    if (withInterval) {
      expect(defaultIntervalMonths(withInterval.summary.slug)).toBe(
        withInterval.summary.attributes?.replacementMonths
      );
    }
  });
});
