import type {
  Carrier,
  City,
  InstallmentProvider,
  PaymentMethod,
  PickupBranch,
  ServicePlan,
  ShippingConfig,
} from "@/types/product";
import { shipping as shippingConfig } from "@/config/site";

/**
 * Shared commerce data (shipping, payments, instalments, service plans).
 * Kept in one place so every product inherits identical commercial terms —
 * the product factory never duplicates these values.
 */

/* --------------------------------- Cities --------------------------------- */
export const cities: City[] = [
  { id: "riyadh", name: "الرياض", region: "منطقة الرياض", standardEta: [1, 2], expressEta: [1, 1], sameDayAvailable: true },
  { id: "jeddah", name: "جدة", region: "منطقة مكة المكرمة", standardEta: [1, 3], expressEta: [1, 1], sameDayAvailable: true },
  { id: "dammam", name: "الدمام", region: "المنطقة الشرقية", standardEta: [2, 3], expressEta: [1, 2], sameDayAvailable: true },
  { id: "khobar", name: "الخبر", region: "المنطقة الشرقية", standardEta: [2, 3], expressEta: [1, 2], sameDayAvailable: false },
  { id: "makkah", name: "مكة المكرمة", region: "منطقة مكة المكرمة", standardEta: [2, 4], expressEta: [1, 2], sameDayAvailable: false },
  { id: "madinah", name: "المدينة المنورة", region: "منطقة المدينة المنورة", standardEta: [2, 4], expressEta: [1, 2], sameDayAvailable: false },
  { id: "buraidah", name: "بريدة", region: "منطقة القصيم", standardEta: [2, 4], expressEta: [2, 3], sameDayAvailable: false },
  { id: "taif", name: "الطائف", region: "منطقة مكة المكرمة", standardEta: [3, 5], expressEta: [2, 3], sameDayAvailable: false },
  { id: "abha", name: "أبها", region: "منطقة عسير", standardEta: [3, 5], expressEta: [2, 3], sameDayAvailable: false },
  { id: "tabuk", name: "تبوك", region: "منطقة تبوك", standardEta: [3, 5], expressEta: [2, 4], sameDayAvailable: false },
  { id: "hail", name: "حائل", region: "منطقة حائل", standardEta: [3, 5], expressEta: [2, 4], sameDayAvailable: false },
  { id: "jubail", name: "الجبيل", region: "المنطقة الشرقية", standardEta: [2, 4], expressEta: [2, 3], sameDayAvailable: false },
  { id: "dhahran", name: "الظهران", region: "المنطقة الشرقية", standardEta: [2, 3], expressEta: [1, 2], sameDayAvailable: false },
  { id: "jazan", name: "جازان", region: "منطقة جازان", standardEta: [4, 6], expressEta: [2, 4], sameDayAvailable: false },
  { id: "najran", name: "نجران", region: "منطقة نجران", standardEta: [4, 6], expressEta: [3, 4], sameDayAvailable: false },
];

/* -------------------------------- Carriers -------------------------------- */
export const carriers: Carrier[] = [
  { id: "rewaa-tech", name: "فرق رواء الفنية", kind: "standard", price: 0, etaLabel: "توصيل وتركيب خلال 1–3 أيام" },
  { id: "smsa", name: "سمسا إكسبرس", kind: "standard", price: shippingConfig.flatRate, etaLabel: "2–4 أيام عمل" },
  { id: "naqel", name: "ناقل إكسبرس", kind: "express", price: shippingConfig.expressRate, etaLabel: "24 ساعة للمدن الرئيسية" },
  { id: "rewaa-same-day", name: "تركيب رواء الفوري", kind: "same_day", price: shippingConfig.sameDayRate, etaLabel: "خلال 6 ساعات" },
];

/* -------------------------------- Branches -------------------------------- */
export const pickupBranches: PickupBranch[] = [
  { id: "br-rkd", city: "الرياض", name: "رواء – طريق الملك عبدالله", address: "طريق الملك عبدالله، حي المغرزات", hours: "8 ص – 10 م", stock: 14, distanceKm: 3.4 },
  { id: "br-exit9", city: "الرياض", name: "رواء – مخرج 9 الصناعية", address: "طريق الدمام، المنطقة الصناعية الثانية", hours: "8 ص – 8 م", stock: 6, distanceKm: 11.2 },
  { id: "br-jdr", city: "جدة", name: "رواء – طريق الأمير سلطان", address: "طريق الأمير سلطان، حي الزهراء", hours: "9 ص – 11 م", stock: 4, distanceKm: 12.6 },
  { id: "br-dmm", city: "الدمام", name: "رواء – الدمام", address: "شارع الملك فهد، حي الفيصلية", hours: "9 ص – 10 م", stock: 5, distanceKm: 7.8 },
];

export const shipping: ShippingConfig = {
  freeShippingThreshold: shippingConfig.freeShippingThreshold,
  flatRate: shippingConfig.flatRate,
  expressRate: shippingConfig.expressRate,
  carriers,
  cities,
  branches: pickupBranches,
  international: false,
  note: "التركيب المجاني يشمل المدن المخدومة؛ خارجها تُحتسب رسوم انتقال الفني حسب المسافة. أيام العمل من السبت إلى الخميس.",
};

/* ------------------------------- Payments --------------------------------- */
export const paymentMethods: PaymentMethod[] = [
  { id: "mada", name: "mada", nameAr: "مدى", kind: "card", enabled: true, note: "الدفع المحلي الأسرع" },
  { id: "visa", name: "Visa", nameAr: "فيزا", kind: "card", enabled: true },
  { id: "mastercard", name: "Mastercard", nameAr: "ماستركارد", kind: "card", enabled: true },
  { id: "amex", name: "American Express", nameAr: "أمريكان إكسبريس", kind: "card", enabled: true },
  { id: "applepay", name: "Apple Pay", nameAr: "آبل باي", kind: "wallet", enabled: true, note: "دفع بلمسة واحدة" },
  { id: "googlepay", name: "Google Pay", nameAr: "جوجل باي", kind: "wallet", enabled: true },
  { id: "stcpay", name: "stc pay", nameAr: "إس تي سي باي", kind: "wallet", enabled: true },
  { id: "tabby", name: "Tabby", nameAr: "تابي", kind: "bnpl", enabled: true, note: "قسّمها على 4" },
  { id: "tamara", name: "Tamara", nameAr: "تمارا", kind: "bnpl", enabled: true, note: "قسّمها على 3" },
  { id: "cod", name: "Cash on Delivery", nameAr: "الدفع عند الاستلام", kind: "cod", enabled: true, note: "رسوم 20 ر.س" },
  { id: "bank", name: "Bank Transfer", nameAr: "تحويل بنكي", kind: "bank", enabled: true, note: "للمنشآت والفواتير الضريبية" },
];

export const installmentProviders: InstallmentProvider[] = [
  { id: "tabby", name: "Tabby", nameAr: "تابي", installments: 4, apr: 0, minAmount: 100, maxAmount: 10000, feePercent: 0, accent: "#22b573" },
  { id: "tamara", name: "Tamara", nameAr: "تمارا", installments: 3, apr: 0, minAmount: 150, maxAmount: 10000, feePercent: 0, accent: "#22a9e0" },
  { id: "rewaa-split", name: "REWAA Split", nameAr: "تقسيط رواء", installments: 6, apr: 0, minAmount: 900, maxAmount: 40000, feePercent: 2.5, accent: "#16306b" },
];

/* ------------------------------ Service plans ------------------------------ */
/** Hardware + installation packaged for water systems. */
export const systemServicePlans: ServicePlan[] = [
  {
    id: "plan-basic",
    name: "تركيب أساسي",
    price: 0,
    badge: "مجاني",
    durationMonths: 0,
    highlights: ["زيارة فني معتمد وتركيب كامل", "فحص TDS قبل وبعد التركيب", "ضمان التركيب 90 يومًا"],
  },
  {
    id: "plan-care",
    name: "باقة العناية — سنة",
    price: 390,
    badge: "الأكثر اختيارًا",
    durationMonths: 12,
    recommended: true,
    highlights: [
      "كل مزايا التركيب الأساسي",
      "زيارتا صيانة دورية خلال السنة",
      "تغيير شمعات المراحل 1–3 مجانًا",
      "أولوية في مواعيد البلاغات",
    ],
  },
  {
    id: "plan-total",
    name: "باقة شاملة — سنتان",
    price: 690,
    durationMonths: 24,
    highlights: [
      "كل مزايا باقة العناية لمدة سنتين",
      "تغيير الممبرين مرة واحدة مجانًا",
      "زيارات طوارئ غير محدودة",
      "تمديد الضمان إلى 4 سنوات",
    ],
  },
];

/** Consumables and equipment need dispatch/installation rather than a yearly care plan. */
export const sparesServicePlans: ServicePlan[] = [
  {
    id: "plan-self",
    name: "استبدال ذاتي (بدون زيارة)",
    price: 0,
    badge: "بدون رسوم",
    durationMonths: 0,
    highlights: ["دليل مصوّر خطوة بخطوة", "دعم فني عبر واتساب عند الحاجة", "الشرح مجاني بالكامل"],
  },
  {
    id: "plan-visit",
    name: "زيارة فني للاستبدال والفحص",
    price: 149,
    badge: "الأكثر اختيارًا",
    durationMonths: 0,
    recommended: true,
    highlights: ["فني معتمد يستبدل القطع ويفحص النظام", "قياس TDS قبل وبعد", "تنظيف الوحدة وفحص التسريبات"],
  },
  {
    id: "plan-spares-year",
    name: "عقد قطع استهلاكية — سنة",
    price: 490,
    durationMonths: 12,
    highlights: ["طقم شمعات بديل يُشحن في موعده", "زيارة صيانة واحدة", "خصم على الممبرين عند الحاجة"],
  },
];

/** Measuring devices and small accessories ship without any service plan. */
export const noServicePlans: ServicePlan[] = [];

export const seller = {
  id: "slr-rewaa",
  name: "مؤسسة رواء لتقنيات المياه",
  rating: 4.9,
  ordersFulfilled: 36480,
  responseTime: "خلال 30 دقيقة",
  verified: true,
  since: "2015",
} as const;

export function servicePlansForCategory(categorySlug: string, subcategorySlug: string): ServicePlan[] {
  if (categorySlug === "water-filters" || categorySlug === "whole-house" || categorySlug === "desalination" || categorySlug === "dispensers") {
    return systemServicePlans;
  }
  if (categorySlug === "cartridges" || subcategorySlug === "booster-pumps" || subcategorySlug === "pressure-tanks") {
    return sparesServicePlans;
  }
  return noServicePlans;
}
