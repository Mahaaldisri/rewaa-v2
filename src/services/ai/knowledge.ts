/**
 * استرجاع المعرفة (Knowledge Retrieval) للمساعد.
 *
 * المصادر: الأسئلة الشائعة، المقالات والأدلة، الوثائق القانونية/السياسات،
 * وصفحات الخدمة. المحتوى الطويل فقط يُسترجع بهذه الطبقة؛ أما البيانات المتغيّرة
 * (السعر، المخزون، الخصم، المواعيد، الطلبات) فتُجلب دائمًا من الأدوات/الخدمات
 * ولا تُخزَّن ولا تُستخرج من فهرس المعرفة.
 *
 * البحث كلماتي مبدئيًا (token match + أوزان حقول)، ومهيّأ لإضافة ترتيب دلالي
 * لاحقًا: `rankCandidates()` هي النقطة الوحيدة التي يجب تغييرها عند إضافة
 * embeddings/reranker على الخادم.
 */
import { faqs } from "@/data/content/faqs";
import { guides } from "@/data/content/guides";
import { legalDocuments } from "@/data/content/legal";
import { serviceOfferings } from "@/data/content/services";
import { sanitizeText, AI_MAX_SOURCE_TEXT } from "@/lib/ai/sanitize";

export type KnowledgeKind = "faq" | "guide" | "policy" | "service";

export interface KnowledgeDoc {
  id: string;
  kind: KnowledgeKind;
  title: string;
  /** نص كامل مُقلَّم — يُمرَّر للخادم كبيانات غير موثوقة. */
  body: string;
  href?: string;
  updatedAt?: string;
  /** كلمات مفتاحية إضافية تُحسّن البحث (وسوم، مجموعات، عناوين فرعية). */
  keywords: string[];
}

export interface KnowledgeHit {
  doc: KnowledgeDoc;
  score: number;
  /** مقتطف قصير يصلح للعرض أو للتمرير إلى المزوّد. */
  excerpt: string;
}

const AR_DIACRITICS = /[\u0617-\u061A\u064B-\u0652\u0670\u0640]/g;

/** تطبيع عربي مبسّط: همزات، تاء مربوطة، تشكيل، أرقام عربية. */
export function normalizeArabic(value: string): string {
  return value
    .toLowerCase()
    .replace(AR_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set(
  [
    "من",
    "في",
    "على",
    "عن",
    "الى",
    "إلى",
    "مع",
    "هل",
    "ما",
    "هي",
    "هو",
    "اذا",
    "إذا",
    "كيف",
    "ايش",
    "وش",
    "ابغى",
    "أبغى",
    "ابي",
    "أبي",
    "the",
    "and",
    "for",
    "with",
    "what",
    "how",
    "does",
    "can",
    "you",
  ].map(normalizeArabic)
);

/**
 * توسيع المرادفات: العميل يكتب «شمعات» أو «كارتريدج» أو «قطع»، والوثيقة قد
 * تستخدم «فلتر بديل» أو «خرطوش». التوسيع يرفع الاستدعاء (recall) بوزن أقل من
 * المطابقة المباشرة، ولا يغيّر النص المعروض.
 */
const SYNONYMS: Record<string, string[]> = {
  شمعه: ["فلتر", "خرطوش", "كارتريدج", "قطعه"],
  شمعات: ["فلتر", "خرطوش", "كارتريدج", "قطع"],
  كارتريدج: ["خرطوش", "فلتر", "قطعه"],
  خرطوش: ["كارتريدج", "فلتر", "قطعه"],
  ضمان: ["كفاله", "warranty"],
  كفاله: ["ضمان"],
  تركيب: ["تنصيب", "install"],
  تنصيب: ["تركيب"],
  توصيل: ["شحن", "تسليم"],
  شحن: ["توصيل", "تسليم"],
  ارجاع: ["استرجاع", "استرداد", "return"],
  استرجاع: ["ارجاع", "استرداد"],
  ملوحه: ["ملح", "tds", "عسر"],
  tds: ["ملوحه", "عسر", "املاح"],
  فلتر: ["منقي", "تنقيه", "filter"],
  صيانه: ["خدمه", "تغيير", "maintenance"],
  تقسيم: ["تقسيط", "اقساط", "مدى"],
  تقسيط: ["اقساط", "مدى"],
};

export function expandTokens(tokens: string[]): { token: string; weight: number }[] {
  const expanded = new Map<string, number>();
  tokens.forEach((token) => {
    expanded.set(token, Math.max(expanded.get(token) ?? 0, 1));
    (SYNONYMS[token] ?? []).forEach((synonym) => {
      const normalized = normalizeArabic(synonym);
      if (normalized) expanded.set(normalized, Math.max(expanded.get(normalized) ?? 0, 0.5));
    });
  });
  return Array.from(expanded.entries()).map(([token, weight]) => ({ token, weight }));
}

export function tokenize(value: string): string[] {
  return normalizeArabic(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/* ------------------------------------------------------------------ */
/* بناء الفهرس                                                          */
/* ------------------------------------------------------------------ */

function buildDocs(): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];

  faqs.forEach((faq) => {
    docs.push({
      id: `faq:${faq.id}`,
      kind: "faq",
      title: sanitizeText(faq.question, 200),
      body: sanitizeText(faq.answer, AI_MAX_SOURCE_TEXT),
      href: "/faq",
      keywords: [faq.group, faq.relatedGuideSlug ?? ""].filter(Boolean),
    });
  });

  guides.forEach((guide) => {
    const body = [
      guide.excerpt,
      ...guide.sections.flatMap((section) => [
        section.heading,
        ...section.body,
        ...(section.bullets ?? []),
        section.callout?.body ?? "",
      ]),
      ...guide.faqs.flatMap((entry) => [entry.q, entry.a]),
    ]
      .filter(Boolean)
      .join("\n");
    docs.push({
      id: `guide:${guide.slug}`,
      kind: "guide",
      title: sanitizeText(guide.title, 200),
      body: sanitizeText(body, AI_MAX_SOURCE_TEXT * 2),
      href: `/guides/${guide.slug}`,
      updatedAt: guide.updatedAt,
      keywords: [...guide.tags, guide.categoryLabel],
    });
  });

  legalDocuments.forEach((doc) => {
    const body = [
      doc.summary,
      doc.disclaimer,
      ...doc.sections.flatMap((section) => [section.title, ...section.body, ...(section.bullets ?? [])]),
    ].join("\n");
    docs.push({
      id: `policy:${doc.slug}`,
      kind: "policy",
      title: sanitizeText(doc.title, 200),
      body: sanitizeText(body, AI_MAX_SOURCE_TEXT * 2),
      href: `/legal/${doc.slug}`,
      updatedAt: doc.updatedAt,
      keywords: ["سياسة", "شروط", "ضمان", "ارجاع"],
    });
  });

  serviceOfferings.forEach((service) => {
    const body = [
      service.summary,
      service.tagline,
      service.priceNote,
      service.coverageNote,
      service.durationLabel,
      ...service.includes.flatMap((entry) => [entry.title, entry.body]),
      ...service.process.flatMap((entry) => [entry.title, entry.body]),
      ...(service.requirements ?? []),
      ...(service.signals ?? []).flatMap((entry) => [entry.title, entry.body]),
      ...(service.faqs ?? []).flatMap((entry) => [entry.q, entry.a]),
    ].join("\n");
    docs.push({
      id: `service:${service.slug}`,
      kind: "service",
      title: sanitizeText(service.name, 200),
      body: sanitizeText(body, AI_MAX_SOURCE_TEXT),
      href: `/services/${service.slug}`,
      keywords: [service.shortName, service.icon, "خدمة", "تركيب", "صيانة"].filter(Boolean),
    });
  });

  return docs;
}

let index: KnowledgeDoc[] | null = null;

function ensureIndex(): KnowledgeDoc[] {
  if (!index) index = buildDocs();
  return index;
}

/** للاختبارات: يعيد بناء الفهرس بعد تغيير البيانات. */
export function resetKnowledgeIndex(): void {
  index = null;
}

/* ------------------------------------------------------------------ */
/* البحث                                                               */
/* ------------------------------------------------------------------ */

function excerptFor(doc: KnowledgeDoc, tokens: string[]): string {
  const body = doc.body;
  const lower = normalizeArabic(body);
  const firstHit = tokens.map((token) => lower.indexOf(token)).filter((position) => position >= 0).sort((a, b) => a - b)[0];
  const start = firstHit === undefined ? 0 : Math.max(0, firstHit - 120);
  const slice = body.slice(start, start + 420);
  return sanitizeText(start > 0 ? `…${slice}` : slice, 460);
}

/**
 * ترتيب المرشّحين — نقطة التوسعة لترتيب دلالي لاحقًا (reranking).
 *
 * الترتيب الحالي كلماتي (BM25 مبسّط بلا مكتبات) مع توسيع مرادفات عربي. عند
 * إضافة reranker على الخادم يُمرَّر عبر `rerank` في `searchKnowledge` فقط،
 * ولا يتغيّر أي مستدعٍ آخر.
 */
export function rankCandidates(query: string, docs: KnowledgeDoc[], rerank?: RerankFn): KnowledgeHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const expanded = expandTokens(tokens);

  const scored = docs.map((doc) => {
    const title = normalizeArabic(doc.title);
    const body = normalizeArabic(doc.body);
    const keywords = normalizeArabic(doc.keywords.join(" "));
    let score = 0;
    /** مطابقة قوية = عنوان أو كلمة مفتاحية (وليس مجرد ورود في متن طويل). */
    let strongMatches = 0;

    expanded.forEach(({ token, weight }) => {
      if (title.includes(token)) {
        score += 6 * weight;
        strongMatches += 1;
      }
      if (keywords.includes(token)) {
        score += 3 * weight;
        strongMatches += 1;
      }
      if (body.includes(token)) score += 1 * weight;
      // المطابقة الجزئية للأسماء الطويلة (مثل «شمعة» داخل «الشمعات»).
      else if (token.length >= 4 && (title.includes(token.slice(0, 4)) || keywords.includes(token.slice(0, 4)))) {
        score += 1 * weight;
      }
    });

    // عبارة كاملة موجودة في العنوان = أقوى إشارة.
    const phrase = normalizeArabic(query);
    if (phrase.length >= 6 && title.includes(phrase)) score += 8;

    return { doc, score, strongMatches, excerpt: excerptFor(doc, tokens) };
  });

  const hits = scored
    // عتبة الثقة: مطابقة قوية واحدة، أو ثلاث إشارات نصية على الأقل.
    // هكذا لا يُعيد سؤال خارج النطاق أي وثيقة «بالصدفة».
    .filter((hit) => hit.score > 0 && (hit.strongMatches > 0 || hit.score >= 3))
    .sort((a, b) => b.score - a.score || a.doc.title.length - b.doc.title.length)
    .slice(0, 5);

  return rerank ? rerank(query, hits).slice(0, 5) : hits;
}

export type RerankFn = (query: string, hits: KnowledgeHit[]) => KnowledgeHit[];

export function searchKnowledge(
  query: string,
  options: { kinds?: KnowledgeKind[]; limit?: number; rerank?: RerankFn } = {},
): KnowledgeHit[] {
  const docs = options.kinds ? ensureIndex().filter((doc) => options.kinds!.includes(doc.kind)) : ensureIndex();
  const hits = rankCandidates(query, docs, options.rerank);
  return options.limit ? hits.slice(0, options.limit) : hits;
}

/** عدد الوثائق المفهرسة — يُستخدم في لوحة «مركز الذكاء» والتشخيص. */
export function knowledgeStats(): { total: number; byKind: Record<KnowledgeKind, number> } {
  const docs = ensureIndex();
  const byKind = { faq: 0, guide: 0, policy: 0, service: 0 } as Record<KnowledgeKind, number>;
  docs.forEach((doc) => {
    byKind[doc.kind] += 1;
  });
  return { total: docs.length, byKind };
}
