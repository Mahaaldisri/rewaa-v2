/**
 * أسئلة البداية المقترحة — تُبنى من المسار الحالي حتى يبدأ العميل من سياقه،
 * وبحد أقصى ٤ اقتراحات (لا نُغرق الواجهة ولا نضغط للشراء).
 */
import type { AiPageContext } from "@/types/ai";

export interface AiStarter {
  label: string;
  /** نص يُرسَل كما هو — أو إجراء يفتح صفحة موجودة. */
  send: string;
}

const GENERIC: AiStarter[] = [
  { label: "ما الفرق بين أنظمة التناضح العكسي؟", send: "ما الفرق بين أنظمة التناضح العكسي المتوفرة عندكم؟" },
  { label: "أبحث عن فلتر يناسب عائلتي", send: "عندي عائلة من 5 أفراد وميزانيتي محدودة، أي فلتر يناسبني؟" },
  { label: "كم أوفّر مقابل مياه القوارير؟", send: "كم يمكن أن أوفّر شهريًا إذا استبدلت مياه القوارير بجهاز من عندكم؟" },
  { label: "أحتاج تركيب أو صيانة", send: "أحتاج خدمة تركيب أو صيانة، ما الخطوات؟" },
];

const BY_PREFIX: { test: (path: string) => boolean; starters: AiStarter[] }[] = [
  {
    test: (path) => path.startsWith("/p/"),
    starters: [
      { label: "هل يناسب احتياجي؟", send: "هل هذا المنتج يناسب احتياج عائلتي؟" },
      { label: "ما القطع البديلة له؟", send: "ما القطع الاستهلاكية والبديلة لهذا المنتج؟" },
      { label: "مقارنته مع بديل", send: "قارن لي هذا المنتج مع بديل قريب منه." },
      { label: "التوصيل والتركيب", send: "ما مدة التوصيل وهل يتوفر تركيب لهذا المنتج؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/c/") || path === "/offers" || path === "/search",
    starters: [
      { label: "ساعدني في الاختيار", send: "ساعدني أختار من هذه القائمة حسب الاحتياج والميزانية." },
      { label: "الأفضل تقييمًا", send: "اعرض لي الأعلى تقييمًا في هذه الفئة." },
      { label: "الأقل سعرًا", send: "اعرض لي الأقل سعرًا ضمن هذه الفئة." },
      { label: "ما المتوفر فقط؟", send: "اعرض لي المنتجات المتوفرة فقط حاليًا." },
    ],
  },
  {
    test: (path) => path.startsWith("/compare"),
    starters: [
      { label: "أي فرق يستحق؟", send: "ما الفرق العملي بين المنتجات التي أقارنها؟" },
      { label: "أيهما أوفر؟", send: "أيهما أوفر على المدى الطويل من ناحية القطع والصيانة؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/calculator"),
    starters: [
      { label: "اشرح النتيجة", send: "اشرح لي نتيجة الحاسبة باختصار وكيف تُحسب." },
      { label: "أي جهاز يحقق التوفير؟", send: "أي جهاز يساعدني على تحقيق هذا التوفير؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/product-finder"),
    starters: [
      { label: "ابدأ التشخيص", send: "أحتاج مساعدة في اختيار الفلتر المناسب لمياهنا." },
      { label: "الفرق بين الأنظمة", send: "ما الفرق بين نظام التناضح العكسي والفلتر الميكانيكي؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/compatibility"),
    starters: [
      { label: "هل هذه القطعة تناسب جهازي؟", send: "أريد التأكد أن قطعة تناسب جهازي، كيف أتحقق؟" },
      { label: "رقم الموديل", send: "عندي رقم موديل وأريد القطع المناسبة له." },
    ],
  },
  {
    test: (path) => path.startsWith("/services"),
    starters: [
      { label: "هل تخدمون مدينتي؟", send: "هل تخدمون مدينتي؟ أريد خدمة تركيب." },
      { label: "مواعيد الصيانة", send: "متى موعد تغيير القطع لجهازي؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/account") || path.startsWith("/order"),
    starters: [
      { label: "أين طلبي؟", send: "أين وصل طلبي الأخير؟" },
      { label: "حالة الضمان", send: "ما حالة ضمان الجهاز المسجل لدي؟" },
      { label: "الصيانة القادمة", send: "متى موعد الصيانة القادمة لأجهزتي؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/help"),
    starters: [
      { label: "سياسة الاسترجاع", send: "ما سياسة الاسترجاع؟" },
      { label: "فترة الضمان", send: "كم فترة الضمان على الأجهزة؟" },
      { label: "الدفع عند الاستلام", send: "ما طرق الدفع المتاحة؟" },
    ],
  },
  {
    test: (path) => path.startsWith("/cart") || path.startsWith("/checkout"),
    starters: [
      { label: "الشحن والتوصيل", send: "كم تستغرق مدة التوصيل وكم رسوم الشحن؟" },
      { label: "طرق الدفع", send: "ما طرق الدفع المتاحة؟" },
      { label: "هل أحتاج تركيب؟", send: "هل أحتاج تركيبًا احترافيًا لجهازي؟" },
    ],
  },
];

export function startersFor(path: string, _context?: AiPageContext): AiStarter[] {
  const matched = BY_PREFIX.find((entry) => entry.test(path));
  const list = matched ? matched.starters : GENERIC;
  return list.slice(0, 4);
}
