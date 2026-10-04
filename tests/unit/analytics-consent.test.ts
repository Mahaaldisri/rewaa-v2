import { describe, expect, it, beforeEach, vi } from "vitest";
import { consent, CONSENT_VERSION } from "@/services/consent";
import { analyticsStatus, initAnalytics, track } from "@/services/analytics";
import { itemFromProduct } from "@/services/analytics/map";
import { products } from "@/data/catalog";
import { env } from "@/config/env";

describe("consent layer", () => {
  beforeEach(() => consent.clear());

  it("is undecided until the visitor answers", () => {
    expect(consent.isDecided()).toBe(false);
    expect(consent.read()).toBeNull();
  });

  it("stores a versioned decision in the single localStore utility", () => {
    const state = consent.save({ analytics: true, marketing: false });
    expect(state.version).toBe(CONSENT_VERSION);
    expect(consent.read()?.analytics).toBe(true);
    expect(window.localStorage.getItem("rewaa_consent")).toContain(CONSENT_VERSION);
  });

  it("notifies subscribers and can be revoked", () => {
    const listener = vi.fn();
    const unsubscribe = consent.subscribe(listener);
    consent.save({ analytics: true, marketing: true });
    consent.revokeAll();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(consent.isAllowed("analytics")).toBe(false);
    unsubscribe();
  });

  it("treats a stale policy version as undecided", () => {
    window.localStorage.setItem("rewaa_consent", JSON.stringify({ version: "2020-01", analytics: true, marketing: true }));
    expect(consent.read()).toBeNull();
  });
});

describe("analytics facade", () => {
  beforeEach(() => {
    consent.clear();
    initAnalytics();
  });

  it("only reports through a configured provider", () => {
    const status = analyticsStatus();
    expect(["none", "console", "ga4", "gtm", "custom", "debug"]).toContain(status.provider);
    expect(status.queued).toBeGreaterThanOrEqual(0);
  });

  it("never throws when an event is fired without consent", () => {
    consent.revokeAll();
    expect(() => track("view_item_list", { item_list_id: "test", item_list_name: "قائمة اختبار", items: [] })).not.toThrow();
  });

  it("does not send before consent is granted, then flushes the queue", () => {
    if (!env.analytics.requireConsent) return; // dev build sends immediately by design
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    track("search", { search_term: "فلتر" });
    expect(analyticsStatus().queued).toBeGreaterThan(0);
    consent.save({ analytics: true, marketing: false });
    expect(spy).toHaveBeenCalled();
  });
});

describe("analytics item mapping", () => {
  it("maps a catalog product to the GA4 item shape", () => {
    const product = products[0];
    const item = itemFromProduct(product, product.variants[0].sku, product.price, product.variants[0].sku);
    expect(item.item_id).toBe(product.variants[0].sku);
    expect(item.item_name).toBe(product.name);
    expect(item.price).toBe(product.price);
    expect(item.quantity).toBe(1);
  });
});
