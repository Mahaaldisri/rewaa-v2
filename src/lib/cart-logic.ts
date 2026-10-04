import type { CartLine } from "@/store/StoreProvider";

export interface CartCoupon {
  code: string;
  label: string;
  minSubtotal: number;
  /** flat SAR amount off, applied to subtotal */
  amountOff: number;
}

/** Centralised coupon catalogue — mirrors `pricingApi.quote` on the server side. */
export const AVAILABLE_COUPONS: CartCoupon[] = [
  { code: "REWAA100", label: "خصم 100 ر.س على طلبات فوق 900 ر.س", minSubtotal: 900, amountOff: 100 },
  { code: "REWAA50", label: "خصم 50 ر.س على طلبات فوق 400 ر.س", minSubtotal: 400, amountOff: 50 },
];

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  vatIncluded: number;
  total: number;
  coupon?: CartCoupon;
  couponError?: string;
}

const VAT_PERCENT = 15;
const FREE_SHIPPING_THRESHOLD = 500;
const FLAT_SHIPPING = 29;

export function findCoupon(code: string): CartCoupon | undefined {
  return AVAILABLE_COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
}

export function computeCartTotals(cart: CartLine[], couponCode?: string, shippingOverride?: number): CartTotals {
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  let discount = 0;
  let coupon: CartCoupon | undefined;
  let couponError: string | undefined;

  if (couponCode) {
    const found = findCoupon(couponCode);
    if (!found) {
      couponError = "هذا الكود غير صالح أو منتهي الصلاحية.";
    } else if (subtotal < found.minSubtotal) {
      couponError = `هذا الكود يتطلب حد أدنى ${found.minSubtotal} ر.س للطلب.`;
    } else {
      coupon = found;
      discount = found.amountOff;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const shippingCost =
    shippingOverride ?? (cart.length === 0 ? 0 : afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING);
  const total = afterDiscount + shippingCost;
  const vatIncluded = Math.round((afterDiscount - afterDiscount / (1 + VAT_PERCENT / 100)) * 100) / 100;

  return { itemCount, subtotal, discount, shippingCost, vatIncluded, total, coupon, couponError };
}

export { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING, VAT_PERCENT };
