/**
 * المساعد التطويري (Development assistant).
 *
 * ⚠️ **ليس ذكاءً اصطناعيًا.** لا يتصل بأي مزوّد نماذج، ولا يوجد فيه أي مفتاح.
 * إنه موجّه نوايا (intent router) قائم على قواعد، يعمل في التطوير/العرض فقط،
 * ويُوسَم بوضوح في الواجهة («مساعد تجريبي — بدون نموذج ذكاء اصطناعي»).
 *
 * وظيفته الوحيدة في هذا المستودع:
 *   - إثبات مسار الواجهة كاملًا (بثّ، كتل منظّمة، أدوات، حالات تنفيذ، تأكيد
 *     إجراءات، تحويل لموظف) قبل توصيل بوابة خادم حقيقية.
 *   - تشغيل نفس الأدوات والخدمات التي سيستدعيها الخادم لاحقًا، فلا يوجد منطق
 *     أعمال مكرر ولا رقم مُخترع.
 *
 * كل رد يبدأ من أداة حقيقية أو من محتوى المعرفة؛ وإذا لم يفهم السؤال يقول ذلك
 * ويعرض التحويل لموظف بدل تخمين إجابة.
 */
import { AI_DEMO_BADGE, type AiBlock, type AiChatRequest, type AiLocale, type AiSourceRef, type AiStreamEvent, type AiToolTrace } from "@/types/ai";
import type { AdvisorAnswers } from "@/lib/water-advisor";
import { serviceAreas } from "@/config/site";
import { sanitizeText, redactSensitive } from "@/lib/ai/sanitize";
import { runTool, type ToolContext } from "@/services/ai/tools";
import { resolveSummary } from "@/services/ai/catalog-resolver";
import { recordKnowledgeGap } from "@/services/ai/gaps";
import { mapNaturalQuery } from "@/services/ai/query-mapping";
import { payments } from "@/services/payments";
import { formatMoney } from "@/lib/format";
import { productSummaries } from "@/data/catalog";
import type { ProductSummary } from "@/types/catalog";

/* ------------------------------------------------------------------ */
/* حالة المحادثة (Conversation state)                                  */
/* ------------------------------------------------------------------ */

/** حالة يملكها مزوّد المساعد، لا الواجهة — تبقى داخل نفس المحادثة فقط. */
export interface DevConversationState {
  lastProductIds: string[];
  lastKind?: string;
  advisor: Partial<AdvisorAnswers>;
  calculation: { unitLiters?: number; unitPrice?: number; unitsPerPeriod?: number; frequency?: "weekly" | "monthly"; months?: number; people?: number };
}

export function createDevState(): DevConversationState {
  return { lastProductIds: [], advisor: {}, calculation: {} };
}

/* ------------------------------------------------------------------ */
/* استخراج الكيانات                                                    */
/* ------------------------------------------------------------------ */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit))).replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
  );
}

const NUMBER_WORDS: Record<string, number> = {
  واحد: 1,
  اثنين: 2,
  اثنان: 2,
  ثلاثة: 3,
  اربعة: 4,
  أربعة: 4,
  خمسة: 5,
  ستة: 6,
  سبعة: 7,
  ثمانية: 8,
  تسعة: 9,
  عشرة: 10,
};

/** عدد الأفراد من نص حر («حنا 5 أشخاص»، «عائلة ٦»، «family of 4»). */
export function extractPeople(text: string): number | undefined {
  const normalized = normalizeDigits(text);
  const explicit = normalized.match(/(\d{1,2})\s*(?:اشخاص|أشخاص|افراد|أفراد|نفر|اشخاص|شخص|فرد)/);
  if (explicit) return Number(explicit[1]);
  const familyOf = normalized.match(/(?:family\s*of|عائلة|عايله|اسرة|أسرة|حنا|احنا|نحن)\D{0,6}(\d{1,2})/i);
  if (familyOf) return Number(familyOf[1]);
  const bare = normalized.match(/(?:حنا|احنا|نحن|عددنا|we are)\s*(\d{1,2})/i);
  if (bare) return Number(bare[1]);
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (text.includes(word) && /(اشخاص|أشخاص|افراد|أفراد|عائلة|اسرة|family)/.test(text)) return value;
  }
  return undefined;
}

/** الميزانية بالريال («ميزانيتي 1500»، «around 1000 SAR»). */
export function extractBudget(text: string): number | undefined {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/(?:ميزانية|ميزانيتي|بحدود|حدود|حوالي|budget|around|within)\D{0,8}(\d{3,6})/i);
  if (match) return Number(match[1]);
  const bareRiyal = normalized.match(/(\d{3,6})\s*(?:ريال|ر\.س|sar)/i);
  return bareRiyal ? Number(bareRiyal[1]) : undefined;
}

export function extractCity(text: string): string | undefined {
  return serviceAreas.cities.find((city) => text.includes(city));
}

/** أرقام الموديلات في الكتالوج مثل RO-7 أو CTO أو RWA-… */
export function extractModel(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{2,4}[- ]?\d{1,3}[A-Z]?|\d{3,4}[- ]?[A-Z]{2,4}|[A-Z]{3,5}\d{2,4})\b/);
  return match ? match[1].replace(/\s+/g, "-").toUpperCase() : undefined;
}

/** شراء الشمعات: «6 كراتين أسبوعيًا الكرتون بـ 18 ريال». */
export function extractPurchase(text: string): DevConversationState["calculation"] | undefined {
  const normalized = normalizeDigits(text);
  const units = normalized.match(/(\d{1,3})\s*(?:كرتون|كراتين|كراتين|عبوات|عبوة|جالون|قوارير|قارورة|بطل|بطاقات|cartons?|bottles?|gallons?)/i);
  const price = normalized.match(/(?:بـ|بسعر|سعر|price of|at)\s*(\d{1,4})(?:\.\d+)?\s*(?:ريال|ر\.س|sar)?/i);
  const sizeMatch = normalized.match(/(\d{1,3}(?:\.\d+)?)\s*(?:لتر|liter|litre)/i);
  const frequency: DevConversationState["calculation"]["frequency"] =
    /(اسبوع|أسبوع|weekly|every week)/i.test(text) ? "weekly" : /(شهر|monthly|كل شهر)/i.test(text) ? "monthly" : undefined;

  if (!units && !price) return undefined;
  return {
    unitsPerPeriod: units ? Number(units[1]) : undefined,
    unitPrice: price ? Number(price[1]) : undefined,
    unitLiters: sizeMatch ? Number(sizeMatch[1]) : /كرتون|carton/i.test(text) ? 3.96 : undefined,
    frequency,
  };
}

/** هل سأل العميل عن صنف معيّن من المعرفة؟ */
const KNOWLEDGE_HINTS: { pattern: RegExp; kind: "faq" | "guide" | "policy" | "service"; label: string }[] = [
  { pattern: /(سياس[ةه]\s*(ال)?ارجاع|الارجاع|أرجع|ارجاع|استرداد|refund|return policy)/i, kind: "policy", label: "سياسة الإرجاع" },
  { pattern: /(الضمان|ضمان|warranty)/i, kind: "policy", label: "الضمان" },
  { pattern: /(الشحن|التوصيل|يوصل|shipping|delivery)/i, kind: "policy", label: "الشحن والتوصيل" },
  { pattern: /(التركيب|تركيب|installation)/i, kind: "faq", label: "التركيب" },
  { pattern: /(صيانة|الصيانة|maintenance)/i, kind: "faq", label: "الصيانة" },
  { pattern: /(طرق الدفع|الدفع|مدى|تابي|تمارا|payment)/i, kind: "faq", label: "طرق الدفع" },
];

/* ------------------------------------------------------------------ */
/* المحرّك                                                            */
/* ------------------------------------------------------------------ */

interface DevRunOptions {
  request: AiChatRequest;
  ctx: ToolContext;
  state: DevConversationState;
  emit: (event: AiStreamEvent) => void;
  signal?: AbortSignal;
}

const DEMO_NOTICE =
  "مساعد تجريبي قائم على قواعد ثابتة داخل المتصفح — ليس نموذج ذكاء اصطناعي، ولا يتصل بأي مزوّد. كل البيانات أدناه من كتالوج رواء وخدماتها.";

export const DEMO_ASSISTANT_BADGE = AI_DEMO_BADGE;

type Intent =
  | "greeting"
  | "browse"
  | "recommend"
  | "compare"
  | "calculator"
  | "images"
  | "add_to_cart"
  | "booking"
  | "compatibility"
  | "maintenance"
  | "order"
  | "warranty"
  | "return"
  | "handoff"
  | "coverage"
  | "payments"
  | "fit"
  | "knowledge"
  | "unknown";

export function classifyIntent(message: string): Intent {
  const text = message.trim();
  if (!text) return "unknown";
  const tests: [Intent, RegExp][] = [
    ["handoff", /(موظف|انسان|بشري|مشرف|شكوى|أشكو|اكلم احد|agent|human|supervisor|complaint)/i],
    ["add_to_cart", /(اضف|أضف|ضيف|حطه|حطها|أضفه|شراء|اشتر|add to cart)/i],
    ["compare", /(قارن|مقارنة|الفرق بين|وش الفرق|compare|difference)/i],
    ["calculator", /(اوفر|أوفر|توفير|احسب|كم يوفر|savings?|cheaper)/i],
    ["images", /(ورني|ارني|أرني|شكله|صور|صورة|صوره|photo|picture|show me|images?)/i],
    ["booking", /(تركيب|احجز|أحجز|فني|زيارة|صيانة|book|technician|install|visit)/i],
    ["compatibility", /(شمعة|شمعات|شمعه|فلتر بديل|متوافق|توافق|موديل|model|cartridge|compatible|replacements?)/i],
    ["maintenance", /(متى اغير|متى أغيّر|موعد التغيير|باقي|remaining|next change|schedule)/i],
    ["order", /(طلبي|طلباتي|وين طلبي|تتبع|حالة الطلب|order|track|shipment)/i],
    ["warranty", /(ضمان|warranty)/i],
    ["return", /(ارجاع|أرجع|إرجاع|استرجاع|استرداد|return)/i],
    ["coverage", /(تركبون|تغطية|تخدمون|توصلون|coverage|deliver to you|serve)/i],
    ["payments", /(دفع|مدى|اقساط|تقسيط|payment|installments)/i],
    [
      "browse",
      /(اعرض|أعرض|ورني|أرني|ارني|ابحث|ابحثي|عندكم|شوف|قائمة|list|show me|search for|browse)/i,
    ],
    [
      "recommend",
      /(ابغى|أبغى|ابي|أبي|احتاج|أحتاج|ساعدني|رشح|انصحني|افضل|أفضل|فلتر ل|جهاز ل|recommend|need a|looking for|suggest|(أي|اي|وش|which|what)\s+(فلتر|فلاتر|جهاز|نظام|منتج|مضخة))/i,
    ],
    ["fit", /(يناسبني|يناسب|مناسب لي|هل يصلح|fits?|suitable|good for)/i],
    ["greeting", /^(هلا|اهلا|أهلا|السلام|مرحبا|هاي|صباح|مساء|hi|hello|hey)\b/i],
  ];
  for (const [intent, pattern] of tests) {
    if (pattern.test(text)) return intent;
  }
  return "unknown";
}

/* ---------------------------- بناء الكتل ---------------------------- */

function productRef(summary: ProductSummary, reasons?: string[]) {
  return { productId: summary.id, reasons: reasons && reasons.length > 0 ? reasons.slice(0, 4) : undefined };
}

function textBlock(text: string): AiBlock {
  return { type: "text", text: sanitizeText(text, 1200) };
}

/** إجابة قصيرة + خطوة تالية، بلا مقالات طويلة (سياسة الردود). */
async function run(messageId: string, options: DevRunOptions): Promise<void> {
  const { request, ctx, state, emit, signal } = options;
  const message = sanitizeText(request.message, 1200);
  const intent = classifyIntent(message);
  const traces: AiToolTrace[] = [];
  const blocks: AiBlock[] = [];
  const sources: AiSourceRef[] = [];

  const tool = async (name: Parameters<typeof runTool>[0], args: Record<string, unknown>) => {
    emit({ type: "tool", messageId, name, state: "started" });
    const started = Date.now();
    const result = await runTool(name, args, ctx);
    const trace: AiToolTrace = {
      name: name as AiToolTrace["name"],
      state: result.ok ? "succeeded" : "failed",
      ms: Date.now() - started,
      error: result.error,
    };
    traces.push(trace);
    emit({ type: "tool", messageId, name, state: trace.state, ms: trace.ms, error: trace.error });
    return result;
  };

  const say = async (text: string) => {
    // بثّ تدريجي بسيط ليجرّب الواجهة حالة «الكتابة».
    const parts = text.split(/(?<=[.،!؟])\s+/);
    for (const part of parts) {
      if (signal?.aborted) return;
      emit({ type: "delta", messageId, text: `${part} ` });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  };

  const remember = (summaries: (ProductSummary | undefined)[]) => {
    const ids = summaries.filter((entry): entry is ProductSummary => Boolean(entry)).map((entry) => entry.id);
    if (ids.length > 0) state.lastProductIds = ids;
  };

  const pageProduct = request.context.productId ? resolveSummary(request.context.productId) : undefined;
  const people = extractPeople(message) ?? state.calculation.people;
  const budget = extractBudget(message);
  const city = extractCity(message) ?? request.context.city;

  /* ------------------------------ الترحيب ------------------------------ */
  if (intent === "greeting") {
    await say("أهلًا بك في رواء 👋 اسألني عن جهاز مناسب، توافق الشمعات، التوفير، أو حجز فني.");
    const summary = pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    blocks.push(
      textBlock(
        summary
          ? `أنت الآن في صفحة ${summary.name} — يمكنني مقارنته ببديل، حساب تكلفة تشغيله، أو معرفة شمعاته.`
          : "أخبرني باحتياجك: عدد الأفراد، الميزانية، أو المشكلة في المياه — وسأرشّح من الكتالوج الفعلي."
      ),
      quickReplies(summary ? "product" : "general", summary)
    );
    emit({ type: "block", messageId, block: blocks[0] });
    emit({ type: "block", messageId, block: blocks[1] });
    return;
  }

  /* ------------------------ تصفّح الكتالوج بالفلاتر ------------------------ */
  if (intent === "browse" || (intent === "unknown" && /(فلتر|فلترة|جهاز|نظام|شمعات|مضخة)/.test(message))) {
    const mapped = mapNaturalQuery(message);
    const hasFilters =
      mapped.applied.length > 0 ||
      Boolean(mapped.query.categorySlug || mapped.query.search || mapped.query.users || mapped.query.maxPrice);
    const baseArgs: Record<string, unknown> = {
      query: mapped.query.search ?? (hasFilters ? undefined : message.slice(0, 120)),
      category: mapped.query.categorySlug,
      useCase: mapped.query.useCase?.[0],
      minPrice: mapped.query.minPrice,
      maxPrice: mapped.query.maxPrice,
      inStockOnly: mapped.query.availability === "in_stock" ? true : undefined,
      discountedOnly: mapped.query.discounted === true ? true : undefined,
      systemType: mapped.query.systemType,
      sort: mapped.query.sort,
      limit: 4,
    };

    /* توسيع تدريجي **مُعلَن**: نُرخي الفلاتر الاستنتاجية فقط (عدد الأفراد ثم موقع
       التركيب) ولا نلمس السعر أو القسم أو التوفر — ومع كل توسيع نقول ذلك للعميل. */
    const relaxations: { args: Record<string, unknown>; note?: string }[] = [
      { args: { ...baseArgs, users: mapped.query.users?.[0], installationType: mapped.query.installationType?.[0] } },
      {
        args: { ...baseArgs, installationType: mapped.query.installationType?.[0] },
        note: mapped.query.users ? "وسّعت نطاق عدد الأفراد لأن لا منتج يطابق كل الشروط معًا." : undefined,
      },
      {
        args: { ...baseArgs },
        note:
          mapped.query.installationType || mapped.query.users
            ? "أزلت فلتر موقع التركيب أيضًا — هذه أقرب المنتجات المطابقة لبقية شروطك."
            : undefined,
      },
    ];

    let result = await tool("search_products", relaxations[0].args);
    let relaxationNote = "";
    if ((Array.isArray(result.data?.items) ? (result.data.items as unknown[]).length : 0) === 0) {
      for (const attempt of relaxations.slice(1)) {
        if (!attempt.note) continue;
        result = await tool("search_products", attempt.args);
        relaxationNote = attempt.note;
        if ((Array.isArray(result.data?.items) ? (result.data.items as unknown[]).length : 0) > 0) break;
      }
    }

    const items = Array.isArray(result.data?.items)
      ? (result.data.items as Record<string, unknown>[])
          .map((item) => (typeof item.id === "string" ? resolveSummary(item.id) : undefined))
          .filter((entry): entry is ProductSummary => Boolean(entry))
      : [];
    const total = typeof result.data?.total === "number" ? result.data.total : items.length;

    if (items.length === 0) {
      recordKnowledgeGap({ topic: message, locale: request.locale, path: request.context.path });
      await say(
        hasFilters
          ? "بحثت في الكتالوج بالفلاتر التي فهمتها ولم أجد منتجًا يطابقها. أستطيع توسيع البحث (إزالة فلتر أو زيادة الميزانية) — لن أعرض منتجًا غير مطابق."
          : "لم أجد في الكتالوج ما يطابق وصفك. أخبرني بالاستخدام أو الميزانية أو رقم الموديل، أو أستطيع تحويلك لفريق رواء."
      );
      blocks.push(textBlock(hasFilters ? `الفلاتر المطبَّقة: ${mapped.applied.join(" · ")}` : "البحث كان نصيًا فقط دون فلاتر."));
      blocks.push(quickReplies("general"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }

    remember(items);
    await say(`وجدت ${total} منتجًا مطابقًا في الكتالوج${mapped.applied.length > 0 ? ` حسب: ${mapped.applied.join("، ")}` : ""}.`);
    blocks.push(
      textBlock(
        mapped.applied.length > 0
          ? `طبّقت هذه الفلاتر من كلامك: ${mapped.applied.join(" · ")}. الأسعار والتوفر من بيانات المنتجات نفسها.`
          : "هذه نتائج البحث من كتالوج رواء — الأسعار والتوفر كما هي مسجّلة في المنتجات."
      )
    );
    blocks.push({
      type: "product_carousel",
      title: mapped.query.categorySlug ? "منتجات مطابقة" : "أقرب المنتجات لطلبك",
      items: items.map((item) => productRef(item)),
    });
    if (relaxationNote) blocks.push({ type: "notice", tone: "info", text: relaxationNote });
    if (mapped.unapplied.length > 0) {
      blocks.push({ type: "notice", tone: "info", text: mapped.unapplied.join(" · ") });
    }
    blocks.push(quickReplies("browse"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* --------------------------- الترشيح/الاختيار --------------------------- */
  if (intent === "recommend" || (intent === "unknown" && people)) {
    const usage = /(المنزل كامل|البيت كامل|whole home|المنزل بالكامل)/i.test(message)
      ? "whole-home"
      : /(مطبخ|kitchen)/i.test(message)
        ? "kitchen"
        : /(شمعات|قطع|cartridge)/i.test(message)
          ? "cartridge"
          : "drinking";
    const usersBand = !people ? undefined : people <= 2 ? "1-2" : people <= 5 ? "3-5" : "6-plus";
    state.advisor = { ...state.advisor, usage, users: usersBand ?? state.advisor.users, city: city ?? state.advisor.city };
    if (people) state.calculation.people = people;

    const result = await tool("recommend_systems", {
      usage,
      users: state.advisor.users,
      housing: /(شقة|شقه|apartment)/i.test(message) ? "apartment" : /(فيلا|villa)/i.test(message) ? "villa" : undefined,
      city,
      budget,
    });

    const recommendations = Array.isArray(result.data?.recommendations) ? (result.data?.recommendations as Record<string, unknown>[]) : [];
    const summaries = recommendations
      .map((item) => (typeof item.id === "string" ? resolveSummary(item.id) : undefined))
      .filter((entry): entry is ProductSummary => Boolean(entry));

    if (summaries.length === 0) {
      // لا ترشيح: نسأل عن أقل معلومة ناقصة بدل تخمين جهاز.
      const needUsage = !usage;
      await say(needUsage ? "لأرشّح لك بدقة أحتاج معرفة الغرض: مياه شرب وطبخ، أم المنزل بالكامل، أم حل للمطبخ؟" : result.summary);
      blocks.push(textBlock(needUsage ? "الترشيح إرشادي من تصنيفات الكتالوج، وليس تحليلًا لمياهك." : result.summary));
      blocks.push(quickReplies("usage"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }

    remember(summaries);
    const notes = Array.isArray(result.data?.notes) ? (result.data?.notes as string[]) : [];
    await say(
      `وجدت ${summaries.length} ${summaries.length === 1 ? "خيارًا" : "خيارات"} من الكتالوج تناسب ما ذكرته${people ? ` (${people} أشخاص)` : ""}${budget ? ` وبميزانية ${formatMoney(budget)}` : ""}.`
    );
    if (notes[0]) await say(notes[0]);
    blocks.push({ type: "product_carousel", title: "أنظمة قد تناسب احتياجك", items: summaries.map((summary, index) => productRef(summary, typeof recommendations[index]?.reasons === "object" ? (recommendations[index].reasons as string[]) : undefined)) });
    blocks.push(quickReplies("recommend"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "catalog:advisor", title: "ترشيح مبني على تصنيفات الكتالوج (مستشار المياه)", kind: "catalog", href: "/product-finder" });
    return;
  }

  /* ------------------------------ المقارنة ------------------------------ */
  if (intent === "compare") {
    const mentioned = extractMentionedProducts(message).map((entry) => entry.id);
    const ids = (mentioned.length >= 2 ? mentioned : state.lastProductIds).slice(0, 3);
    if (ids.length < 2) {
      await say("اختر منتجين لأقارنهما — يمكنك فتح صفحة المنتج والسؤال مباشرة، أو اذكر اسميهما.");
      blocks.push(quickReplies(pageProduct ? "product" : "general", pageProduct));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const result = await tool("compare_products", { ids });
    const rows = Array.isArray(result.data?.rows) ? (result.data?.rows as { label: string; values: string[]; emphasis?: boolean }[]) : [];
    if (rows.length === 0) {
      await say("تعذّر جلب بيانات المقارنة الآن. يمكنك استخدام صفحة المقارنة الكاملة.");
      blocks.push(textBlock("تعذّر الوصول إلى بيانات المقارنة."), quickReplies("error"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    await say(`قارنت ${ids.length} منتجات في ${rows.length} صفوف مبنية على بيانات الكتالوج — الصفوف غير المعلنة لا نعرض فيها أرقامًا.`);
    blocks.push({ type: "comparison", productIds: ids, rows, note: "القيم مأخوذة من بيانات المنتجات؛ «غير معلن» تعني أن القيمة غير مسجّلة في الكتالوج." });
    blocks.push({
      type: "action",
      label: "عرض المقارنة الكاملة",
      action: { kind: "open_compare", productIds: ids },
    });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------- الحاسبة ------------------------------- */
  if (intent === "calculator") {
    const purchase = extractPurchase(message);
    if (purchase) state.calculation = { ...state.calculation, ...purchase };
    if (people) state.calculation.people = people;

    const target = pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    const result = await tool("calculate_savings", {
      mode: state.calculation.unitsPerPeriod ? "purchases" : "estimate",
      people: state.calculation.people,
      unitLiters: state.calculation.unitLiters,
      unitPrice: state.calculation.unitPrice,
      unitsPerPeriod: state.calculation.unitsPerPeriod,
      frequency: state.calculation.frequency,
      months: state.calculation.months ?? 60,
      productId: target?.id,
    });

    const data = result.data ?? {};
    const missing = Array.isArray(data.missingData) ? (data.missingData as string[]) : [];
    if (typeof data.monthlyBottledCost === "number" && data.monthlyBottledCost <= 0) {
      await say(
        `لأحسب التوفير أحتاج سعر المياه التي تشتريها أو استهلاكك اليومي. مثال: «أشتري 6 كراتين شهريًا، الكرتون بـ 18 ريال».`
      );
      blocks.push(quickReplies("calculator"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }

    await say(
      `تكلفتك الحالية تقريبًا ${formatMoney(Number(data.monthlyBottledCost))} شهريًا، والتوفير المتوقع ${formatMoney(Math.max(0, Number(data.savings)))} خلال ${data.months} شهرًا.`
    );
    const breakEven = typeof data.breakEvenMonth === "number" ? `نقطة التعادل بعد ${data.breakEvenMonth} شهرًا.` : "لم تتحقق نقطة تعادل في هذه المدة.";
    await say(breakEven);
    blocks.push({
      type: "calculator_result",
      input: {
        mode: state.calculation.unitsPerPeriod ? "purchases" : "estimate",
        people: state.calculation.people ?? 4,
        litersPerPersonPerDay: 3,
        unitLiters: state.calculation.unitLiters ?? 18.9,
        unitPrice: state.calculation.unitPrice ?? 12,
        unitsPerPeriod: state.calculation.unitsPerPeriod ?? 6,
        frequency: state.calculation.frequency ?? "monthly",
        months: Number(data.months ?? 60),
        productId: target?.id,
        devicePrice: target?.price,
        replacementKitPrice: Number(target?.attributes?.replacementMonths ? 0 : 0),
      },
      note: missing.length > 0 ? `قيم غير مسجّلة لم نخمّنها: ${missing.join("، ")}.` : undefined,
    });
    blocks.push({ type: "action", label: "افتح الحاسبة كاملة", action: { kind: "open_calculator", productId: target?.id, months: Number(data.months ?? 60), householdSize: state.calculation.people } });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* -------------------------------- الصور -------------------------------- */
  if (intent === "images") {
    const target = pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    if (!target) {
      await say("حدّد المنتج أولًا (أو افتح صفحته) وسأعرض صوره من وسائط الكتالوج.");
      blocks.push(textBlock("لا أستطيع عرض صورة منتج غير محدَّد."));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const wantsParts = /(شمعات|شمع|قطعة|قطعه|parts?|cartridges?)/i.test(message);
    const result = await tool(wantsParts ? "get_device_cartridge_set" : "get_product_media", wantsParts ? { id: target.id } : { id: target.id, role: "product" });
    if (wantsParts) {
      const recommended = Array.isArray(result.data?.recommended) ? (result.data?.recommended as Record<string, unknown>[]) : [];
      const parts = recommended
        .map((item) => (typeof item.id === "string" ? resolveSummary(item.id) : undefined))
        .filter((entry): entry is ProductSummary => Boolean(entry));
      if (parts.length === 0) {
        await say(result.summary);
        blocks.push(textBlock(result.summary), quickReplies("compatibility"));
        blocks.forEach((block) => emit({ type: "block", messageId, block }));
        return;
      }
      remember(parts);
      await say(`هذه القطع المتوافقة المعلنة لجهاز ${target.name}.`);
      blocks.push({ type: "product_carousel", title: `قطع متوافقة مع ${target.name}`, items: parts.map((part) => productRef(part, ["معلَنة كقطعة متوافقة في بيانات الكتالوج."])) });
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const images = Array.isArray(result.data?.images) ? (result.data?.images as { url: string; alt: string }[]) : [];
    await say(`هذه ${images.length} صور من وسائط ${target.name}.`);
    images.slice(0, 3).forEach((image) => {
      blocks.push({ type: "image", productId: target.id, imageUrl: image.url, alt: image.alt || target.name });
    });
    blocks.push({
      type: "action",
      label: "افتح صفحة المنتج لمشاهدة كل الصور",
      action: { kind: "open_compare", productIds: [target.id] },
    });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ----------------------------- الإضافة للسلة ----------------------------- */
  if (intent === "add_to_cart") {
    const mentioned = extractMentionedProducts(message);
    const target = mentioned[0] ?? pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    if (!target) {
      await say("حدّد المنتج الذي تريد إضافته وسأجهّز الإضافة للسلة.");
      blocks.push(quickReplies("general"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const product = resolveSummary(target.id);
    const variant = product?.attributes?.systemType ? product : undefined;
    if (!product || product.stockStatus === "out_of_stock") {
      await say(`«${product?.name ?? "المنتج"}» غير متوفر حاليًا، فلا أستطيع إضافته للسلة.`);
      blocks.push(textBlock("المنتج غير متوفر — يمكنك متابعة التوفر من صفحته."));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    void variant;
    await say(`سأضيف «${product.name}» إلى سلتك — الإضافة تحتاج تأكيدك من الزر أدناه.`);
    blocks.push({
      type: "action",
      label: `أضف ${product.name} إلى السلة`,
      action: { kind: "add_to_cart", productId: product.id, quantity: 1 },
      confirmRequired: true,
      confirmLabel: "تأكيد الإضافة",
    });
    blocks.push(quickReplies("afterCart"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* -------------------------------- الحجز -------------------------------- */
  if (intent === "booking") {
    const serviceType = /(صيانة|maintenance)/i.test(message) ? "maintenance" : /(فحص|تحليل|water|test)/i.test(message) ? "water-test" : "install";
    if (!city) {
      await say("بأي مدينة تريد الزيارة؟ أتحقق من التغطية والمواعيد المتاحة من بيانات الخدمة.");
      blocks.push(textBlock("لم أجد اسم مدينة في رسالتك."), quickReplies("city"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const availability = await tool("get_service_availability", { city });
    const slots = await tool("get_available_slots", { city, serviceType });
    const covered = availability.data?.covered === true;
    await say(availability.summary);
    const slotList = Array.isArray(slots.data?.slots) ? (slots.data?.slots as { label: string; sample: boolean }[]) : [];
    if (covered && slotList.length > 0) {
      await say(`أقرب نافذة: ${slotList[0].label}${slotList[0].sample ? " (بيانات عرض تجريبية)" : ""}.`);
    } else if (covered) {
      await say("لا تتوفر مواعيد معلنة من مصدر موثوق — يمكن للموظف تأكيد أقرب موعد.");
    }
    blocks.push({
      type: "service_card",
      serviceType,
      city: availability.data?.cityName ? String(availability.data.cityName) : city,
      refreshAvailability: true,
      note: availability.data?.source === "sample" ? "بيانات توفر تجريبية للعرض — تُحدَّد نهائيًا عند تأكيد الحجز." : undefined,
    });
    blocks.push({
      type: "action",
      label: "افتح نموذج الحجز مع تعبئة مسبقة",
      action: {
        kind: "open_form",
        form: "booking",
        query: {
          type: serviceType,
          city,
          ...(target0(state, pageProduct) ? { product: target0(state, pageProduct) as string } : {}),
        },
      },
      confirmRequired: true,
      confirmLabel: "متابعة الحجز",
    });
    blocks.push(quickReplies("afterBooking"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "service:availability", title: "تغطية الخدمة والمواعيد", kind: "service", href: "/services" });
    return;
  }

  /* ------------------------------ التوافق ------------------------------ */
  if (intent === "compatibility") {
    const model = extractModel(message);
    const query = [model, message].filter(Boolean).join(" ");
    const result = await tool("find_compatible_parts", { query });
    const parts = Array.isArray(result.data?.parts) ? (result.data?.parts as Record<string, unknown>[]) : [];
    const device = result.data?.device as { name?: string } | undefined;

    if (parts.length === 0) {
      await say(
        "لا توجد بيانات توافق مسجّلة لهذا الاستعلام. أرسل رقم الموديل من ملصق الجهاز — ولا أؤكد توافقًا غير موجود في بيانات الكتالوج."
      );
      blocks.push(textBlock(result.summary));
      const suggestions = Array.isArray(result.data?.suggestions) ? (result.data?.suggestions as string[]) : [];
      if (suggestions.length > 0) {
        blocks.push({ type: "quick_replies", replies: suggestions.slice(0, 3).map((code) => ({ id: `model-${code}`, label: code, send: `شمعات لموديل ${code}` })) });
      } else {
        blocks.push(quickReplies("compatibility"));
      }
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }

    const summaries = parts
      .map((part) => (typeof part.id === "string" ? resolveSummary(part.id) : undefined))
      .filter((entry): entry is ProductSummary => Boolean(entry));
    remember(summaries);
    const strong = parts.filter((part) => Number(part.confidence) >= 60);
    await say(
      strong.length > 0
        ? `${device?.name ? `لجهاز ${device.name}: ` : ""}عثرت على ${parts.length} قطعة مرتبطة، ${strong.length} منها بتطابق معلن في بيانات الكتالوج.`
        : `هذه أقرب القطع المرتبطة، لكن التطابق غير مؤكد في البيانات — لا أستطيع تأكيدها كبديل نهائي.`
    );
    blocks.push({
      type: "product_carousel",
      title: device?.name ? `قطع مرتبطة بـ ${device.name}` : "قطع مرتبطة بالاستعلام",
      items: parts
        .map((part, index) => (summaries[index] ? productRef(summaries[index], (part.reasons as string[]) ?? []) : undefined))
        .filter((entry): entry is { productId: string; reasons: string[] | undefined } => Boolean(entry)),
    });
    if (strong.length === 0) {
      blocks.push({
        type: "action",
        label: "أرسل صورة ملصق الموديل",
        action: { kind: "open_handoff", topic: "تأكيد توافق قطعة" },
      });
    }
    blocks.push(quickReplies("afterParts"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "catalog:compatibility", title: "فاحص توافق القطع", kind: "catalog", href: "/compatibility" });
    return;
  }

  /* ------------------------------ الصيانة ------------------------------ */
  if (intent === "maintenance") {
    const mentioned = extractMentionedProducts(message);
    const target = mentioned[0] ?? pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    const result = await tool("get_maintenance_schedule", { id: target?.id, city });
    if (typeof result.data?.nextChange === "string") {
      await say(
        `آخر تغيير ${String(result.data.lastChange)}، والتغيير القادم ${String(result.data.nextChange)} — المتبقي ${Math.round(Number(result.data.percentRemaining ?? 0))}%.`
      );
    } else {
      await say(result.summary);
    }
    blocks.push({
      type: "maintenance_card",
      productId: target?.id,
      deviceId: typeof result.data?.deviceId === "string" ? String(result.data.deviceId) : undefined,
      fallback:
        target && !ctx.user
          ? {
              deviceName: target.name,
              nextChange: typeof result.data?.intervalMonths === "number" ? `كل ${result.data.intervalMonths} شهرًا من تاريخ آخر تغيير` : undefined,
              cartridgeSetName: undefined,
            }
          : undefined,
    });
    if (ctx.user) {
      blocks.push({
        type: "action",
        label: "أضف طقم الشمعات للسلة",
        action: { kind: "add_to_cart", productId: target?.id ?? "" },
        confirmRequired: true,
        confirmLabel: "تأكيد الإضافة",
      });
    } else {
      blocks.push({ type: "action", label: "سجّل جهازك لمتابعة الموعد", action: { kind: "login", reason: "مركز الصيانة يحتاج حسابًا لحفظ أجهزتك ومواعيدها." } });
    }
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------- الطلبات ------------------------------- */
  if (intent === "order") {
    if (!ctx.user) {
      const orderNumber = modelFromOrder(message);
      if (orderNumber) {
        const result = await tool("track_order", { orderNumber });
        await say(result.summary);
        if (result.ok && typeof result.data?.reference === "string") {
          blocks.push({ type: "order_status", orderNumber: String(result.data.reference), refresh: true });
        } else {
          blocks.push(textBlock(result.summary));
          blocks.push({ type: "action", label: "تأكيد الهوية برقم الجوال أو البريد", action: { kind: "open_form", form: "tracking", query: { order: orderNumber } } });
        }
      } else {
        await say("أرسل رقم الطلب (RWA-…) لأتتبعه، أو سجّل الدخول لعرض كل طلباتك.");
        blocks.push(textBlock("لا أعرض بيانات طلب دون رقم الطلب وتحقق مناسب."), quickReplies("tracking"));
      }
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const result = await tool("list_my_orders", { limit: 3 });
    const orders = Array.isArray(result.data?.orders) ? (result.data.orders as { number: string; status: string; total: number }[]) : [];
    await say(orders.length > 0 ? `لديك ${orders.length} طلب مسجّل — أحدثها ${orders[0].number}.` : "لا توجد طلبات على هذا الحساب.");
    orders.forEach((order) => blocks.push({ type: "order_status", orderNumber: order.number, refresh: true }));
    if (orders.length === 0) blocks.push(quickReplies("general"));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------- الضمان ------------------------------- */
  if (intent === "warranty") {
    const mentioned = extractMentionedProducts(message);
    const target = mentioned[0] ?? pageProduct;
    const result = await tool("get_warranty_status", target ? { id: target.id } : {});
    await say(result.summary);
    blocks.push(textBlock(result.summary));
    if (ctx.user) {
      blocks.push({ type: "action", label: "قدّم طلب ضمان", action: { kind: "open_form", form: "warranty", query: target ? { product: target.id } : undefined }, confirmRequired: true, confirmLabel: "فتح النموذج" });
    } else {
      blocks.push({ type: "action", label: "سجّل الدخول لعرض ضمان جهازك", action: { kind: "login", reason: "حالة الضمان تعتمد على بيانات حسابك وطلبك." } });
      blocks.push({ type: "action", label: "قدّم طلب ضمان", action: { kind: "open_form", form: "warranty" } });
    }
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "policy:warranty", title: "سياسة الضمان", kind: "policy", href: "/legal/warranty" });
    return;
  }

  /* ------------------------------- الإرجاع ------------------------------- */
  if (intent === "return") {
    const orderNumber = modelFromOrder(message);
    if (orderNumber) {
      const result = await tool("check_return_eligibility", { orderNumber });
      await say(result.summary);
      blocks.push(textBlock(result.summary));
    } else {
      const knowledge = await tool("get_knowledge", { query: "سياسة الإرجاع والاستبدال", kind: "policy" });
      const hits = Array.isArray(knowledge.data?.hits) ? (knowledge.data.hits as { title: string; excerpt: string; href?: string }[]) : [];
      await say(hits[0]?.excerpt ?? "سياسة الإرجاع موضّحة في صفحة السياسة، ولا نضمن الموافقة قبل مراجعة الطلب.");
      hits.slice(0, 2).forEach((hit) => {
        blocks.push(textBlock(hit.excerpt));
        sources.push({ id: `policy:${hit.title}`, title: hit.title, kind: "policy", href: hit.href });
      });
    }
    blocks.push({ type: "action", label: "افتح نموذج الإرجاع", action: { kind: "open_form", form: "return", query: orderNumber ? { order: orderNumber } : undefined }, confirmRequired: true, confirmLabel: "متابعة" });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "policy:returns", title: "سياسة الإرجاع والاستبدال", kind: "policy", href: "/legal/returns" });
    return;
  }

  /* ------------------------------ التحويل ------------------------------ */
  if (intent === "handoff") {
    const summary = await buildHandoffSummary(state, request, pageProduct);
    await say("سأحوّلك إلى موظف خدمة العملاء مع ملخص لما ناقشناه حتى لا تعيد الشرح.");
    blocks.push({
      type: "human_handoff",
      topic: /شكوى|complaint/i.test(message) ? "شكوى" : "طلب مساعدة من موظف",
      summary,
      topics: summary.split(" · ").slice(0, 3),
      channel: "whatsapp",
      whatsappMessage: redactSensitive(`مرحبًا، أحتاج مساعدة.\n${summary}`),
    });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------ التغطية ------------------------------ */
  if (intent === "coverage") {
    if (!city) {
      await say("بأي مدينة أنت؟ أتحقق من بيانات التغطية المتاحة.");
      blocks.push(textBlock("لم أجد اسم مدينة في رسالتك."), quickReplies("city"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const result = await tool("get_service_availability", { city });
    await say(result.summary);
    blocks.push({
      type: "service_card",
      city: String(result.data?.cityName ?? city),
      refreshAvailability: true,
      note: result.data?.source === "sample" ? "بيانات توفر تجريبية للعرض — لا تُعد تأكيدًا نهائيًا." : undefined,
    });
    blocks.push({ type: "action", label: "احجز زيارة", action: { kind: "open_form", form: "booking", query: { city } } });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    sources.push({ id: "service:coverage", title: "تغطية الخدمة", kind: "service", href: "/services" });
    return;
  }

  /* ------------------------------- الدفع ------------------------------- */
  if (intent === "payments") {
    const status = payments.status();
    await say(
      `${status.live ? "بوابة الدفع مهيأة" : status.testMode ? "الدفع في هذا البناء تجريبي للعرض فقط" : "لا توجد بوابة دفع مهيأة في هذا البناء"}. لا أطلب أي بيانات بطاقة في المحادثة، والدفع يتم في صفحة الدفع.`
    );
    blocks.push({
      type: "notice",
      tone: status.live ? "info" : "warning",
      title: "بيانات الدفع",
      text: `الطرق المتاحة: ${status.methods.join("، ")}. ${status.notice}`,
    });
    blocks.push({ type: "action", label: "اذهب إلى السلة والدفع", action: { kind: "open_form", form: "contact" } });
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* --------------------------- هل يناسبني؟ --------------------------- */
  if (intent === "fit") {
    const mentioned = extractMentionedProducts(message);
    const target = mentioned[0] ?? pageProduct ?? (state.lastProductIds[0] ? resolveSummary(state.lastProductIds[0]) : undefined);
    if (!target) {
      await say("أي جهاز تقصد؟ افتح صفحته أو اذكر اسمه، وسأقارن مواصفاته باحتياجك من بيانات المنتج.");
      blocks.push(quickReplies("general"));
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    const result = await tool("recommend_systems", {
      usage: /(المنزل كامل|whole home)/i.test(message) ? "whole-home" : "drinking",
      users: !people ? undefined : people <= 2 ? "1-2" : people <= 5 ? "3-5" : "6-plus",
      housing: /شقة|apartment/i.test(message) ? "apartment" : undefined,
      city,
    });
    const recommendations = Array.isArray(result.data?.recommendations) ? (result.data?.recommendations as Record<string, unknown>[]) : [];
    const match = recommendations.find((item) => item.id === target.id);
    const reasons = Array.isArray(match?.reasons) ? (match.reasons as string[]) : [];
    const cautions = Array.isArray(match?.cautions) ? (match.cautions as string[]) : [];
    remember([target]);

    if (people) state.calculation.people = people;
    await say(
      reasons.length > 0
        ? `بناءً على ما ذكرته${people ? ` (${people} أشخاص)` : ""}، ${target.name} ${reasons[0]}`
        : `لم أجد في بيانات الكتالوج ما يدعم ترشيح ${target.name} لاحتياجك بالتحديد — لا أؤكد ملاءمة بلا بيانات.`
    );
    if (cautions[0]) await say(`ملاحظة: ${cautions[0]}`);
    blocks.push({ type: "product_card", productId: target.id, reasons: [...reasons.slice(0, 2), ...cautions.slice(0, 1)] });
    blocks.push(quickReplies("product", target));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------ المعرفة ------------------------------ */
  const hint = KNOWLEDGE_HINTS.find((entry) => entry.pattern.test(message));
  if (hint || intent === "knowledge" || intent === "unknown") {
    const result = await tool("get_knowledge", { query: message, kind: hint?.kind });
    const hits = Array.isArray(result.data?.hits) ? (result.data.hits as { id: string; title: string; excerpt: string; href?: string; updatedAt?: string }[]) : [];
    if (hits.length === 0) {
      // فجوة معرفة: تُسجَّل محليًا (موضوع مختصر فقط) ليعرف فريق المحتوى ما ينقص.
      recordKnowledgeGap({ topic: message, locale: request.locale, path: request.context.path });
      await say(
        "لم أجد إجابة موثوقة في أدلة الموقع أو الأسئلة الشائعة. أستطيع تحويلك لموظف، أو يمكنك سؤالي عن منتج معيّن أو خدمة."
      );
      const summary = await buildHandoffSummary(state, request, pageProduct);
      blocks.push(textBlock("لا أخترع إجابة غير موجودة في مصادرنا."));
      blocks.push({
        type: "human_handoff",
        topic: "سؤال غير مغطى في المصادر",
        summary,
        topics: [redactSensitive(message).slice(0, 80)],
        channel: "whatsapp",
        whatsappMessage: redactSensitive(`سؤال غير موجود في الأسئلة الشائعة: ${message}`),
      });
      blocks.forEach((block) => emit({ type: "block", messageId, block }));
      return;
    }
    await say(hits[0].excerpt);
    blocks.push(textBlock(hits[0].excerpt));
    hits.slice(0, 3).forEach((hit) => {
      sources.push({ id: hit.id, title: hit.title, kind: hit.id.startsWith("guide:") ? "guide" : hit.id.startsWith("policy:") ? "policy" : hit.id.startsWith("service:") ? "service" : "faq", href: hit.href, updatedAt: hit.updatedAt });
    });
    blocks.push(quickReplies("knowledge", undefined, sources));
    blocks.forEach((block) => emit({ type: "block", messageId, block }));
    return;
  }

  /* ------------------------------ غير معروف ------------------------------ */
  await say("لم أفهم سؤالك تمامًا. يمكنني مساعدتك في: اختيار جهاز، توافق الشمعات، حساب التوفير، حجز فني، أو حالة طلب.");
  blocks.push(quickReplies("general"));
  blocks.forEach((block) => emit({ type: "block", messageId, block }));
}

function target0(state: DevConversationState, pageProduct?: ProductSummary): string | undefined {
  return pageProduct?.id ?? state.lastProductIds[0];
}

/* ---------------------------- المنتجات المذكورة ---------------------------- */

export function extractMentionedProducts(message: string): ProductSummary[] {
  const text = message.toLowerCase();
  const matches: ProductSummary[] = [];
  productSummaries.forEach((summary) => {
    const name = summary.name.toLowerCase();
    const nameEn = summary.nameEn.toLowerCase();
    if (text.includes(name) || (nameEn.length > 4 && text.includes(nameEn)) || text.includes(summary.sku.toLowerCase())) {
      matches.push(summary);
    }
  });
  return matches.slice(0, 3);
}

/** أرقام الطلبات داخل الرسالة. */
export function modelFromOrder(message: string): string | undefined {
  const match = normalizeDigits(message).match(/\bRWA-[A-Z0-9-]{4,}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

/* ------------------------------ الردود السريعة ------------------------------ */

function quickReplies(kind: string, product?: ProductSummary, sources?: AiSourceRef[]): AiBlock {
  const general: { id: string; label: string; send: string }[] = [
    { id: "pick", label: "ساعدني أختار فلتر", send: "أبغى فلتر للبيت، حنا 4 أشخاص" },
    { id: "calc", label: "احسب التوفير", send: "كم أوفر مقارنة بشراء الماء؟" },
    { id: "parts", label: "أبحث عن شمعات", send: "أحتاج شمعات لجهازي" },
  ];
  const byKind: Record<string, { id: string; label: string; send: string }[]> = {
    general,
    product: [
      { id: "fit", label: "هل يناسب بيتي؟", send: "هل يناسب عائلة 5 أشخاص؟" },
      { id: "compare", label: "قارن ببديل", send: "قارن هذا الجهاز ببديل" },
      { id: "calc", label: "كم تكلفة صيانته؟", send: "كم أوفر مقارنة بشراء الماء؟" },
      { id: "parts", label: "عرض الشمعات", send: "ورني الشمعات المتوافقة" },
    ],
    recommend: [
      { id: "compare", label: "قارن الأول والثاني", send: "قارن الأول والثاني" },
      { id: "calc", label: "كم أوفر؟", send: "كم أوفر مقارنة بشراء الماء؟" },
      { id: "booking", label: "أحتاج تركيب", send: "أحتاج تركيب لهذا الجهاز" },
    ],
    afterCart: [
      { id: "checkout", label: "الدفع", send: "كيف أدفع؟" },
      { id: "booking", label: "حجز تركيب", send: "أحتاج تركيب" },
    ],
    afterBooking: [
      { id: "orders", label: "وين طلبي؟", send: "وين طلبي؟" },
      { id: "parts", label: "أحتاج شمعات", send: "أحتاج شمعات لجهازي" },
    ],
    afterParts: [
      { id: "images", label: "ورني صورتها", send: "ورني صورته" },
      { id: "add", label: "أضفها للسلة", send: "أضفها للسلة" },
      { id: "booking", label: "حجز تركيب", send: "أحتاج تركيب" },
    ],
    browse: [
      { id: "cheap", label: "الأرخص", send: "اعرض لي الأرخص" },
      { id: "rated", label: "الأعلى تقييمًا", send: "اعرض لي الأعلى تقييمًا" },
      { id: "stock", label: "المتوفر فقط", send: "اعرض لي المتوفر فقط" },
      { id: "offers", label: "العروض", send: "اعرض لي العروض والخصومات" },
    ],
    usage: [
      { id: "drink", label: "شرب وطبخ", send: "أبغى مياه شرب وطبخ" },
      { id: "home", label: "المنزل بالكامل", send: "أبغى حل للمنزل بالكامل" },
      { id: "kitchen", label: "حل للمطبخ", send: "أبغى فلتر للمطبخ" },
    ],
    city: [
      { id: "riyadh", label: "الرياض", send: "أنا في الرياض" },
      { id: "jeddah", label: "جدة", send: "أنا في جدة" },
      { id: "dammam", label: "الدمام", send: "أنا في الدمام" },
    ],
    calculator: [{ id: "calc", label: "احسب التوفير", send: "أشتري 6 كراتين شهريًا، الكرتون بـ 18 ريال" }],
    compatibility: [
      { id: "model", label: "أرسل رقم الموديل", send: "موديل جهازي" },
      { id: "photo", label: "صورة الملصق", send: "أرفقت صورة الملصق" },
    ],
    tracking: [{ id: "track", label: "أدخل رقم الطلب", send: "طلبي RWA-" }],
    knowledge: (sources ?? []).slice(0, 2).map((source) => ({ id: source.id, label: source.title, send: `اشرح أكثر عن ${source.title}` })),
    error: [
      { id: "retry", label: "أعد المحاولة", send: "أعد المحاولة" },
      { id: "agent", label: "تحدث مع موظف", send: "أبغى موظف" },
    ],
  };

  const replies = (byKind[kind] ?? general).slice(0, 4).map((reply) => ({ ...reply }));
  void product;
  return { type: "quick_replies", replies };
}

/* ------------------------------ ملخص التحويل ------------------------------ */

async function buildHandoffSummary(
  state: DevConversationState,
  request: AiChatRequest,
  pageProduct?: ProductSummary
): Promise<string> {
  const parts: string[] = [];
  if (pageProduct) parts.push(`الصفحة الحالية: ${pageProduct.name}`);
  else if (request.context.path) parts.push(`الصفحة الحالية: ${request.context.path}`);
  if (state.lastProductIds.length > 0) {
    const names = state.lastProductIds
      .map((id) => resolveSummary(id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) parts.push(`منتجات تمت مناقشتها: ${names.join("، ")}`);
  }
  if (state.calculation.people) parts.push(`عدد الأفراد: ${state.calculation.people}`);
  if (state.calculation.unitsPerPeriod) parts.push(`مشتريات: ${state.calculation.unitsPerPeriod} وحدة لكل فترة`);
  if (state.advisor.usage) parts.push(`الغرض: ${state.advisor.usage}`);
  parts.push(`آخر رسالة: ${redactSensitive(sanitizeText(request.message, 200))}`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* نقطة الدخول                                                        */
/* ------------------------------------------------------------------ */

/**
 * يشغّل المساعد التطويري ويبثّ نفس أحداث البروتوكول التي تبثّها بوابة الخادم،
 * لذا لا تحتاج الواجهة لأي فرع خاص بوضع التطوير.
 */
export async function runDevAssistant(options: DevRunOptions): Promise<void> {
  const { request, emit, signal, ctx } = options;
  const messageId = `dev-${Date.now().toString(36)}`;
  const locale: AiLocale = request.locale;

  emit({ type: "meta", conversationId: request.conversationId, messageId, model: "dev-rules-v1", demo: true });

  try {
    await run(messageId, options);
  } catch (error) {
    emit({
      type: "error",
      messageId,
      error: {
        code: "tool_failed",
        message: "تعذّر إكمال الطلب داخل المساعد التجريبي. يمكنك إعادة المحاولة أو التحويل لموظف.",
        retryable: true,
      },
    });
    void error;
    return;
  }

  if (!signal?.aborted) {
    const demoNotice: AiBlock = { type: "notice", tone: "info", text: DEMO_NOTICE };
    emit({ type: "block", messageId, block: demoNotice });
    emit({ type: "done", messageId });
  }

  if (locale === "en") {
    // الوضع التطويري يرد بالعربية فقط؛ نُبلّغ عن ذلك بدل ادعاء دعم كامل.
    emit({
      type: "delta",
      messageId,
      text: " (The development assistant answers in Arabic only. Connect the AI gateway for full English support.)",
    });
  }

  void ctx;
}
