import { describe, expect, it } from "vitest";
import { computeCartTotals, findCoupon, FLAT_SHIPPING, FREE_SHIPPING_THRESHOLD, VAT_PERCENT } from "@/lib/cart-logic";
import type { CartLine } from "@/store/StoreProvider";

const line = (unitPrice: number, quantity = 1): CartLine => ({
  id: "line-1",
  productId: "p1",
  variantId: "v1",
  sku: "SKU-1",
  name: "نظام تنقية",
  selectionLabel: "قياسي",
  unitPrice,
  quantity,
});

describe("cart totals", () => {
  it("sums lines and applies flat shipping below the free threshold", () => {
    const totals = computeCartTotals([line(100, 2)]);
    expect(totals.itemCount).toBe(2);
    expect(totals.subtotal).toBe(200);
    expect(totals.discount).toBe(0);
    expect(totals.shippingCost).toBe(FLAT_SHIPPING);
    expect(totals.total).toBe(200 + FLAT_SHIPPING);
  });

  it("gives free shipping at or above the threshold", () => {
    const totals = computeCartTotals([line(FREE_SHIPPING_THRESHOLD)]);
    expect(totals.shippingCost).toBe(0);
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD);
  });

  it("never charges shipping for an empty cart", () => {
    const totals = computeCartTotals([]);
    expect(totals.shippingCost).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("reports VAT as the portion already included in the total", () => {
    const totals = computeCartTotals([line(115)]);
    const expected = Math.round((115 - 115 / (1 + VAT_PERCENT / 100)) * 100) / 100;
    expect(totals.vatIncluded).toBe(expected);
    expect(totals.vatIncluded).toBeLessThan(totals.total);
  });

  it("rejects an unknown coupon without changing the price", () => {
    const totals = computeCartTotals([line(300)], "NOT-A-CODE");
    expect(totals.coupon).toBeUndefined();
    expect(totals.couponError).toBeTruthy();
    expect(totals.discount).toBe(0);
  });

  it("keeps a valid coupon below its minimum spend as an error", () => {
    const coupon = findCoupon("REWAA50");
    expect(coupon).toBeDefined();
    const totals = computeCartTotals([line(1)], coupon!.code);
    expect(totals.discount).toBe(0);
    expect(totals.couponError).toBeTruthy();
  });

  it("honours a shipping override from the shipping service", () => {
    const totals = computeCartTotals([line(50)], undefined, 99);
    expect(totals.shippingCost).toBe(99);
  });
});
