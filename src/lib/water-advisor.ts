/**
 * Water advisor.
 *
 * Turns a short questionnaire (city, water source, TDS reading, number of users,
 * housing type, observed problem, consumption band) into a ranked list of
 * catalogue systems, each with the reasons it was selected.
 *
 * Deliberate limits:
 *  - The advisor performs no laboratory analysis and never states a water
 *    quality result. The TDS value the shopper enters is treated as an
 *    approximate band, and the copy says so.
 *  - Coverage statements come from `serviceAreas` configuration, not from
 *    assumptions, and the advisor never claims a certification or performance
 *    figure the catalogue does not publish.
 */
import { catalogEntries, productSummaries } from "@/data/catalog";
import { serviceAreas } from "@/config/site";
import type { ProductSummary } from "@/types/catalog";

export type Housing = "apartment" | "villa" | "office" | "commercial";
export type Usage = "drinking" | "whole-home" | "kitchen" | "cartridge";
export type Users = "1-2" | "3-5" | "6-plus" | "business";
export type Consumption = "low" | "medium" | "high" | "unknown";
export type Source = "network" | "tank" | "well" | "unknown";
export type TdsBand = "unknown" | "under-300" | "300-600" | "above-600";
export type Problem = "salty" | "taste" | "sediment" | "scale" | "none";

export interface AdvisorAnswers {
  city: string;
  housing: Housing | "";
  usage: Usage | "";
  users: Users | "";
  consumption: Consumption | "";
  source: Source | "";
  tds: TdsBand | "";
  problem: Problem | "";
}

export const EMPTY_ANSWERS: AdvisorAnswers = {
  city: "",
  housing: "",
  usage: "",
  users: "",
  consumption: "",
  source: "",
  tds: "",
  problem: "",
};

export interface AdvisorRecommendation {
  summary: ProductSummary;
  score: number;
  /** Shopper-facing reasons, every one traceable to catalogue/config data. */
  reasons: string[];
  /** Honest limitations for this particular match. */
  cautions: string[];
}

export interface AdvisorResult {
  recommendations: AdvisorRecommendation[];
  /** Service coverage sentence built from configuration. */
  coverage: { covered: boolean; label: string };
  /** Global notes about what the advisor can and cannot say. */
  notes: string[];
}

export const CITY_OPTIONS = [...serviceAreas.cities];

const TDS_LABEL: Record<Exclude<TdsBand, "unknown">, string> = {
  "under-300": "أقل من 300 ملجم/لتر",
  "300-600": "300 – 600 ملجم/لتر",
  "above-600": "أعلى من 600 ملجم/لتر",
};

const USERS_NUMBER: Record<Exclude<Users, "business">, number> = {
  "1-2": 2,
  "3-5": 5,
  "6-plus": 8,
};

const CONSUMPTION_LABEL: Record<Consumption, string> = {
  low: "أقل من 10 لترات يوميًا",
  medium: "10 – 30 لترًا يوميًا",
  high: "أكثر من 30 لترًا يوميًا",
  unknown: "غير محدّد",
};

function isSystem(summary: ProductSummary): boolean {
  return ["water-filters", "whole-house", "desalination", "pumps-equipment"].includes(summary.categorySlug);
}

function typeOf(summary: ProductSummary): string {
  const value = summary.attributes?.systemType;
  return typeof value === "string" ? value : "";
}

function flowRate(summary: ProductSummary): number {
  const value = summary.attributes?.flowRateGpd;
  return typeof value === "number" ? value : 0;
}

function stages(summary: ProductSummary): number {
  const value = summary.attributes?.stages;
  return typeof value === "number" ? value : 0;
}

function coverageFor(city: string): AdvisorResult["coverage"] {
  if (!city) {
    return {
      covered: false,
      label: `${serviceAreas.note} اختر مدينتك لنوضّح إن كانت فرق التركيب تصل إليها.`,
    };
  }
  const covered = serviceAreas.cities.some((entry) => entry.trim() === city.trim());
  return covered
    ? { covered: true, label: `${city} ضمن المدن التي تصلها فرق التركيب المعلنة — الموعد النهائي يُؤكَّد عند الحجز.` }
    : { covered: false, label: `${serviceAreas.note} يمكنك طلب عرض سعر مع خدمة الفيديو التفاعلية.` };
}

export function advise(answers: AdvisorAnswers): AdvisorResult {
  // Without the core question answered there is nothing to rank — returning an
  // empty list is better than recommending whatever happens to be in stock.
  if (!answers.usage) {
    return {
      recommendations: [],
      coverage: coverageFor(answers.city),
      notes: ["أجب عن الغرض الأساسي من الاستخدام لعرض ترشيح حقيقي."],
    };
  }

  const pool = answers.usage === "cartridge"
    ? catalogEntries.filter((entry) => entry.summary.categorySlug === "cartridges").map((entry) => entry.summary)
    : productSummaries.filter(isSystem);

  const scored = pool
    .map((summary) => {
      const reasons: string[] = [];
      const cautions: string[] = [];
      let score = 0;
      const type = typeOf(summary);
      const gpd = flowRate(summary);

      /* ------------------------------ Usage ------------------------------ */
      if (answers.usage === "drinking") {
        if (type === "ro" || type === "direct-flow") {
          score += 6;
          reasons.push("نظام تناضح عكسي/مباشر — النوع المناسب لمياه الشرب والطبخ حسب تصنيف المنتج.");
        }
        if (summary.categorySlug === "water-filters") score += 3;
      }
      if (answers.usage === "whole-home") {
        if (summary.categorySlug === "whole-house" || type === "whole-house") {
          score += 9;
          reasons.push("نظام مركزي يغطي نقاط المياه في المنزل حسب تصنيف الكتالوج.");
        }
      }
      if (answers.usage === "kitchen") {
        if (summary.subcategorySlug === "under-sink" || summary.subcategorySlug === "countertop") {
          score += 7;
          reasons.push("تركيب تحت المغسلة أو على الطاولة — مناسب لحل مقتصر على المطبخ.");
        }
      }
      if (answers.usage === "cartridge") {
        if (summary.categorySlug === "cartridges") {
          score += 8;
          const months = summary.attributes?.replacementMonths;
          reasons.push(
            typeof months === "number"
              ? `قطعة استبدال بدورة معلنة كل ${months} شهرًا.`
              : "قطعة استبدال من تصنيف الشمعات وقطع الغيار."
          );
        }
      }

      /* ------------------------------ Housing ---------------------------- */
      if (answers.housing === "apartment" && (summary.subcategorySlug === "under-sink" || summary.subcategorySlug === "countertop")) {
        score += 3;
        reasons.push("مقاس مناسب للشقق حسب فئة المنتج (تحت المغسلة/على الطاولة).");
      }
      if (answers.housing === "villa" && (summary.categorySlug === "whole-house" || gpd >= 150)) {
        score += 3;
        reasons.push("سعة أعلى تناسب الفيلات ومتعددة نقاط الاستخدام.");
      }
      if (answers.housing === "office" && (summary.attributes?.usage === "home" || summary.attributes?.usage === "both")) {
        score += 2;
      }
      if (answers.housing === "commercial") {
        if (summary.attributes?.usage === "commercial" || summary.attributes?.usage === "both") {
          score += 4;
          reasons.push("مصنّف للاستخدام التجاري في بيانات المنتج.");
        }
        if (summary.categorySlug === "desalination") {
          score += 5;
          reasons.push("وحدة تحلية للاستهلاك الأعلى حسب فئة الكتالوج.");
        }
        if (summary.categorySlug === "pumps-equipment") score += 2;
      }

      /* ------------------------------- Users ----------------------------- */
      if (answers.users && answers.users !== "business") {
        const people = USERS_NUMBER[answers.users];
        if (gpd >= 75 && people <= 5) {
          score += 3;
          reasons.push(`معدل التدفق المعلن ${gpd} جالون/يوم يغطي ${people} أشخاص حسب أرقام المنتج.`);
        }
        if (gpd >= 200 && people >= 6) {
          score += 4;
          reasons.push(`تدفق ${gpd} جالون/يوم يناسب الأسر الأكبر.`);
        }
        if (people >= 6 && gpd > 0 && gpd < 75) {
          score -= 2;
          cautions.push(`تدفق ${gpd} جالون/يوم أقل من المتوقع لـ ${people} أشخاص — راجع الاحتياج مع الفني.`);
        }
      }
      if (answers.users === "business") {
        if (summary.attributes?.usage === "commercial" || gpd >= 400) {
          score += 5;
          reasons.push("سعة/تصنيف تجاري في بيانات المنتج.");
        }
      }

      /* ---------------------------- Consumption --------------------------- */
      if (answers.consumption === "high") {
        if (summary.attributes?.hasTank || gpd >= 200) {
          score += 3;
          reasons.push("يحتوي خزانًا أو تدفقًا أعلى — مناسب للاستهلاك المرتفع.");
        }
        if (summary.subcategorySlug === "countertop") {
          score -= 2;
          cautions.push("الأجهزة الصغيرة على الطاولة قد لا تكفي استهلاكًا مرتفعًا يوميًا.");
        }
      }
      if (answers.consumption === "low" && summary.subcategorySlug === "countertop") {
        score += 2;
        reasons.push("جهاز صغير الحجم يناسب الاستهلاك المحدود.");
      }

      /* ------------------------------ Source ----------------------------- */
      if (answers.source === "well") {
        if (summary.categorySlug === "testing") score += 1;
        if (type === "ro") {
          score += 2;
          reasons.push("مصدر خاص (بئر) يرفع أهمية نظام تناضح عكسي مع متابعة القياس.");
        }
        cautions.push("مصادر الآبار تختلف كثيرًا بين المواقع — يُنصح بقياس مبدئي قبل تحديد النظام.");
      }
      if (answers.source === "tank") {
        if (summary.attributes?.stages && stages(summary) >= 3) {
          score += 1;
          reasons.push("مراحل ترشيح متعددة مناسبة للمياه المخزّنة في الخزانات.");
        }
      }

      /* -------------------------------- TDS ------------------------------ */
      if (answers.tds === "under-300" && type === "ro") {
        score += 2;
        reasons.push("قراءة الأملاح التي أدخلتها في النطاق المنخفض — نظام RO بعدد مراحل قياسي يحتويها.");
      }
      if (answers.tds === "300-600") {
        if (type === "ro" && summary.attributes?.hasPump) {
          score += 4;
          reasons.push("مضخة تعزيز موجودة — أنسب للنطاق المتوسط من الأملاح حسب مواصفة المنتج.");
        } else if (type === "ro") {
          score += 2;
          cautions.push("النطاق المتوسط قد يحتاج متابعة أقرب للشمعات والغشاء.");
        }
      }
      if (answers.tds === "above-600") {
        if (summary.categorySlug === "desalination") {
          score += 7;
          reasons.push("وحدة تحلية — الفئة المناسبة للقراءات المرتفعة في الكتالوج.");
        } else if (type === "ro") {
          score += 3;
          reasons.push("نظام RO — نطاق يعتمد على الغشاء والمضخة حسب مواصفة المنتج.");
        }
        cautions.push("لا نقدّم تحليلًا مخبريًا ولا نحدّد رقمًا نهائيًا للأملاح؛ يُنصح بفحص مياه للتأكد من الاحتياج.");
      }

      /* ------------------------------ Problem ---------------------------- */
      if (answers.problem === "salty") {
        if (type === "ro") {
          score += 5;
          reasons.push("طعم مالح مؤشر شائع على أملاح ذائبة — وهو اختصاص أنظمة التناضح العكسي.");
        }
        if (summary.categorySlug === "desalination") score += 3;
      }
      if (answers.problem === "taste") {
        if (stages(summary) >= 3 || type === "direct-flow" || summary.subcategorySlug === "post-filters") {
          score += 3;
          reasons.push("مراحل كربونية/ما بعد المعالجة مرتبطة بتحسين الطعم والرائحة.");
        }
      }
      if (answers.problem === "sediment" && (summary.categorySlug === "whole-house" || summary.tags.includes("شمعات"))) {
        score += 3;
        reasons.push("فلاتر ميكرونية/مركزية تتعامل مع العوالق والرواسب.");
      }
      if (answers.problem === "scale") {
        if (summary.categorySlug === "desalination") {
          score += 4;
          reasons.push("التحلية تقلل الأملاح المكوّنة للترسبات حسب فئة المنتج.");
        }
        cautions.push("الترسبات الكلسية تحتاج قياس عسر المياه لتحديد النظام بدقة.");
      }

      /* ---------------------------- Availability -------------------------- */
      if (summary.stockStatus === "out_of_stock") {
        cautions.push("غير متوفر حاليًا — يظهر للمقارنة فقط.");
      } else if (summary.stockStatus === "in_stock") {
        score += 1;
        reasons.push("متوفر للشحن الآن.");
      }

      return { summary, score, reasons, cautions: Array.from(new Set(cautions)) };
    })
    // A single availability bonus must never be enough to call something a match.
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.score - a.score || b.summary.rating - a.summary.rating)
    .slice(0, 4);

  const notes: string[] = [
    "الترشيح إرشادي ومبني على تصنيفات الكتالوج وإجاباتك، وليس تحليلًا مخبريًا للمياه.",
    "لم نتحقق من القراءات التي أدخلتها ولم نعمل أي قياس ميداني — يمكن للفني تأكيد الاحتياج عند الزيارة.",
  ];
  if (answers.tds && answers.tds !== "unknown") {
    notes.push(`قراءة TDS المُدخلة: ${TDS_LABEL[answers.tds as Exclude<TdsBand, "unknown">]} (تقديرية).`);
  }
  if (answers.consumption) {
    notes.push(`معدل الاستهلاك المُدخل: ${CONSUMPTION_LABEL[answers.consumption]}.`);
  }

  return { recommendations: scored, coverage: coverageFor(answers.city), notes };
}

/** Human label helpers shared by the page and analytics. */
export const advisorLabels = {
  housing: (value: string) =>
    ({ apartment: "شقة", villa: "فيلا", office: "مكتب", commercial: "منشأة تجارية" })[value] ?? "—",
  usage: (value: string) =>
    ({ drinking: "مياه شرب وطبخ", "whole-home": "المنزل بالكامل", kitchen: "حل للمطبخ", cartridge: "قطع فقط" })[value] ?? "—",
  users: (value: string) =>
    ({ "1-2": "شخص أو شخصان", "3-5": "3 – 5 أشخاص", "6-plus": "6 أشخاص وأكثر", business: "استهلاك تجاري" })[value] ?? "—",
  consumption: (value: string) => CONSUMPTION_LABEL[value as Consumption] ?? "—",
  source: (value: string) =>
    ({ network: "شبكة المياه", tank: "خزان", well: "بئر أو مصدر خاص", unknown: "غير محدد" })[value] ?? "—",
  tds: (value: string) => (value in TDS_LABEL ? TDS_LABEL[value as Exclude<TdsBand, "unknown">] : "غير محدد"),
  problem: (value: string) =>
    ({ salty: "طعم مالح أو أملاح مرتفعة", taste: "طعم أو رائحة", sediment: "رواسب أو لون", scale: "ترسبات كلسية", none: "لا شيء محدد" })[
      value
    ] ?? "—",
};

export const USERS_OPTIONS: { id: Users; label: string; description: string }[] = [
  { id: "1-2", label: "شخص أو شخصان", description: "استهلاك شرب محدود يوميًا" },
  { id: "3-5", label: "3 – 5 أشخاص", description: "الأنظمة المنزلية القياسية تكفي" },
  { id: "6-plus", label: "6 أشخاص وأكثر", description: "يفضل سعة أعلى أو خزان أكبر" },
  { id: "business", label: "استهلاك تجاري", description: "منشأة أو أكثر من 300 لتر يوميًا" },
];

export const CONSUMPTION_OPTIONS: { id: Consumption; label: string; description: string }[] = [
  { id: "low", label: "أقل من 10 لترات يوميًا", description: "شرب وطبخ فقط" },
  { id: "medium", label: "10 – 30 لترًا يوميًا", description: "أسرة متوسطة" },
  { id: "high", label: "أكثر من 30 لترًا يوميًا", description: "استهلاك مرتفع أو تجاري" },
  { id: "unknown", label: "لا أعرف", description: "سنعتمد على عدد المستخدمين" },
];

export const TDS_OPTIONS: { id: TdsBand; label: string; description: string }[] = [
  { id: "unknown", label: "لا أعرف القراءة", description: "يمكنك قياسها لاحقًا أو حجز زيارة فحص" },
  { id: "under-300", label: "أقل من 300", description: "نطاق منخفض نسبيًا" },
  { id: "300-600", label: "300 – 600", description: "نطاق متوسط" },
  { id: "above-600", label: "أعلى من 600", description: "نطاق مرتفع يستحق مراجعة" },
];

export const PROBLEM_OPTIONS: { id: Problem; label: string; description: string }[] = [
  { id: "salty", label: "طعم مالح أو أملاح مرتفعة", description: "مؤشر على أملاح ذائبة" },
  { id: "taste", label: "طعم أو رائحة غير معتادة", description: "قد يرتبط بالكلور أو التخزين" },
  { id: "sediment", label: "رواسب أو تغيّر لون", description: "شوائب عالقة" },
  { id: "scale", label: "ترسبات كلسية على الأجهزة", description: "عسر مياه مرتفع محتمل" },
  { id: "none", label: "لا شيء محدد", description: "أريد تحسينًا وقائيًا" },
];

export const SOURCE_OPTIONS: { id: Source; label: string; description: string }[] = [
  { id: "network", label: "شبكة المياه", description: "المصدر المعتاد في المدن" },
  { id: "tank", label: "خزان أرضي/علوي", description: "مياه مخزّنة قبل الاستخدام" },
  { id: "well", label: "بئر أو مصدر خاص", description: "يستحق قياسًا مبدئيًا" },
  { id: "unknown", label: "لا أعرف", description: "سنسألك الفني عند الزيارة" },
];
