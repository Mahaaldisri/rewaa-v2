/**
 * Single source of truth for business information.
 *
 * ⚠️ PLACEHOLDER VALUES — the entries flagged below must be replaced with the
 * real registered data before launch. Nothing in this file claims a licence,
 * certification, partnership or coverage that has not been confirmed.
 */

export const PLACEHOLDER_FLAG = "PLACEHOLDER — يُستبدل بالبيانات الرسمية قبل الإطلاق";

export const brand = {
  name: "رواء",
  nameEn: "REWAA",
  tagline: "حلول مياه نقية للمنازل والمنشآت",
  description:
    "رواء متجر سعودي متخصص في أجهزة تنقية وتحلية المياه، الشمعات وقطع الغيار، أنظمة الفلترة المركزية، خدمات التركيب والصيانة.",
  logo: "/images/logo.svg",
  foundedYear: 2019, // PLACEHOLDER
} as const;

export const contact = {
  /** PLACEHOLDER — الرقم الموحد الرسمي */
  phone: "920001234",
  phoneDisplay: "920001234",
  /** PLACEHOLDER — رقم واتساب خدمة العملاء */
  whatsapp: "966551234567",
  whatsappDisplay: "0551234567",
  email: "care@rewaa.sa",
  commercialEmail: "business@rewaa.sa",
  supportHours: "الأحد – الخميس: 9 ص – 6 م · الجمعة والسبت: 10 ص – 4 م",
  addressLine: "طريق الملك عبدالله، حي الملقا", // PLACEHOLDER
  city: "الرياض",
  region: "منطقة الرياض",
  country: "المملكة العربية السعودية",
  countryCode: "SA",
} as const;

/** PLACEHOLDER — السجل التجاري والرقم الضريبي */
export const legal = {
  /** تاريخ آخر تحديث للسياسات — يُحدَّث عند أي تعديل قانوني */
  policyUpdatedAt: "2026-01-15",
  crNumber: "1010XXXXXX",
  vatNumber: "3000XXXXXXXXXX",
  vatPercent: 15,
  currency: "SAR",
  currencyLabel: "ر.س",
} as const;

export const shipping = {
  freeShippingThreshold: 500,
  flatRate: 29,
  expressRate: 59,
  sameDayRate: 99,
  returnWindowDays: 14,
  note: "التوصيل مجاني للطلبات التي تتجاوز 500 ر.س داخل المملكة.",
} as const;

export const serviceAreas = {
  /** المدن التي تصلها فرق التركيب حاليًا (تُدار من الفرع الأقرب). */
  cities: [
    "الرياض",
    "الدرعية",
    "جدة",
    "مكة المكرمة",
    "الطائف",
    "الدمام",
    "الخبر",
    "الظهران",
    "الجبيل",
    "الأحساء",
    "بريدة",
    "عنيزة",
    "المدينة المنورة",
    "أبها",
    "تبوك",
  ],
  note: "خارج هذه المدن نخدمك عبر الشحن وخدمة الفيديو التفاعلية.",
  /**
   * رسوم زيارة الفني — أرقام أولية قابلة للتعديل من الإدارة، وتُعرض في الواجهة
   * بوصفها «تقديرية» فقط عند تفعيل بيانات العرض. في الإنتاج تأتي الرسوم من
   * خدمة التوفر (API) ولا يُعرض رقم من هذا الملف.
   */
  estimatedFees: {
    installation: 149,
    maintenanceVisit: 99,
    waterTestVisit: 79,
    freeInstallationThreshold: 800,
  },
  /** أوقات الزيارة المتاحة — تُستخدم لبناء مواعيد عرض في وضع البيانات التجريبية فقط. */
  visitWindows: ["9:00 ص – 12:00 م", "12:00 م – 3:00 م", "3:00 م – 6:00 م"],
} as const;

export const businessHours = [
  { day: "الأحد – الخميس", hours: "9:00 ص – 6:00 م" },
  { day: "الجمعة", hours: "10:00 ص – 4:00 م" },
  { day: "السبت", hours: "10:00 ص – 4:00 م" },
] as const;

export const social = {
  instagram: "https://instagram.com/rewaa.sa",
  x: "https://x.com/rewaa_sa",
  tiktok: "https://tiktok.com/@rewaa.sa",
  youtube: "https://youtube.com/@rewaa.sa",
  snapchat: "https://snapchat.com/add/rewaa.sa",
} as const;

export const seo = {
  siteUrl: "https://rewaa.sa",
  defaultTitle: "رواء | أجهزة تنقية وتحلية المياه في السعودية",
  defaultDescription:
    "تسوّق أجهزة تنقية المياه المنزلية، الفلاتر المركزية، الشمعات وقطع الغيار، مع تركيب وصيانة من فرق رواء الفنية داخل المملكة.",
  locale: "ar_SA",
  twitterHandle: "@rewaa_sa",
} as const;

export const features = {
  /** أقصى عدد منتجات يمكن مقارنتها في الوقت نفسه */
  compareLimit: 4,
  recentlyViewedLimit: 10,
  searchHistoryLimit: 6,
  /** الرقم التقريبي لأيام الاحتفاظ بمحتويات السلة على الجهاز */
  cartRetentionDays: 30,
} as const;

/** يبني رابط واتساب مع رسالة بادئة جاهزة. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${contact.whatsapp}`;
  const text = message?.trim() || `مرحبًا ${brand.name}، أريد الاستفسار عن`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${contact.email}?${params.toString()}`;
}

export function telLink(): string {
  return `tel:+966${contact.phone.replace(/^0/, "")}`;
}

/* ------------------------------------------------------------------ */
/* Official (registered) business data                                 */
/* ------------------------------------------------------------------ */

/**
 * Machine-readable view of the fields that MUST hold official, verifiable
 * values before launch. The storefront uses it at runtime to warn, and
 * `scripts/validate-config.mjs` uses it to fail a production build when asked.
 *
 * To publish real data: replace the value in the structure above and flip the
 * matching `placeholder` flag to `false`. Nothing else has to change.
 */
export interface OfficialField {
  key: string;
  label: string;
  value: string | number;
  /** true while the value is still sample data that must not reach customers. */
  placeholder: boolean;
}

export const officialFields: OfficialField[] = [
  { key: "contact.phone", label: "الرقم الموحد", value: contact.phone, placeholder: true },
  { key: "contact.whatsapp", label: "رقم واتساب خدمة العملاء", value: contact.whatsapp, placeholder: true },
  { key: "contact.email", label: "البريد الرسمي", value: contact.email, placeholder: false },
  { key: "contact.addressLine", label: "العنوان الوطني", value: contact.addressLine, placeholder: true },
  { key: "legal.crNumber", label: "السجل التجاري", value: legal.crNumber, placeholder: true },
  { key: "legal.vatNumber", label: "الرقم الضريبي", value: legal.vatNumber, placeholder: true },
  { key: "brand.foundedYear", label: "سنة التأسيس", value: brand.foundedYear, placeholder: true },
  { key: "social.instagram", label: "حساب إنستغرام", value: social.instagram, placeholder: true },
  { key: "social.x", label: "حساب منصة X", value: social.x, placeholder: true },
  { key: "social.tiktok", label: "حساب تيك توك", value: social.tiktok, placeholder: true },
  { key: "social.youtube", label: "قناة يوتيوب", value: social.youtube, placeholder: true },
  { key: "social.snapchat", label: "حساب سناب شات", value: social.snapchat, placeholder: true },
];

/** How many official fields still carry sample data. */
export const pendingOfficialFields = officialFields.filter((field) => field.placeholder);

export function hasPendingOfficialData(): boolean {
  return pendingOfficialFields.length > 0;
}
