import type {
  City,
  InstallmentProvider,
  Product,
  ProductImage,
  Promotion,
  ShippingConfig,
  StockStatus,
  Variant,
} from "@/types/product";
import { discountPercent, rangeLabel, savedAmount } from "./format";

/** optionGroupId -> optionId */
export type Selection = Record<string, string>;

export interface AvailabilityState {
  status: StockStatus;
  label: string;
  message: string;
  tone: "success" | "warning" | "danger" | "info";
  remaining: number;
  purchasable: boolean;
  ctaLabel: string;
}

const STOCK_COPY: Record<StockStatus, Omit<AvailabilityState, "status" | "remaining">> = {
  in_stock: {
    label: "متوفر",
    message: "جاهز للشحن من المستودع، ويُجدول موعد التركيب خلال 48 ساعة",
    tone: "success",
    purchasable: true,
    ctaLabel: "أضف إلى السلة",
  },
  low_stock: {
    label: "كمية محدودة",
    message: "الطلب الآن يضمن لك الوحدة — تُحجز الكمية 30 دقيقة فقط",
    tone: "warning",
    purchasable: true,
    ctaLabel: "أضف إلى السلة",
  },
  out_of_stock: {
    label: "نفد المخزون",
    message: "هذا الطراز غير متوفر حاليًا. فعّل التنبيه وسنراسلك فور وصول الشحنة.",
    tone: "danger",
    purchasable: false,
    ctaLabel: "أخبرني عند التوفر",
  },
  coming_soon: {
    label: "متوفر قريبًا",
    message: "الدفعة القادمة في طريقها إلى المستودع — يمكنك حجز وحدتك مسبقًا.",
    tone: "info",
    purchasable: false,
    ctaLabel: "احجز مسبقًا",
  },
};

/* ----------------------------- Variants ----------------------------- */

export function getDefaultSelection(product: Product): Selection {
  const variant =
    product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0];
  return variant ? { ...variant.selection } : {};
}

export function getVariant(product: Product, selection: Selection): Variant | undefined {
  const groups = Object.keys(selection);
  return product.variants.find((variant) =>
    groups.every((groupId) => variant.selection[groupId] === selection[groupId])
  );
}

export function availabilityOf(variant: Variant | undefined): AvailabilityState {
  if (!variant) {
    return {
      status: "out_of_stock",
      remaining: 0,
      ...STOCK_COPY.out_of_stock,
      message: "لم يتم العثور على خيار مطابق، الرجاء اختيار خيار آخر.",
    };
  }
  const copy = STOCK_COPY[variant.status];
  return {
    ...copy,
    status: variant.status,
    remaining: Math.max(0, variant.stock),
  };
}

export interface OptionAvailability {
  /** No purchasable combination exists for this option with the current selection */
  unavailable: boolean;
  /** A combination exists but it is sold out / coming soon */
  soldOut: boolean;
  lowStock: boolean;
  priceDelta: number;
}

export function optionAvailability(
  product: Product,
  groupId: string,
  optionId: string,
  selection: Selection
): OptionAvailability {
  const candidates = product.variants.filter((v) => {
    if (v.selection[groupId] !== optionId) return false;
    return Object.entries(selection).every(
      ([otherGroup, otherOption]) => otherGroup === groupId || v.selection[otherGroup] === otherOption
    );
  });

  const activeVariant = getVariant(product, { ...selection, [groupId]: optionId });
  const basePrice = activeVariant?.price ?? candidates[0]?.price ?? product.price;

  return {
    unavailable: candidates.length === 0,
    soldOut:
      candidates.length > 0 &&
      candidates.every((v) => v.status === "out_of_stock" || v.status === "coming_soon"),
    lowStock: Boolean(activeVariant && activeVariant.status === "low_stock"),
    priceDelta: basePrice - product.price,
  };
}

/* ------------------------------ Gallery ----------------------------- */

export function imagesForSelection(product: Product, selection: Selection): ProductImage[] {
  const activeIds = new Set(Object.values(selection));
  activeIds.add("shared");

  const matched = product.images.filter((img) =>
    img.optionIds?.some((id) => activeIds.has(id))
  );

  // Variant-specific shots first, then shared detail shots.
  const variantShots = matched.filter((img) =>
    img.optionIds?.some((id) => id !== "shared" && activeIds.has(id))
  );
  const sharedShots = matched.filter((img) => !variantShots.includes(img));

  const ordered = [...variantShots, ...sharedShots];
  return ordered.length ? ordered : product.images;
}

/* ------------------------------ Pricing ----------------------------- */

export interface PriceQuote {
  unitPrice: number;
  compareAtPrice?: number;
  discount: number;
  saved: number;
  vatIncluded: number;
  subtotal: number;
  total: number;
}

export function quotePrice(variant: Variant | undefined, product: Product, qty: number): PriceQuote {
  const unitPrice = variant?.price ?? product.price;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  const subtotal = unitPrice * qty;
  return {
    unitPrice,
    compareAtPrice,
    discount: discountPercent(unitPrice, compareAtPrice),
    saved: savedAmount(unitPrice, compareAtPrice),
    vatIncluded: Math.round((unitPrice - unitPrice / (1 + product.vatPercent / 100)) * 100) / 100,
    subtotal,
    total: subtotal,
  };
}

/* ---------------------------- Promotions ---------------------------- */

export type PromotionState = "active" | "expired" | "upcoming";

export function promotionState(promo: Promotion, now = Date.now()): PromotionState {
  const start = promo.startsAt ? new Date(promo.startsAt).getTime() : 0;
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : Number.POSITIVE_INFINITY;
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

export function activePromotions(promos: Promotion[], now = Date.now()): Promotion[] {
  return promos.filter((p) => promotionState(p, now) === "active");
}

export function headlinePromotion(promos: Promotion[], now = Date.now()): Promotion | undefined {
  return promos.find((p) => p.highlight && promotionState(p, now) === "active");
}

/* ----------------------------- Shipping ----------------------------- */

/** Saudi business days run Sunday–Thursday. */
export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 5 && weekday !== 6) added += 1;
  }
  return date;
}

export interface DeliveryEstimate {
  city: City;
  kind: "standard" | "express" | "same_day" | "pickup";
  label: string;
  from: Date;
  to: Date;
  cost: number;
}

export function estimateDelivery(
  city: City,
  config: ShippingConfig,
  kind: DeliveryEstimate["kind"],
  orderValue: number
): DeliveryEstimate {
  const today = new Date();
  const freeShipping = orderValue >= config.freeShippingThreshold;

  if (kind === "pickup") {
    return {
      city,
      kind,
      label: "جاهز للاستلام خلال ساعتين",
      from: today,
      to: today,
      cost: 0,
    };
  }

  if (kind === "same_day") {
    return {
      city,
      kind,
      label: city.sameDayAvailable ? "اليوم خلال 4 ساعات" : "غير متاح لهذه المدينة",
      from: today,
      to: today,
      cost: 49,
    };
  }

  const range = kind === "express" ? city.expressEta : city.standardEta;
  const cost = kind === "express" ? config.expressRate : freeShipping ? 0 : config.flatRate;
  return {
    city,
    kind,
    label: `${rangeLabel(range)} ${range[1] === 1 ? "يوم" : "أيام"} عمل`,
    from: addBusinessDays(today, range[0]),
    to: addBusinessDays(today, range[1]),
    cost,
  };
}

export function freeShippingProgress(orderValue: number, threshold: number) {
  const remaining = Math.max(0, threshold - orderValue);
  return {
    remaining,
    percent: Math.min(100, Math.round((orderValue / threshold) * 100)),
    qualified: remaining === 0,
  };
}

/* --------------------------- Installments --------------------------- */

export interface InstallmentPlan {
  provider: InstallmentProvider;
  perInstallment: number;
  count: number;
  total: number;
  fee: number;
  eligible: boolean;
  reason?: string;
}

export function installmentPlan(total: number, provider: InstallmentProvider): InstallmentPlan {
  const eligible = total >= provider.minAmount && total <= provider.maxAmount;
  const fee = (total * provider.feePercent) / 100;
  const grand = total + fee;
  return {
    provider,
    count: provider.installments,
    perInstallment: Math.round((grand / provider.installments) * 100) / 100,
    total: Math.round(grand * 100) / 100,
    fee: Math.round(fee * 100) / 100,
    eligible,
    reason: !eligible
      ? total < provider.minAmount
        ? `الحد الأدنى ${provider.minAmount} ر.س`
        : `الحد الأقصى ${provider.maxAmount} ر.س`
      : undefined,
  };
}

/* ------------------------------ Utility ----------------------------- */

export function optionLabel(product: Product, groupId: string, optionId: string): string {
  const group = product.optionGroups.find((g) => g.id === groupId);
  return group?.options.find((o) => o.id === optionId)?.label ?? optionId;
}

export function selectionLabel(product: Product, selection: Selection): string {
  return Object.entries(selection)
    .map(([groupId, optionId]) => optionLabel(product, groupId, optionId))
    .join(" • ");
}
