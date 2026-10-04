import type { Offer } from "@/types/content";

const now = Date.now();
const hours = (h: number) => new Date(now + h * 3_600_000).toISOString();
const days = (d: number) => new Date(now + d * 86_400_000).toISOString();

/**
 * Current promotions. Offers that already finished are kept intentionally so
 * the UI can render the "expired offer" state, and only offers with a real
 * `endsAt` display a countdown.
 */
export const offers: Offer[] = [
  {
    id: "offer-ro7",
    type: "product",
    title: "خصم 24% على نظام رواء برو RO-7",
    subtitle: "العرض الأكثر طلبًا هذا الشهر",
    description:
      "نظام تنقية بسبع مراحل مع تركيب بفني معتمد وتقرير قياس TDS قبل وبعد التركيب. العرض يشمل جهاز قياس TDS رقمي كهدية.",
    badge: "ينتهي قريبًا",
    code: "REWAA100",
    startsAt: hours(-96),
    endsAt: hours(29),
    savingsLabel: "وفّر 400 ر.س",
    terms: [
      "يسري على الطرازات المتوفرة من النظام فقط",
      "التركيب داخل نطاق المدن المخدومة",
      "الكوبون الإضافي يعمل للطلبات فوق 900 ر.س",
    ],
    productSlugs: ["water-filters/rewaa-pro-ro7"],
    href: "/p/water-filters/rewaa-pro-ro7",
    ctaLabel: "تسوّق العرض",
    tone: "danger",
  },
  {
    id: "offer-spares-bundle",
    type: "bundle",
    title: "باقة الصيانة الذاتية: طقم شمعات + فلتر T33",
    subtitle: "اطلب القطع معًا بسعر أقل",
    description:
      "اجمع طقم الشمعات ثلاثية المراحل مع فلتر ما بعد المعالجة في طلب واحد، مع دليل استبدال مصوّر يصلك برسالة.",
    badge: "وفّر 60 ر.س",
    startsAt: days(-10),
    endsAt: days(12),
    savingsLabel: "وفّر 60 ر.س",
    terms: ["لا يشمل زيارة الفني", "الكمية محدودة لكل عميل", "يظهر الخصم تلقائيًا في السلة"],
    bundleItems: [
      { label: "طقم شمعات 3 مراحل", slug: "cartridges/cartridge-set-3" },
      { label: "فلتر ما بعد التنقية T33", slug: "cartridges/post-filter-t33" },
      { label: "شمعة رواسب 5 ميكرون (احتياطية)", slug: "cartridges/sediment-cartridge-5micron" },
    ],
    href: "/c/cartridges/cartridge-sets",
    ctaLabel: "اطلب الباقة",
    tone: "aqua",
  },
  {
    id: "offer-install",
    type: "installation",
    title: "تركيب بدون رسوم للأنظمة المؤهلة",
    subtitle: "داخل الرياض وجدة والدمام",
    description:
      "اطلب أي نظام تنقية مؤهل واحصل على تركيب أساسي بفني معتمد دون رسوم، مع قياس TDS قبل وبعد التركيب وتقرير موثق.",
    badge: "تركيب مجاني",
    startsAt: days(-30),
    endsAt: days(30),
    savingsLabel: "قيمة التركيب 249 ر.س",
    terms: ["يسري على الأنظمة المؤهلة داخل المدن المخدومة", "خارج المدن المخدومة تُحتسب رسوم انتقال", "لا يشمل أعمال السباكة الخارجية"],
    productSlugs: ["water-filters/rewaa-pro-ro7", "water-filters/rewaa-flow-600", "whole-house/central-filter-20"],
    href: "/c/water-filters",
    ctaLabel: "تصفّح الأنظمة المؤهلة",
    tone: "brand",
  },
  {
    id: "offer-care-plan",
    type: "maintenance",
    title: "باقة العناية السنوية بخصم 100 ر.س",
    subtitle: "الشمعات والمواعيد على عاتقنا",
    description:
      "زيارتان دوريتان، تغيير شمعات المراحل مرتين سنويًا، أولوية في البلاغات، وتقرير صيانة بعد كل زيارة.",
    badge: "الأكثر اختيارًا",
    startsAt: days(-20),
    endsAt: days(21),
    savingsLabel: "بدلًا من 790 ر.س",
    terms: ["تُفعّل على نظام واحد", "تُسجّل الزيارات بعد التركيب مباشرة", "الأسعار تشمل ضريبة القيمة المضافة"],
    href: "/services/contracts",
    ctaLabel: "اعرف تفاصيل الباقة",
    tone: "flow",
  },
  {
    id: "offer-water-test",
    type: "maintenance",
    title: "فحص مياه بـ 99 ر.س بدلًا من 149 ر.س",
    subtitle: "اعرف مياهك قبل أن تشتري",
    description:
      "زيارة قصيرة لقياس TDS والعسر ودرجة الحموضة والكلور، مع تقرير مبسّط وترشيح للحل المناسب دون أي إلزام بالشراء.",
    code: "WATER99",
    startsAt: days(-7),
    endsAt: days(14),
    savingsLabel: "وفّر 50 ر.س",
    terms: ["داخل المدن المخدومة", "يُخصم قيمة الفحص عند ترقية الطلب لنظام مع تركيب", "الكود يُدخل عند حجز الخدمة"],
    href: "/services/water-test",
    ctaLabel: "احجز الفحص",
    tone: "aqua",
  },
  {
    id: "offer-coupon-100",
    type: "coupon",
    title: "كوبون REWAA100 — خصم 100 ر.س",
    subtitle: "للطلبات فوق 900 ر.س",
    description: "استخدم الكود عند إتمام الطلب على أي منتج من المتجر، ويُطبَّق مباشرة بعد باقي الخصومات.",
    code: "REWAA100",
    startsAt: days(-60),
    endsAt: days(45),
    savingsLabel: "خصم 100 ر.س",
    terms: ["مرة واحدة لكل عميل", "الحد الأدنى لقيمة الطلب 900 ر.س", "لا يشمل الخدمات"],
    href: "/c/water-filters",
    ctaLabel: "تسوّق واستخدم الكوبون",
    tone: "brand",
  },
  {
    id: "offer-softener",
    type: "product",
    title: "خصم على أجهزة تليين المياه",
    subtitle: "للبيوت التي تعاني من الكلس",
    description:
      "خصم مباشر على جهازي التليين بحاوية 1 و2 قدم، مع تركيب وضبط أولي لدورات التجديد حسب استهلاك المنزل.",
    badge: "خصم حتى 16%",
    startsAt: days(-14),
    endsAt: days(9),
    savingsLabel: "وفّر حتى 560 ر.س",
    terms: ["يشمل الطرازين المتوفرين فقط", " التركيب والضبط الأولي مشمولان", "لا يشمل أعمال السباكة الخارجية"],
    productSlugs: ["whole-house/water-softener-2ft", "whole-house/water-softener-1ft"],
    href: "/c/whole-house/softeners",
    ctaLabel: "تصفّح أجهزة التليين",
    tone: "flow",
  },
  {
    id: "offer-national-day-expired",
    type: "seasonal",
    title: "عرض اليوم الوطني — انتهى",
    subtitle: "عرض موسمي سابق",
    description: "خصم موسمي على مجموعة مختارة من الأنظمة والقطع، وقد انتهى بانتهاء المدة المحددة.",
    startsAt: days(-40),
    endsAt: days(-12),
    terms: ["انتهت صلاحية العرض", "لا يمكن تطبيق الخصم بعد تاريخ الانتهاء"],
    href: "/offers",
    ctaLabel: "تصفّح العروض الحالية",
    tone: "brand",
  },
];

export const offerTypeLabels: Record<Offer["type"], string> = {
  product: "خصم منتجات",
  bundle: "باقات",
  installation: "عروض التركيب",
  maintenance: "الصيانة والعقود",
  coupon: "كوبونات",
  seasonal: "عروض موسمية",
};

export function isOfferLive(offer: Offer, at: number = Date.now()): boolean {
  const start = new Date(offer.startsAt).getTime();
  const end = offer.endsAt ? new Date(offer.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return at >= start && at <= end;
}

export function isOfferExpired(offer: Offer, at: number = Date.now()): boolean {
  return Boolean(offer.endsAt && new Date(offer.endsAt!).getTime() < at);
}

/** Coupon codes surfaced by the offers page and reused by the cart logic. */
export const offerCoupons = offers.filter((offer) => offer.code).map((offer) => offer.code!);
