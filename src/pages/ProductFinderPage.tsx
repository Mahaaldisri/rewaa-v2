import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { RadioCardGroup } from "@/components/common/FormField";
import { EmptyState } from "@/components/common/States";
import { ServiceAvailabilityPanel } from "@/components/services/ServiceAvailabilityPanel";
import { guides } from "@/data/content/guides";
import { usePageSeo, breadcrumbSchema, faqSchema } from "@/lib/seo";
import {
  advisorLabels,
  advise,
  CITY_OPTIONS,
  CONSUMPTION_OPTIONS,
  EMPTY_ANSWERS,
  PROBLEM_OPTIONS,
  SOURCE_OPTIONS,
  TDS_OPTIONS,
  USERS_OPTIONS,
  type AdvisorAnswers,
  type AdvisorResult,
  type Consumption,
  type Housing,
  type Problem,
  type Source,
  type TdsBand,
  type Usage,
  type Users,
} from "@/lib/water-advisor";
import { track } from "@/services/analytics";
import { cn } from "@/utils/cn";

/**
 * Water advisor — `/product-finder`.
 *
 * Collects the shopper’s context (city, source, TDS band, users, housing,
 * problem, consumption) and returns ranked recommendations with the reason for
 * every match. It never produces a water analysis or a laboratory result; the
 * copy states that explicitly and the ranking only uses catalogue attributes.
 */
const STEPS = [
  { key: "housing", title: "أين ستُستخدم المياه؟" },
  { key: "usage", title: "ما الغرض الأساسي؟" },
  { key: "users", title: "كم عدد المستخدمين؟" },
  { key: "consumption", title: "ما معدل الاستهلاك التقريبي؟" },
  { key: "source", title: "ما مصدر المياه، وفي أي مدينة؟" },
  { key: "tds", title: "هل تعرف قراءة الأملاح (TDS)؟ وما المشكلة الملاحظة؟" },
] as const;

export function ProductFinderPage() {
  const [answers, setAnswers] = useState<AdvisorAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  usePageSeo({
    title: "مستشار المياه — اختر النظام المناسب | رواء",
    description:
      "أجب عن أسئلة قصيرة عن مدينتك ومصدر المياه وقراءة الأملاح وعدد المستخدمين ومعدل الاستهلاك، واحصل على ترشيح مرتّب مع سبب واضح لكل خيار.",
    canonical: "/product-finder",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "مستشار المياه", href: "/product-finder" },
      ]),
      faqSchema([
        {
          question: "هل يقدّم مستشار المياه تحليلًا مخبريًا؟",
          answer: "لا. الأداة ترشدك بناءً على إجاباتك وتصنيفات الكتالوج، ولا تُجري أي تحليل للمياه ولا تصدر نتيجة مخبرية. يمكن حجز زيارة فحص مياه للتحقق الميداني.",
        },
        {
          question: "على ماذا يعتمد الترشيح؟",
          answer: "على بيانات المنتجات في الكتالوج: نوع النظام، عدد المراحل، معدل التدفق، السعة، الاستخدام المصنّف، ودورة استبدال الشمعات — إضافة إلى المدن المخدومة في إعدادات الخدمة.",
        },
        {
          question: "هل الترشيح نهائي؟",
          answer: "لا، هو ترشيح إرشادي. يستطيع الفني تأكيد الاحتياج بعد قياس المياه ومعاينة مكان التركيب.",
        },
      ]),
    ],
  });

  const update = <K extends keyof AdvisorAnswers>(key: K, value: AdvisorAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const currentFilled = useMemo(() => {
    const key = STEPS[step].key;
    if (key === "source") return Boolean(answers.source) && Boolean(answers.city);
    if (key === "tds") return Boolean(answers.tds) && Boolean(answers.problem);
    return Boolean(answers[key]);
  }, [answers, step]);

  const submit = () => {
    const missingIndex = STEPS.findIndex((item) => {
      if (item.key === "source") return !answers.source || !answers.city;
      if (item.key === "tds") return !answers.tds || !answers.problem;
      return !answers[item.key];
    });
    if (missingIndex !== -1) {
      setStep(missingIndex);
      return;
    }
    const next = advise(answers);
    setResult(next);
    setShowAll(false);
    track("search", {
      search_term: `water-advisor:${answers.usage}`,
      results_count: next.recommendations.length,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setResult(null);
    setAnswers(EMPTY_ANSWERS);
    setStep(0);
  };

  const suggestedGuide = guides.find((guide) =>
    answers.usage === "whole-home"
      ? guide.slug === "whole-house-vs-under-sink-filter"
      : answers.tds === "above-600"
        ? guide.slug === "what-does-tds-mean"
        : guide.slug === "how-to-choose-water-filter"
  );

  const summaryLine = [
    `المدينة: ${answers.city || "—"}`,
    `المصدر: ${advisorLabels.source(answers.source)}`,
    `TDS: ${advisorLabels.tds(answers.tds)}`,
    `المستخدمون: ${advisorLabels.users(answers.users)}`,
    `الاستهلاك: ${advisorLabels.consumption(answers.consumption)}`,
    `المشكلة: ${advisorLabels.problem(answers.problem)}`,
  ].join(" · ");

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "مستشار المياه", href: "/product-finder" }]} />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="mx-auto max-w-4xl">
          <Badge tone="aqua" icon="droplet">
            إرشاد في دقيقة
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
            أي نظام تنقية يناسب مياهك واستهلاكك؟
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13.5px] leading-7 text-ink-600">
            ستة أسئلة قصيرة عن المصدر والاستهلاك وقراءة الأملاح، وبعدها نرشّح لك أنظمة من الكتالوج مع سبب واضح لكل ترشيح
            وما ينبغي الحذر منه. الأداة إرشادية ولا تُصدر تحليلًا مخبريًا للمياه.
          </p>

          {!result ? (
            <div className="mt-7 rounded-xl border border-ink-100 bg-surface p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                {STEPS.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStep(index)}
                    aria-label={`الخطوة ${index + 1}: ${item.title}`}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition",
                      index < step ? "bg-flow-500" : index === step ? "bg-brand-600" : "bg-ink-150"
                    )}
                  />
                ))}
              </div>

              <p className="text-[11.5px] font-bold text-aqua-600">
                السؤال {step + 1} من {STEPS.length}
              </p>
              <h2 className="mt-1 font-display text-lg font-extrabold text-ink-950">{STEPS[step].title}</h2>

              <div className="mt-4 space-y-4">
                {STEPS[step].key === "housing" && (
                  <RadioCardGroup
                    legend="نوع المكان"
                    name="housing"
                    columns={2}
                    value={answers.housing}
                    onChange={(value) => update("housing", value as Housing)}
                    options={[
                      { id: "apartment", label: "شقة", description: "مساحة محدودة وتحت المغسلة", icon: "building" },
                      { id: "villa", label: "فيلا أو دور مستقل", description: "نقاط استخدام متعددة", icon: "home" },
                      { id: "office", label: "مكتب", description: "مياه شرب للموظفين", icon: "user" },
                      { id: "commercial", label: "منشأة تجارية", description: "مطعم، مقهى، فندق، مصنع", icon: "store" },
                    ]}
                  />
                )}

                {STEPS[step].key === "usage" && (
                  <RadioCardGroup
                    legend="الغرض الأساسي"
                    name="usage"
                    columns={2}
                    value={answers.usage}
                    onChange={(value) => update("usage", value as Usage)}
                    options={[
                      { id: "drinking", label: "مياه شرب وطبخ", description: "نظام تحت المغسلة أو مباشر" },
                      { id: "whole-home", label: "المياه في المنزل بالكامل", description: "فلترة مركزية عند المدخل" },
                      { id: "kitchen", label: "حل بسيط للمطبخ", description: "جهاز على الطاولة أو بدون تركيب" },
                      { id: "cartridge", label: "استبدال قطع فقط", description: "شمعات، ممبرين، فلتر ما بعد المعالجة" },
                    ]}
                  />
                )}

                {STEPS[step].key === "users" && (
                  <RadioCardGroup
                    legend="عدد المستخدمين"
                    name="users"
                    columns={2}
                    value={answers.users}
                    onChange={(value) => update("users", value as Users)}
                    options={USERS_OPTIONS}
                  />
                )}

                {STEPS[step].key === "consumption" && (
                  <RadioCardGroup
                    legend="معدل الاستهلاك التقريبي"
                    name="consumption"
                    columns={2}
                    value={answers.consumption}
                    onChange={(value) => update("consumption", value as Consumption)}
                    options={CONSUMPTION_OPTIONS}
                  />
                )}

                {STEPS[step].key === "source" && (
                  <div className="space-y-4">
                    <RadioCardGroup
                      legend="مصدر المياه"
                      name="source"
                      columns={2}
                      value={answers.source}
                      onChange={(value) => update("source", value as Source)}
                      options={SOURCE_OPTIONS}
                    />
                    <label className="block">
                      <span className="mb-1 block text-[12.5px] font-bold text-ink-800">المدينة</span>
                      <select
                        value={answers.city}
                        onChange={(event) => update("city", event.target.value)}
                        className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        <option value="">اختر مدينتك…</option>
                        {CITY_OPTIONS.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-ink-400">
                        تُستخدم المدينة لعرض نطاق الخدمة المعلن فقط، ولا تُرسل لأي جهة خارجية.
                      </span>
                    </label>
                  </div>
                )}

                {STEPS[step].key === "tds" && (
                  <div className="space-y-4">
                    <RadioCardGroup
                      legend="قراءة الأملاح الذائبة (TDS) — إن كانت متاحة"
                      name="tds"
                      columns={2}
                      value={answers.tds}
                      onChange={(value) => update("tds", value as TdsBand)}
                      options={TDS_OPTIONS}
                    />
                    <RadioCardGroup
                      legend="ما الذي تلاحظه على المياه؟"
                      name="problem"
                      columns={2}
                      value={answers.problem}
                      onChange={(value) => update("problem", value as Problem)}
                      options={PROBLEM_OPTIONS}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  disabled={step === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
                >
                  <Icon name="chevronRight" size={15} />
                  السابق
                </button>

                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentFilled) return;
                      setStep((value) => value + 1);
                    }}
                    disabled={!currentFilled}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-50"
                  >
                    التالي
                    <Icon name="chevronLeft" size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!currentFilled}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-flow-700 disabled:opacity-50"
                  >
                    <Icon name="sparkles" size={16} />
                    اعرض الترشيح
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-7 space-y-6">
              <div className="rounded-xl border border-flow-200 bg-flow-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge tone="success" icon="sparkles">
                      ترشيح جاهز
                    </Badge>
                    <h2 className="mt-2 font-display text-[17px] font-extrabold text-flow-900">
                      {result.recommendations.length > 0
                        ? `${result.recommendations.length} خيارات مرتّبة حسب إجاباتك`
                        : "لا يوجد ترشيح مطابق تمامًا"}
                    </h2>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-flow-800">{summaryLine}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-flow-300 bg-surface px-4 text-[12.5px] font-bold text-flow-800"
                    >
                      <Icon name="refresh" size={15} />
                      أعد الإجابة
                    </button>
                    <Link
                      to="/help/contact"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
                    >
                      <Icon name="message" size={15} />
                      راجع الترشيح مع فني
                    </Link>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4 text-[12.5px] leading-6",
                  result.coverage.covered ? "border-flow-200 bg-flow-50 text-flow-900" : "border-ink-150 bg-paper text-ink-700"
                )}
              >
                <p className="flex items-start gap-2">
                  <Icon name="mapPin" size={15} className="mt-0.5 shrink-0" />
                  <span>{result.coverage.label}</span>
                </p>
              </div>

              {result.recommendations.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {result.recommendations.map((entry, index) => (
                      <li key={entry.summary.slug} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="grid size-6 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                                {index + 1}
                              </span>
                              <Link
                                to={`/p/${entry.summary.slug}`}
                                className="font-display text-[15px] font-extrabold text-ink-950 hover:text-brand-700"
                              >
                                {entry.summary.name}
                              </Link>
                              {entry.summary.badge && <Badge tone={entry.summary.badge.tone}>{entry.summary.badge.label}</Badge>}
                            </div>
                            <p className="mt-1 text-[11.5px] text-ink-500">
                              {entry.summary.categoryName} · {entry.summary.subcategoryName} · {entry.summary.brand}
                            </p>
                          </div>
                          <span className="font-display text-[15px] font-extrabold tabular-nums text-ink-950">
                            {entry.summary.price.toLocaleString("ar-SA")} ر.س
                          </span>
                        </div>

                        <p className="mt-2.5 text-[11.5px] font-bold text-flow-800">لماذا هذا الخيار؟</p>
                        <ul className="mt-1 space-y-1">
                          {entry.reasons.slice(0, 5).map((reason) => (
                            <li key={reason} className="flex items-start gap-1.5 text-[12px] leading-6 text-ink-700">
                              <Icon name="checkCircle" size={13} className="mt-1 shrink-0 text-flow-600" />
                              {reason}
                            </li>
                          ))}
                        </ul>

                        {entry.cautions.length > 0 && (
                          <ul className="mt-2 space-y-1 rounded-lg border border-warning/25 bg-warning-soft p-2.5">
                            {entry.cautions.map((caution) => (
                              <li key={caution} className="flex items-start gap-1.5 text-[11.5px] leading-6 text-ink-700">
                                <Icon name="alert" size={12} className="mt-1 shrink-0 text-warning" />
                                {caution}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            to={`/p/${entry.summary.slug}`}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-[12px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                          >
                            <Icon name="cart" size={14} />
                            اعرض الخيار وأضفه للسلة
                          </Link>
                          <Link
                            to="/services/book"
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 bg-paper px-4 text-[12px] font-bold text-ink-700 transition hover:bg-ink-50"
                          >
                            <Icon name="wrench" size={14} />
                            اطلب تركيبًا
                          </Link>
                          <Link
                            to="/compatibility"
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 bg-paper px-4 text-[12px] font-bold text-ink-600 transition hover:bg-ink-50"
                          >
                            <Icon name="search" size={14} />
                            فاحص توافق القطع
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-ink-100 bg-paper p-4">
                    <h2 className="font-display text-[14px] font-extrabold text-ink-950">ملاحظات مهمة على الترشيح</h2>
                    <ul className="mt-2 space-y-1.5">
                      {result.notes.map((note) => (
                        <li key={note} className="flex items-start gap-2 text-[12px] leading-6 text-ink-600">
                          <Icon name="info" size={13} className="mt-1 shrink-0 text-ink-400" />
                          {note}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-3.5 text-[11.5px] font-bold text-ink-700"
                    >
                      <Icon name={showAll ? "chevronRight" : "chevronLeft"} size={13} />
                      {showAll ? "إخفاء كل الأنظمة" : "تصفّح كل الأنظمة المناسبة"}
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon="search"
                  title="لم نجد نظامًا مطابقًا لكل الإجابات"
                  description="قد تحتاج حالتك قياسًا ميدانيًا قبل الترشيح — أرسل لنا المصدر والاستهلاك وسنرشّح الخيار الأنسب، أو احجز زيارة فحص مياه."
                  action={{ label: "احجز فحص مياه", href: "/services/water-test" }}
                  secondaryAction={{ label: "تصفّح كل الأنظمة", href: "/c/water-filters" }}
                />
              )}

              {showAll && (
                <ProductGrid
                  items={
                    result.recommendations.length > 0
                      ? result.recommendations.map((entry) => entry.summary)
                      : []
                  }
                />
              )}

              {suggestedGuide && (
                <div className="rounded-xl border border-ink-100 bg-paper p-5">
                  <h2 className="font-display text-[14px] font-extrabold text-ink-950">اقرأ قبل أن تقرر</h2>
                  <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                    الدليل التالي يشرح الفروق العملية بين الخيارات، ويساعدك على طرح الأسئلة الصحيحة على الفني.
                  </p>
                  <Link
                    to={`/guides/${suggestedGuide.slug}`}
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
                  >
                    {suggestedGuide.title}
                    <Icon name="arrowLeft" size={14} />
                  </Link>
                </div>
              )}

              <ServiceAvailabilityPanel city={answers.city} />

              <div className="rounded-xl border border-ink-100 bg-surface p-5">
                <h2 className="font-display text-[14px] font-extrabold text-ink-950">تحتاج قياس TDS أولًا؟</h2>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  جهاز قياس الأملاح الذائبة يساعد على تحديد حجم المشكلة ومتابعة أداء النظام لاحقًا — أو احجز زيارة فحص مياه
                  لتأخذ قراءة ميدانية.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/c/testing/tds-meters"
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    <Icon name="gauge" size={15} />
                    أجهزة قياس TDS
                  </Link>
                  <Link
                    to="/services/water-test"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-paper px-4 text-[12.5px] font-bold text-ink-700"
                  >
                    <Icon name="droplet" size={15} />
                    زيارة فحص مياه
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
