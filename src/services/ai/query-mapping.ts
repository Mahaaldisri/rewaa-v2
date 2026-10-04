/**
 * تحويل كلام العميل الطبيعي إلى فلاتر كتالوج منظّمة.
 *
 * هذا هو الفرق بين «روبوت أسئلة شائعة» ومساعد حقيقي: العميل يكتب «أبغى فلتر
 * تحت المغسلة أقل من ألف وتقييمه عالي» فيتحوّل الطلب إلى `CatalogQuery`
 * (نفس الفلاتر التي تستخدمها صفحة الفئة) — بلا تخمين أسعار أو مخزون.
 *
 * المخرجات مبنية من نفس نموذج الفلاتر المستخدم في `CatalogFilters` و`filter-model`،
 * فلا توجد فلاتر مكرّرة أو متباعدة.
 */
import type { CatalogQuery, SortKey } from "@/types/catalog";

export interface MappedQuery {
  query: CatalogQuery;
  /** وصف عربي لما تم تطبيقه — يُعرض للعميل للشفافية. */
  applied: string[];
  /** ما فهمناه ولم نستطع تطبيقه (لا نخترع له بيانات). */
  unapplied: string[];
}

const AR_NUMBER_WORDS: Record<string, number> = {
  الف: 1000,
  ألف: 1000,
  ميه: 100,
  مية: 100,
  مئه: 100,
  مئهه: 100,
  نصف: 0.5,
};

function parseAmount(token: string): number | undefined {
  const normalized = token.replace(/[,٬]/g, "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (AR_NUMBER_WORDS[token] !== undefined) return AR_NUMBER_WORDS[token];
  // «ألفين» = 2000، «خمسة آلاف» تُلتقط في القاعدة التالية.
  if (/^الفين$|^ألفين$/.test(token)) return 2000;
  const kMatch = /^(\d+(?:\.\d+)?)\s*(k|الف|ألف)$/.exec(token);
  if (kMatch) return Number(kMatch[1]) * 1000;
  const digitWords: Record<string, number> = { خمسه: 5, خمسة: 5, ثلاثه: 3, ثلاثة: 3, اربعه: 4, أربعة: 4, عشره: 10, عشرة: 10 };
  if (/^(\S+)\s+الاف$/.test(token) || /^(\S+)\s+آلاف$/.test(token)) {
    const word = token.split(" ")[0];
    const value = digitWords[word];
    if (value) return value * 1000;
  }
  return undefined;
}

/**
 * يستخرج نطاقًا سعريًا من نص حر (بالريال).
 *
 * نفحص **كل** المطابقات لا أولها فقط: «فلاتر تحت المغسلة أقل من 1500» فيها
 * «تحت» و«أقل من» — الأولى ليست ميزانية، والثانية هي المطلوبة.
 */
export function extractBudget(text: string): { min?: number; max?: number; label?: string } {
  const normalized = text
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/(\d),(\d)/g, "$1$2") // «1,500» رقم واحد لا عددان
    .replace(/٬/g, "");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const result: { min?: number; max?: number; label?: string } = {};

  const maxTriggers = new Set(["اقل", "أقل", "تحت", "دون", "حتى", "بحدود", "max", "below", "under"]);
  const minTriggers = new Set(["اكثر", "أكثر", "فوق", "يزيد", "ابدا", "يبدا", "يبدأ", "above", "over", "min", "minimum", "starting"]);
  /** كلمات محايدة تُتخطّى بين المُشغّل والرقم. */
  const skip = new Set(["من", "ريال", "ريالا", "ريالات", "sar", "sr", "بحدود", "حوالي", "تقريبا", "تقريبًا"]);

  const amountAt = (start: number): { value?: number; next: number } => {
    let index = start;
    while (index < tokens.length && skip.has(tokens[index])) index += 1;
    if (index >= tokens.length) return { next: index };
    const direct = parseAmount(tokens[index]);
    if (direct !== undefined) {
      // «خمسة آلاف» = كلمتان.
      if (index + 1 < tokens.length && /^(الاف|آلاف|الف|ألف)$/.test(tokens[index + 1])) {
        return { value: direct * 1000, next: index + 2 };
      }
      return { value: direct, next: index + 1 };
    }
    return { next: index + 1 };
  };

  let range: { min?: number; max?: number } = {};
  tokens.forEach((token, index) => {
    const clean = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (maxTriggers.has(clean) && result.max === undefined && result.min === undefined) {
      const { value } = amountAt(index + 1);
      if (value) result.max = value;
    } else if (minTriggers.has(clean) && result.min === undefined) {
      const { value } = amountAt(index + 1);
      if (value) result.min = value;
    }
  });

  // «من 800 إلى 1500» أو «بين 800 و 1500» = نطاق كامل.
  const rangePattern = /(?:بين|من)\s*(\d+(?:\.\d+)?)(?:\s*(?:و|إلى|الى|-|–)\s*(\d+(?:\.\d+)?))?/i;
  const rangeMatch = rangePattern.exec(normalized);
  if (rangeMatch && rangeMatch[2]) {
    const low = Number(rangeMatch[1]);
    const high = Number(rangeMatch[2]);
    if (Number.isFinite(low) && low > 0 && Number.isFinite(high) && high > 0) {
      range = { min: Math.min(low, high), max: Math.max(low, high) };
    }
  } else if (result.min && result.max && result.min > result.max) {
    range = { min: result.max, max: result.min };
  }

  const min = range.min ?? result.min;
  const max = range.max ?? result.max;

  if (min || max) {
    result.min = min;
    result.max = max;
    result.label = min && max ? `${min}–${max} ر.س` : min ? `أكثر من ${min} ر.س` : `أقل من ${max} ر.س`;
  } else {
    delete result.min;
    delete result.max;
  }
  return result;
}

/** «المنزل بالكامل» / «تحت المغسلة» / «مطبخ» … إلى فلاتر استخدام وتركيب. */
function mapUsage(
  text: string,
): { useCase?: string[]; installationType?: string[]; categorySlug?: string; systemType?: string[] } {
  const out: { useCase?: string[]; installationType?: string[]; categorySlug?: string; systemType?: string[] } = {};
  if (/(المنزل كامل|البيت كامل|منزل بالكامل|whole home|whole-house|ماء البيت كله)/i.test(text)) {
    out.useCase = ["whole-home"];
    out.categorySlug = "whole-house";
  } else if (/(مطبخ|kitchen)/i.test(text)) {
    out.useCase = ["kitchen"];
  } else if (/(تحت المغسله|تحت المغسلة|under sink|under-sink)/i.test(text)) {
    out.installationType = ["under-sink"];
  } else if (/(مضخه|مضخة|pump)/i.test(text)) {
    out.categorySlug = "pumps";
  } else if (/(شمعات|شمع|خرطوش|كارتريدج|قطع غيار|cartridge)/i.test(text)) {
    out.categorySlug = "cartridges";
  } else if (/(تناضح|osmosis|ro\b)/i.test(text)) {
    out.systemType = ["ro"];
    out.categorySlug = "water-filters";
  }
  return out;
}

function mapSystemTypes(text: string): string[] | undefined {
  const types: string[] = [];
  if (/تناضح عكسي|ro\b|reverse osmosis/i.test(text)) types.push("ro");
  if (/مباشر|direct flow|direct-flow/i.test(text)) types.push("direct-flow");
  if (/uv|اشعه|أشعة|بالأشعة/.test(text)) types.push("uv");
  return types.length > 0 ? types : undefined;
}

function mapSort(text: string): SortKey | undefined {
  if (/(الارخص|أرخص|الأرخص|اقل سعر|أقل سعر|cheapest|cheap)/i.test(text)) return "price_asc";
  if (/(الاغلى|الأغلى|اعلى سعر|أعلى سعر|premium)/i.test(text)) return "price_desc";
  if (/(الاعلى تقييم|الأعلى تقييم|افضل تقييم|أفضل تقييم|best rated|top rated)/i.test(text)) return "rating";
  if (/(الاكثر مبيع|الأكثر مبيع|best sell)/i.test(text)) return "best_selling";
  if (/(اوفر|أوفر|توفير|savings)/i.test(text)) return "savings_desc";
  return undefined;
}

const SORT_LABELS: Record<string, string> = {
  price_asc: "الأقل سعرًا",
  price_desc: "الأعلى سعرًا",
  rating: "الأعلى تقييمًا",
  best_selling: "الأكثر مبيعًا",
  savings_desc: "الأكثر توفيرًا",
};

/**
 * يحوّل رسالة عربية/إنجليزية إلى فلاتر كتالوج + قائمة بما طُبِّق.
 * لا يُخزِّن أي شيء ولا يستدعي الشبكة — دالة نقية قابلة للاختبار.
 */
export function mapNaturalQuery(message: string): MappedQuery {
  const text = message.trim();
  const budget = extractBudget(text);
  const usage = mapUsage(text);
  const systemType = usage.systemType ?? mapSystemTypes(text);
  const sort = mapSort(text);
  const applied: string[] = [];
  const unapplied: string[] = [];

  const query: CatalogQuery = { pageSize: 6, page: 1 };

  if (budget.min) query.minPrice = budget.min;
  if (budget.max) query.maxPrice = budget.max;
  if (budget.label) applied.push(`الميزانية: ${budget.label}`);

  if (usage.categorySlug) {
    query.categorySlug = usage.categorySlug;
    applied.push(`الفئة: ${usage.categorySlug}`);
  }
  if (usage.useCase) {
    query.useCase = usage.useCase;
    applied.push(`الاستخدام: ${usage.useCase.join("، ")}`);
  }
  if (usage.installationType) {
    query.installationType = usage.installationType;
    applied.push(`نوع التركيب: ${usage.installationType.join("، ")}`);
  }
  if (systemType) {
    query.systemType = systemType;
    applied.push(`نوع النظام: ${systemType.join("، ")}`);
  }

  const household = /(?:عائله|عائلة|أفراد|اشخاص|أشخاص|نفر|household|family)\D{0,12}?(\d{1,2})/.exec(text);
  const householdValue = household ? Number(household[1]) : undefined;
  if (householdValue && householdValue > 0) {
    // نفس شرائح فلتر «عدد الأفراد» المستخدمة في صفحة الفئة.
    query.users = [householdValue <= 1 ? "1" : householdValue <= 3 ? "2-3" : householdValue <= 6 ? "4-6" : "7-plus"];
    applied.push(`عدد الأفراد: ${householdValue}`);
  }

  if (/(متوفر|متوفره|متوفرة|in stock|available)/i.test(text)) {
    query.availability = "in_stock";
    applied.push("المتوفر فقط");
  }
  if (/(العروض|عروض|خصومات|خصم|تخفيض|على العرض|offer|discount|sale)/i.test(text)) {
    query.discounted = true;
    applied.push("العروض والخصومات");
  }
  if (/(ضمان|warranty)/i.test(text)) unapplied.push("مدة الضمان تُقرأ من صفحة المنتج، لم أستخدمها كفلتر");
  if (sort) {
    query.sort = sort;
    applied.push(`الترتيب: ${SORT_LABELS[sort] ?? sort}`);
  }

  // كلمات مفتاحية متبقية تصلح للبحث النصي (اسم موديل/علامة).
  const brand = /\b(aqua|rewaa|ro|uv|gpd|tds|ppm)\b/i.exec(text);
  if (brand) {
    query.search = brand[1];
    applied.push(`بحث نصي: ${brand[1]}`);
  }

  return { query, applied, unapplied };
}
