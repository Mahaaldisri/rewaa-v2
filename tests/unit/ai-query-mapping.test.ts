/**
 * اختبارات تحويل الكلام الطبيعي إلى فلاتر كتالوج منظّمة.
 * الهدف: ألّا يفهم المساعد الميزانية/الاستخدام خطأً، وألّا يخترع فلاتر من لا شيء.
 */
import { describe, expect, it } from "vitest";
import { extractBudget, mapNaturalQuery } from "@/services/ai/query-mapping";

describe("استخراج الميزانية", () => {
  it("يفهم «أقل من 1500» ويتجاهل «تحت المغسلة»", () => {
    const budget = extractBudget("فلاتر تحت المغسلة أقل من 1500");
    expect(budget.max).toBe(1500);
    expect(budget.min).toBeUndefined();
  });

  it("يفهم الأرقام العربية والألف", () => {
    expect(extractBudget("أقل من ٢٠٠٠").max).toBe(2000);
    expect(extractBudget("ابغى شي اقل من الفين").max).toBe(2000);
    expect(extractBudget("بحدود 1,500").max).toBe(1500);
  });

  it("يفهم النطاق بين رقمين", () => {
    const budget = extractBudget("بين 800 و 1500 ريال");
    expect(budget.min).toBe(800);
    expect(budget.max).toBe(1500);
  });

  it("يفهم الحد الأدنى", () => {
    expect(extractBudget("أكثر من 2000").min).toBe(2000);
  });

  it("لا يخترع ميزانية إن لم تُذكر", () => {
    const budget = extractBudget("أبغى فلتر جيد للمطبخ");
    expect(budget.min).toBeUndefined();
    expect(budget.max).toBeUndefined();
  });
});

describe("تحويل الطلب إلى فلاتر", () => {
  it("«تحت المغسلة أقل من 1500 لأربعة أفراد»", () => {
    const { query, applied } = mapNaturalQuery("اعرض لي فلاتر تحت المغسلة أقل من 1500 لعائلة من 4 أفراد");
    expect(query.installationType).toEqual(["under-sink"]);
    expect(query.maxPrice).toBe(1500);
    expect(query.users).toEqual(["4-6"]);
    expect(applied.length).toBeGreaterThanOrEqual(3);
  });

  it("«المتوفر فقط» تُترجم إلى فلتر التوفر", () => {
    expect(mapNaturalQuery("اعرض لي المتوفر فقط").query.availability).toBe("in_stock");
  });

  it("«العروض» تُترجم إلى فلتر الخصومات ولا تلتقط كلمة «اعرض»", () => {
    expect(mapNaturalQuery("اعرض لي العروض والخصومات").query.discounted).toBe(true);
    expect(mapNaturalQuery("اعرض لي الفلاتر").query.discounted).toBeUndefined();
  });

  it("الترتيب: الأرخص/الأعلى تقييمًا/الأكثر مبيعًا", () => {
    expect(mapNaturalQuery("اعرض لي الأرخص").query.sort).toBe("price_asc");
    expect(mapNaturalQuery("ابغى الأعلى تقييمًا").query.sort).toBe("rating");
    expect(mapNaturalQuery("ورني الأكثر مبيعًا").query.sort).toBe("best_selling");
  });

  it("يحدد القسم من الاستخدام", () => {
    expect(mapNaturalQuery("أبغى حل للمنزل بالكامل").query.categorySlug).toBe("whole-house");
    expect(mapNaturalQuery("أحتاج شمعات بديلة").query.categorySlug).toBe("cartridges");
    expect(mapNaturalQuery("أبغى مضخة").query.categorySlug).toBe("pumps");
  });

  it("لا يُنتج أي فلتر لسؤال عام", () => {
    const { query, applied } = mapNaturalQuery("مرحبا كيف حالك");
    expect(applied).toHaveLength(0);
    expect(query.maxPrice).toBeUndefined();
    expect(query.users).toBeUndefined();
    expect(query.categorySlug).toBeUndefined();
  });

  it("يشرح ما لم يُستخدم كفلتر (الضمان)", () => {
    const { unapplied } = mapNaturalQuery("أبغى فلتر ضمانه طويل");
    expect(unapplied.join(" ")).toMatch(/الضمان/);
  });
});
