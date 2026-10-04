import type { NeedSolution } from "@/types/content";

/**
 * "Shop by need" — a marketing entry point that maps a customer problem to a
 * product set. The last option routes to the product finder instead of a list.
 */
export const needs: NeedSolution[] = [
  {
    id: "need-high-salts",
    slug: "high-salts",
    title: "مياه مرتفعة الأملاح",
    problem: "طعم مالح أو غريب، وقراءة TDS مرتفعة عند القياس",
    icon: "droplet",
    guidance:
      "المشكلة في الأملاح الذائبة، والفلتر الميكانيكي لا يخفضها. ابدأ بقياس TDS، وإذا كان الرقم مرتفعًا فالحل نظام تناضح عكسي — أو وحدة تحلية إذا تجاوزت القراءة الحدود المناسبة للأنظمة المنزلية.",
    recommendedSystemTypes: ["ro", "direct-flow"],
    recommendedTags: ["تناضح عكسي", "تحلية"],
    categorySlug: "water-filters",
    relatedGuideSlug: "what-does-tds-mean",
    suggestedServiceSlug: "water-test",
  },
  {
    id: "need-chlorine",
    slug: "chlorine-taste",
    title: "طعم أو رائحة كلور",
    problem: "رائحة واضحة في المياه أو في الشاي والقهوة",
    icon: "sparkles",
    guidance:
      "الكلور يُعالج بمراحل الكربون النشط. نظام كربوني متعدد المراحل كافٍ في أغلب الحالات، ويمكن إضافة نظام RO إذا كانت الأملاح مرتفعة أيضًا.",
    recommendedSystemTypes: ["ro"],
    recommendedTags: ["كربون", "تحسين الطعم"],
    categorySlug: "water-filters",
    relatedGuideSlug: "ro-vs-regular-filter",
  },
  {
    id: "need-sediment",
    slug: "sediment",
    title: "رواسب وصدأ وعوالق",
    problem: "ترسبات على الأكواب أو اصفرار في المياه بعد انقطاع الخدمة",
    icon: "layers",
    guidance:
      "ابدأ بترشيح ميكانيكي دقيق (5 ميكرون) قبل أي مرحلة أخرى. إذا كانت الرواسب على مستوى المبنى كله فالأنسب فلتر مركزي على نقطة الدخول بدل فلتر نقطة واحدة.",
    recommendedSystemTypes: ["whole-house", "ro"],
    recommendedTags: ["رواسب", "فلتر مركزي"],
    categorySlug: "whole-house",
    relatedGuideSlug: "whole-house-vs-under-sink-filter",
    suggestedServiceSlug: "water-test",
  },
  {
    id: "need-kitchen",
    slug: "kitchen-filter",
    title: "فلتر للمطبخ والشرب",
    problem: "أريد مياه شرب نظيفة من حنفية المطبخ",
    icon: "store",
    guidance:
      "هذا هو الاستخدام الأكثر شيوعًا. اختر بين نظام بخزان (اقتصادي وثابت) أو نظام مباشر (بدون انتظار ومساحة أصغر)، حسب الاستهلاك اليومي وتوفر الكهرباء تحت الحوض.",
    recommendedSystemTypes: ["ro", "direct-flow"],
    recommendedTags: ["فلتر مياه", "تحت المغسلة"],
    categorySlug: "water-filters/ro-systems",
    relatedGuideSlug: "how-to-choose-water-filter",
    suggestedServiceSlug: "install",
  },
  {
    id: "need-villa",
    slug: "villa-solution",
    title: "حل للفيلا كاملة",
    problem: "ترسبات وكلس في كل الحنفيات والسخانات",
    icon: "scale",
    guidance:
      "الفيلا تحتاج ترتيب مراحل على نقطة الدخول: رواسب ثم كربون، ثم معالجة العسر إن وُجد. نبدأ بزيارة موقع لقياس معدل التدفق وحجم الاستهلاك وتحديد حجم الحاويات.",
    recommendedSystemTypes: ["whole-house", "softener"],
    recommendedTags: ["فلتر مركزي", "تليين", "فيلا"],
    categorySlug: "whole-house",
    relatedGuideSlug: "whole-house-vs-under-sink-filter",
    suggestedServiceSlug: "book",
  },
  {
    id: "need-restaurant",
    slug: "restaurant-cafe",
    title: "حل للمطعم أو المقهى",
    problem: "استهلاك مرتفع يحتاج تدفقًا ثابتًا وجودة ثابتة",
    icon: "store",
    guidance:
      "المنشآت الغذائية تحتاج مياهًا منخفضة الأملاح لثبات طعم المشروبات وتقليل ترسبات معدات التسخين. الحل غالبًا وحدة تحلية بمعدل إنتاج محسوب مع ترشيح مسبق وعقد صيانة.",
    recommendedSystemTypes: ["ro"],
    recommendedTags: ["تحلية تجارية", "مشاريع"],
    categorySlug: "desalination/commercial-desalination",
    relatedGuideSlug: "how-to-choose-water-filter",
    suggestedServiceSlug: "contracts",
  },
  {
    id: "need-cartridges",
    slug: "cartridge-change",
    title: "أحتاج تغيير شمعات",
    problem: "ضعف في التدفق أو مرور 6 أشهر على آخر استبدال",
    icon: "rotate",
    guidance:
      "حدد المقاس ونوع الخيط أولًا: 10 إنش قياسي أو نحيف أو 12 إنش. الطقم الكامل اقتصادي أكثر، وزيارة الفني مريحة إذا أردنا فحص المضخة والضغط في الوقت نفسه.",
    recommendedSystemTypes: ["cartridge"],
    recommendedTags: ["شمعات", "قطع غيار"],
    categorySlug: "cartridges",
    relatedGuideSlug: "when-to-change-water-filter-cartridges",
    suggestedServiceSlug: "maintenance",
  },
  {
    id: "need-not-sure",
    slug: "not-sure",
    title: "لا أعرف الجهاز المناسب",
    problem: "أحتاج مساعدة في تحديد الخيار الصحيح",
    icon: "search",
    guidance:
      "أجب عن أسئلة قصيرة عن الاستخدام ومصدر المياه والمشكلة الرئيسية، وسنرشح لك خيارات مناسبة مع فروق الأسعار وتكلفة الشمعات السنوية.",
    recommendedSystemTypes: [],
    recommendedTags: [],
    categorySlug: "water-filters",
    relatedGuideSlug: "how-to-choose-water-filter",
    suggestedServiceSlug: "water-test",
  },
];

export function findNeedBySlug(slug: string): NeedSolution | undefined {
  return needs.find((need) => need.slug === slug);
}
