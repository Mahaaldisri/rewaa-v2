import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, Disclosure, Skeleton } from "@/components/ui/primitives";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";
import { CalculatorResults } from "@/components/calculator/CalculatorResults";
import type { Recommendation } from "@/components/calculator/CalculatorResults";
import { usePageSeo, breadcrumbSchema } from "@/lib/seo";
import { formatDate, formatMoney } from "@/lib/format";
import { calculate, DEFAULT_MONTHS, savingsBand } from "@/lib/calculator-logic";
import { calculatorApi } from "@/services/calculatorApi";
import type { SavedCalculation } from "@/services/calculatorApi";
import { track } from "@/services/analytics";
import type { CalculatorInput } from "@/types/calculator";
import type { ProductSummary } from "@/types/catalog";

/** Conservative starting point — every number stays editable in the form. */
const DEFAULT_INPUT: CalculatorInput = {
  mode: "estimate",
  estimate: { people: 4, litersPerPersonPerDay: 3, extraMonthlyCost: 0 },
  purchases: { presetId: "gallon", unitLiters: 18.9, unitPrice: 12, unitsPerPeriod: 6, frequency: "monthly" },
  ownership: {
    devicePrice: 0,
    installationCost: 0,
    initialAccessoriesCost: 0,
    replacementKitPrice: 0,
    replacementIntervalMonths: 0,
    maintenancePrice: 0,
    maintenanceIntervalMonths: 12,
    extraMonthlyCost: 0,
    manual: true,
  },
  months: DEFAULT_MONTHS,
  waterPriceGrowthPercent: 0,
};

/**
 * Reads a shared calculation back from the URL. Only numbers the shopper
 * entered are encoded — never personal data, never a saved identity.
 */
function inputFromParams(params: URLSearchParams): CalculatorInput {
  const num = (key: string, fallback: number): number => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  const mode = params.get("mode") === "purchases" ? "purchases" : "estimate";
  const presetId = params.get("preset") ?? DEFAULT_INPUT.purchases.presetId;
  const frequency = params.get("freq") === "weekly" ? "weekly" : "monthly";
  const productSlug = params.get("device") ?? undefined;

  return {
    mode,
    estimate: {
      people: Math.max(1, num("people", DEFAULT_INPUT.estimate.people)),
      litersPerPersonPerDay: Math.max(1, num("lpp", DEFAULT_INPUT.estimate.litersPerPersonPerDay)),
      extraMonthlyCost: num("extra", 0),
    },
    purchases: {
      presetId,
      unitLiters: Math.max(0.25, num("unitLiters", DEFAULT_INPUT.purchases.unitLiters)),
      unitPrice: num("unitPrice", DEFAULT_INPUT.purchases.unitPrice),
      unitsPerPeriod: num("units", DEFAULT_INPUT.purchases.unitsPerPeriod),
      frequency,
    },
    ownership: {
      productSlug,
      devicePrice: num("price", 0),
      installationCost: num("inst", 0),
      initialAccessoriesCost: 0,
      replacementKitPrice: num("kit", 0),
      replacementIntervalMonths: num("kitMonths", 0),
      maintenancePrice: num("maint", 0),
      maintenanceIntervalMonths: num("maintMonths", DEFAULT_INPUT.ownership.maintenanceIntervalMonths),
      extraMonthlyCost: 0,
      manual: params.get("manual") === "0" ? false : !productSlug || params.get("manual") === "1",
    },
    months: Math.min(240, Math.max(6, num("months", DEFAULT_MONTHS))),
    waterPriceGrowthPercent: Math.min(40, num("growth", 0)),
  };
}

function paramsFromInput(input: CalculatorInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", input.mode);
  params.set("people", String(input.estimate.people));
  params.set("lpp", String(input.estimate.litersPerPersonPerDay));
  if (input.estimate.extraMonthlyCost > 0) params.set("extra", String(input.estimate.extraMonthlyCost));
  params.set("preset", input.purchases.presetId);
  params.set("unitLiters", String(input.purchases.unitLiters));
  params.set("unitPrice", String(input.purchases.unitPrice));
  params.set("units", String(input.purchases.unitsPerPeriod));
  params.set("freq", input.purchases.frequency);
  if (input.ownership.productSlug) params.set("device", input.ownership.productSlug);
  params.set("price", String(input.ownership.devicePrice));
  params.set("inst", String(input.ownership.installationCost));
  params.set("kit", String(input.ownership.replacementKitPrice));
  params.set("kitMonths", String(input.ownership.replacementIntervalMonths));
  params.set("maint", String(input.ownership.maintenancePrice));
  params.set("maintMonths", String(input.ownership.maintenanceIntervalMonths));
  params.set("months", String(input.months));
  params.set("growth", String(input.waterPriceGrowthPercent));
  params.set("manual", input.ownership.manual ? "1" : "0");
  return params;
}

/**
 * Water-savings calculator: `/calculator`.
 *
 * Compares what the household pays for drinking water today against owning a
 * filtration system, over an editable horizon. Every figure comes from the
 * catalogue through `calculatorApi` or from the shopper's own inputs — the page
 * never invents water quality, coverage or consumption data.
 */
export function CalculatorPage() {
  const [searchParams] = useSearchParams();
  const [devices, setDevices] = useState<ProductSummary[] | null>(null);
  const [input, setInput] = useState<CalculatorInput>(() => inputFromParams(searchParams));
  const [saved, setSaved] = useState<SavedCalculation[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>();
  const [costMissing, setCostMissing] = useState<string[]>([]);
  const startedRef = useRef(false);
  const completedRef = useRef<string>("");

  const maintenanceHint = useMemo(() => calculatorApi.suggestedMaintenancePrice(), []);
  const result = useMemo(() => calculate(input), [input]);
  const band = savingsBand(result.savings);

  usePageSeo({
    title: "حاسبة توفير المياه — مياه معبأة مقابل فلتر | رواء",
    description:
      "قارن ما تصرفه على مياه الشرب المعبأة مع تكلفة شراء وتشغيل نظام تنقية من رواء، وشاهد نقطة التعادل والتوفير المتوقع خلال المدة التي تختارها. الأرقام قابلة للتعديل بالكامل.",
    canonical: "/calculator",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "حاسبة التوفير", href: "/calculator" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "حاسبة توفير المياه — رواء",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "ar-SA",
        offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
      },
    ],
  });

  /* ------------------------------- Loading ------------------------------- */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [list, stored] = await Promise.all([calculatorApi.devices(), calculatorApi.listSaved()]);
      if (cancelled) return;
      setDevices(list);
      setSaved(stored);

      // Pre-fill from a shared link: pull the real costs for the shared device.
      const sharedSlug = searchParams.get("device");
      if (sharedSlug) {
        const cost = await calculatorApi.costModel(sharedSlug);
        if (cancelled || !cost) return;
        setCostMissing(cost.missingData);
        setInput((current) => ({
          ...current,
          ownership: {
            ...calculatorApi.ownershipFrom(cost, { maintenanceIntervalMonths: current.ownership.maintenanceIntervalMonths }),
            // Values typed in by the sender win over catalogue defaults.
            devicePrice: cost.devicePrice,
            maintenancePrice: current.ownership.maintenancePrice,
            maintenanceIntervalMonths: current.ownership.maintenanceIntervalMonths,
          },
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once: later device picks are handled by pickDevice().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ Analytics ------------------------------ */
  useEffect(() => {
    if (!startedRef.current && result.monthlyBottledCost > 0) {
      startedRef.current = true;
      track("calculator_started", { mode: input.mode });
    }
    const fingerprint = `${input.mode}|${input.months}|${result.monthlyLiters.toFixed(0)}|${Math.round(result.savings)}`;
    if (startedRef.current && completedRef.current !== fingerprint) {
      completedRef.current = fingerprint;
      track("calculator_completed", {
        mode: input.mode,
        months: input.months,
        break_even_month: result.breakEvenMonth,
        savings: Math.round(result.savings),
        currency: "SAR",
        product_slug: input.ownership.productSlug,
      });
    }
  }, [input.mode, input.months, input.estimate.people, input.ownership.productSlug, result]);

  const patch = useCallback((next: Partial<CalculatorInput>) => {
    setSavedMessage(undefined);
    setInput((current) => ({ ...current, ...next }));
  }, []);

  const pickDevice = useCallback(
    async (slug: string) => {
      const cost = await calculatorApi.costModel(slug);
      if (!cost) return;
      setCostMissing(cost.missingData);
      setInput((current) => ({
        ...current,
        ownership: {
          ...calculatorApi.ownershipFrom(cost, { maintenanceIntervalMonths: current.ownership.maintenanceIntervalMonths }),
          maintenancePrice: current.ownership.maintenancePrice || maintenanceHint.value,
        },
      }));
      track("calculator_product_selected", { product_slug: slug, source: "catalog" });
    },
    [maintenanceHint.value]
  );

  /* ---------------------------- Recommendations --------------------------- */
  const { recommendations, recLoading } = useRecommendations(result.monthlyLiters, input);

  const shareUrl = useCallback(() => {
    const params = paramsFromInput(input);
    track("calculator_shared", { months: input.months, savings_band: band });
    const base = typeof window === "undefined" ? "/calculator" : `${window.location.origin}/calculator`;
    const url = `${base}?${params.toString()}`;
    void navigator.clipboard?.writeText?.(url).catch(() => undefined);
    return url;
  }, [band, input]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const record = await calculatorApi.save({
        label: `${input.ownership.productName ?? (input.mode === "estimate" ? "تقدير استهلاك" : "مشتريات حالية")} — ${input.months} شهرًا`,
        months: input.months,
        savings: Math.round(result.savings),
        productSlug: input.ownership.productSlug,
        shareParams: Object.fromEntries(paramsFromInput(input)),
      });
      setSaved((current) => [record, ...current].slice(0, 12));
      setSavedMessage(
        "حُفظت النتيجة في هذا المتصفح فقط (بدون بيانات شخصية)، ويمكنك الرجوع إليها لاحقًا من نفس الجهاز."
      );
      track("calculator_saved", { months: input.months });
    } finally {
      setSaving(false);
    }
  }, [input, result.savings]);

  const restart = useCallback(() => {
    setCostMissing([]);
    setSavedMessage(undefined);
    setInput({ ...DEFAULT_INPUT });
  }, []);

  const showResults = result.monthlyBottledCost > 0 || input.ownership.devicePrice > 0;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حاسبة التوفير", href: "/calculator" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <header className="mx-auto max-w-3xl text-center">
          <Badge tone="aqua" icon="percent">
            أداة مجانية بدون تسجيل
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950 sm:text-4xl">
            كم توفّر فعلًا إذا تركت المياه المعبأة؟
          </h1>
          <p className="mt-3 text-[13.5px] leading-7 text-ink-600">
            أدخل استهلاكك أو مشترياتك الحالية، واختر نظامًا من الكتالوج — ثم شاهد نقطة التعادل والتوفير المتوقع خلال المدة
            التي تختارها. كل رقم قابل للتعديل، ولا نضيف أي قيمة لم تُدخلها أو لم تُعلَن في بيانات المنتج.
          </p>
        </header>

        <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <CalculatorForm
              input={input}
              onChange={patch}
              devices={devices ?? []}
              onPickDevice={(slug) => void pickDevice(slug)}
              maintenanceHint={maintenanceHint}
              missingForProduct={costMissing}
            />

            {saved.length > 0 && (
              <section className="mt-5 rounded-xl border border-ink-100 bg-surface p-4">
                <h2 className="font-display text-[14px] font-extrabold text-ink-950">حسابات محفوظة على هذا المتصفح</h2>
                <ul className="mt-3 space-y-2">
                  {saved.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-paper px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-bold text-ink-900">{entry.label}</span>
                        <span className="text-[11px] text-ink-500">
                          {formatDate(entry.createdAt)} · توفير {formatMoney(entry.savings)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInput(inputFromParams(new URLSearchParams(entry.shareParams)));
                            setSavedMessage("استرجعنا الأرقام المحفوظة — يمكنك تعديلها الآن.");
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-ink-200 bg-surface px-2.5 text-[11.5px] font-bold text-ink-700"
                        >
                          <Icon name="refresh" size={12} />
                          استرجاع
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await calculatorApi.removeSaved(entry.id);
                            setSaved((current) => current.filter((item) => item.id !== entry.id));
                          }}
                          aria-label={`حذف الحساب ${entry.label}`}
                          className="inline-flex size-8 items-center justify-center rounded-md border border-ink-200 bg-surface text-ink-500 hover:text-danger"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] leading-6 text-ink-500">
                  التخزين محلي في متصفحك فقط — لا يُرسَل إلى أي خادم، ويزول بمسح بيانات المتصفح.
                </p>
              </section>
            )}

            <div className="mt-5 space-y-3">
              <Disclosure title="كيف تُحسب الأرقام؟" icon="info">
                <ul className="space-y-2 text-[12.5px] leading-6 text-ink-600">
                  <li>الاستهلاك الشهري = عدد المستخدمين × استهلاك الفرد اليومي × 30 يومًا (أو من مشترياتك الفعلية).</li>
                  <li>نفس كمية المياه تُقارن على الجانبين: شراء المياه المعبأة مقابل امتلاك الفلتر.</li>
                  <li>تكلفة الفلتر تشمل الشراء والتركيب في الشهر الأول، ثم الشمعات والصيانة عند استحقاقها فقط.</li>
                  <li>نقطة التعادل = أول شهر تنخفض فيه التكلفة التراكمية للفلتر إلى مستوى الشراء أو أقل.</li>
                  <li>أي قيمة غير متوفرة في بيانات المنتج تظهر كبيانات ناقصة وتُترك لك — لا نخمّنها.</li>
                </ul>
              </Disclosure>
              <Disclosure title="ما لا تقوله هذه الحاسبة" icon="alert">
                <p className="text-[12.5px] leading-6 text-ink-600">
                  لا نُصدر أي رأي في جودة مياهك، ولا نقدّم نتائج فحص أو تحليل مخبري. الترشيحات مبنية على خصائص المنتجات
                  المُعلنة في الكتالوج وعلى الأرقام التي تدخلها أنت، وقد تختلف التكلفة الفعلية حسب الاستخدام وأسعار السوق.
                  وللحصول على توصية مبنية على مياهك، اطلب زيارة فحص مياه من صفحة الخدمات.
                </p>
              </Disclosure>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            {showResults ? (
              <CalculatorResults
                input={input}
                result={result}
                recommendations={recommendations}
                onUseProduct={(slug) => void pickDevice(slug)}
                onShare={shareUrl}
                onSave={save}
                onRestart={restart}
                onPatch={patch}
                onOpenBreakEven={(month) => track("calculator_break_even_viewed", { month })}
                onRecommendationClick={(slug, action) => track("calculator_recommendation_click", { product_slug: slug, action })}
                saving={saving}
                savedMessage={savedMessage}
              />
            ) : (
              <div className="rounded-xl border border-ink-100 bg-surface p-5 text-center">
                <Icon name="percent" size={28} className="mx-auto text-ink-300" />
                <p className="mt-3 text-[13px] font-bold text-ink-800">أدخل استهلاكك أو اختر نظامًا لعرض النتيجة</p>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-500">
                  الحاسبة تعمل بدون تسجيل، وتحفظ نتائجك في متصفحك فقط.
                </p>
              </div>
            )}

            {recLoading && (
              <div className="mt-5 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            <p className="mt-5 flex items-start gap-2 rounded-xl border border-ink-100 bg-paper p-3.5 text-[11.5px] leading-6 text-ink-500">
              <Icon name="mapPin" size={14} className="mt-0.5 shrink-0 text-ink-400" />
              <span>
                التوصيل والتركيب حسب تغطية الخدمة المتاحة على{" "}
                <Link to="/services" className="font-bold text-brand-700 hover:underline">
                  صفحة الخدمات
                </Link>
                ، وتُعرض التكلفة النهائية قبل تأكيد أي طلب. القيم الافتراضية تقديرية وقابلة للتعديل.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ranks up to three catalogue devices against the entered consumption and
 * prices each one through the same timeline used by the main comparison, so a
 * card's numbers are consistent with the hero result.
 */
function useRecommendations(
  liters: number,
  input: CalculatorInput
): { recommendations: Recommendation[]; recLoading: boolean } {
  const [entries, setEntries] = useState<{ summary: ProductSummary; reason: string }[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const signature = `${Math.round(liters)}|${input.months}|${input.ownership.devicePrice}`;

  useEffect(() => {
    let cancelled = false;
    if (liters <= 0) {
      setEntries([]);
      setRecLoading(false);
      return;
    }
    setRecLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const list = await calculatorApi.recommendations({ monthlyLiters: liters });
        if (cancelled) return;
        setEntries(list.map((entry) => ({ summary: entry.summary, reason: entry.reason })));
        setRecLoading(false);
      })();
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signature, liters]);

  const recommendations = useMemo<Recommendation[]>(
    () =>
      entries.map(({ summary, reason }) => {
        const projection = calculate({
          ...input,
          ownership: { ...input.ownership, productSlug: summary.slug, devicePrice: summary.price, manual: true },
        });
        return {
          summary,
          reason,
          estimatedOwnership: summary.price,
          breakEvenMonth: projection.breakEvenMonth,
          savings: projection.savings,
        };
      }),
    [entries, input]
  );

  return { recommendations, recLoading };
}
