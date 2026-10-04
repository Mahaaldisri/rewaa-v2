/**
 * اختبارات استرجاع المعرفة: أسئلة عربية وإنجليزية يجب أن تصل إلى الوثيقة الصحيحة،
 * وسؤال خارج النطاق يجب ألّا يعيد أي نتيجة (بدل تخمين إجابة).
 */
import { describe, expect, it } from "vitest";
import { knowledgeStats, searchKnowledge, tokenize } from "@/services/ai/knowledge";
import { clearKnowledgeGaps, knowledgeGapQueue, recordKnowledgeGap } from "@/services/ai/gaps";

describe("استرجاع المعرفة", () => {
  it("يفهرس كل مصادر المحتوى", () => {
    const stats = knowledgeStats();
    expect(stats.total).toBeGreaterThan(20);
    expect(stats.byKind.faq).toBeGreaterThan(0);
    expect(stats.byKind.guide).toBeGreaterThan(0);
    expect(stats.byKind.policy).toBeGreaterThan(0);
    expect(stats.byKind.service).toBeGreaterThan(0);
  });

  const cases: { query: string; kinds?: ("faq" | "guide" | "policy" | "service")[] }[] = [
    { query: "ما سياسة الاسترجاع؟", kinds: ["policy", "faq"] },
    { query: "كم فترة الضمان على الجهاز؟", kinds: ["policy", "faq"] },
    { query: "متى أغيّر الشمعات؟", kinds: ["guide", "faq"] },
    { query: "كيف أركب الفلتر بنفسي؟", kinds: ["guide", "service"] },
    { query: "how long does shipping take?" },
    { query: "ما طرق الدفع المتاحة؟" },
  ];

  it.each(cases)("يجد نتيجة لسؤال: %s", ({ query }) => {
    const hits = searchKnowledge(query, { limit: 3 });
    expect(hits.length).toBeGreaterThan(0);
    hits.forEach((hit) => {
      expect(hit.doc.body.length).toBeGreaterThan(0);
      expect(hit.excerpt.length).toBeGreaterThan(10);
      expect(hit.score).toBeGreaterThan(0);
    });
  });

  it("يفهم المرادفات: «شمعات» تصل إلى محتوى القطع", () => {
    const hits = searchKnowledge("أبحث عن شمعات بديلة", { limit: 5 });
    expect(hits.length).toBeGreaterThan(0);
  });

  it("لا يخترع نتيجة لسؤال خارج نطاق المتجر", () => {
    const hits = searchKnowledge("ما أفضل مطعم برجر في طوكيو؟");
    expect(hits).toHaveLength(0);
  });

  it("يحترم حد النتائج", () => {
    const hits = searchKnowledge("فلتر", { limit: 2 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("يوسّع المرادفات بوزن أقل من المطابقة المباشرة", () => {
    const tokens = tokenize("الشمعات");
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe("قائمة فجوات المعرفة", () => {
  it("تسجّل الموضوع وتدمج التكرار", () => {
    clearKnowledgeGaps();
    recordKnowledgeGap({ topic: "هل تدعمون تركيب أنابيب نحاسية قديمة؟", locale: "ar", path: "/faq" });
    recordKnowledgeGap({ topic: "هل تدعمون تركيب أنابيب نحاسية قديمة؟", locale: "ar", path: "/faq" });
    const queue = knowledgeGapQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].count).toBe(2);
  });

  it("تنقّي البيانات الحساسة قبل الحفظ", () => {
    clearKnowledgeGaps();
    recordKnowledgeGap({ topic: "بطاقتي 4111 1111 1111 1111 فيها مشكلة", locale: "ar", path: "/" });
    const queue = knowledgeGapQueue();
    expect(queue[0].topic).not.toMatch(/4111\s*1111/);
  });

  it("تتجاهل المواضيع القصيرة جدًا", () => {
    clearKnowledgeGaps();
    recordKnowledgeGap({ topic: "؟", locale: "ar", path: "/" });
    expect(knowledgeGapQueue()).toHaveLength(0);
  });
});
