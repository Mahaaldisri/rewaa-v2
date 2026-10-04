import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { breakEvenSentence, formatRiyals } from "@/lib/calculator-logic";
import type { CalculatorInput, CalculatorResult } from "@/types/calculator";
import type { ProductSummary } from "@/types/catalog";
import { useStore } from "@/store/StoreProvider";
import { cn } from "@/utils/cn";

/** The chart is the only heavy piece — loaded on demand. */
const BreakEvenChart = lazy(() => import("./BreakEvenChart"));

export interface Recommendation {
  summary: ProductSummary;
  reason: string;
  estimatedOwnership: number;
  /** Break-even and savings for this specific product, when computable. */
  breakEvenMonth: number | null;
  savings: number;
}

interface Props {
  input: CalculatorInput;
  result: CalculatorResult;
  recommendations: Recommendation[];
  onUseProduct: (slug: string) => void;
  onShare: () => string;
  onSave: () => Promise<void>;
  onRestart: () => void;
  /** Applies a partial input patch — used by the what-if sliders. */
  onPatch: (patch: Partial<CalculatorInput>) => void;
  onOpenBreakEven: (month: number | null) => void;
  onRecommendationClick: (slug: string, action: "view" | "compare" | "use") => void;
  saving: boolean;
  savedMessage?: string;
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tone === "good" ? "border-flow-200 bg-flow-50" : tone === "warn" ? "border-warning/25 bg-warning-soft" : "border-ink-100 bg-surface"
      )}
    >
      <p className="text-[11.5px] font-semibold text-ink-500">{label}</p>
      <p className="mt-1 font-display text-[18px] font-extrabold tabular-nums text-ink-950">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-5 text-ink-500">{hint}</p>}
    </div>
  );
}

/** Animates a number once, respecting reduced-motion. */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function CalculatorResults({
  input,
  result,
  recommendations,
  onUseProduct,
  onShare,
  onSave,
  onRestart,
  onPatch,
  onOpenBreakEven,
  onRecommendationClick,
  saving,
  savedMessage,
}: Props) {
  const { pushToast, toggleCompare, isCompared } = useStore();
  const [shareUrl, setShareUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const animatedSavings = useCountUp(Math.max(0, result.savings));

  const monthsLabel = result.months % 12 === 0 ? `${result.months / 12} سنة` : `${result.months} شهرًا`;

  return (
    <div className="space-y-5">
      {/* ------------------------------ Savings hero ----------------------------- */}
      <section className="rounded-2xl border border-flow-200 bg-gradient-to-b from-flow-50 to-surface p-5 sm:p-6">
        <Badge tone="success" icon="sparkles">
          توفيرك المتوقع خلال {monthsLabel}
        </Badge>
        <p className="mt-3 font-display text-4xl font-extrabold tabular-nums text-flow-900 sm:text-5xl">
          {formatMoney(Math.max(0, Math.round(animatedSavings)))}
        </p>
        {result.savings <= 0 && (
          <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">
            بهذه الأرقام لا يوجد توفير خلال المدة المختارة — جرّب مدة أطول أو راجع تكاليف الاستبدال والصيانة.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="نقطة التعادل"
            value={result.breakEvenMonth ? `بعد ${result.breakEvenMonth} شهرًا` : "لم تتحقق بعد"}
            hint={result.breakEvenMonth ? "الشهر الذي تبدأ فيه تكلفة الفلتر بالانخفاض عن الشراء" : "خلال المدة المختارة"}
            tone={result.breakEvenMonth ? "good" : "warn"}
          />
          <MetricCard
            label="انخفاض متوسط تكلفة اللتر"
            value={result.costPerLiterDropPercent > 0 ? `${Math.round(result.costPerLiterDropPercent)}%` : "—"}
            hint={
              result.bottledCostPerLiter > 0
                ? `من ${result.bottledCostPerLiter.toFixed(2)} ر.س/لتر إلى ${result.filterCostPerLiter.toFixed(2)} ر.س/لتر`
                : "أكمل بيانات الاستهلاك لحسابها"
            }
            tone={result.costPerLiterDropPercent > 0 ? "good" : "neutral"}
          />
          <MetricCard
            label="متوسط التوفير الشهري"
            value={formatRiyals(Math.max(0, result.monthlyAverageSaving))}
            hint={`سنويًا ≈ ${formatRiyals(Math.max(0, result.annualSaving))}`}
          />
        </div>

        <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-6 text-ink-700">
          <Icon name="info" size={14} className="mt-1 shrink-0 text-flow-700" />
          {breakEvenSentence(result)}
        </p>
      </section>

      {/* ------------------------------- Breakdown ------------------------------ */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={`تكلفة شراء المياه (${monthsLabel})`}
          value={formatRiyals(result.bottledTotal)}
          hint={result.monthlyBottledCost > 0 ? `${formatRiyals(result.monthlyBottledCost)} شهريًا` : "أدخل مصروفك الحالي"}
        />
        <MetricCard
          label="تكلفة امتلاك الفلتر"
          value={formatRiyals(result.filterTotal)}
          hint={`منها ${formatRiyals(result.initialCost)} شراء وتركيب، و${formatRiyals(Math.max(0, result.recurringCost))} تشغيل`}
        />
        <MetricCard
          label="الاستهلاك الشهري"
          value={result.monthlyLiters > 0 ? `${Math.round(result.monthlyLiters).toLocaleString("ar-SA")} لتر` : "—"}
          hint="نفس الكمية تُقارن على الجانبين"
        />
        <MetricCard
          label="تكلفة اللتر"
          value={
            result.bottledCostPerLiter > 0
              ? `${result.bottledCostPerLiter.toFixed(2)} ر.س`
              : "—"
          }
          hint={
            result.filterCostPerLiter > 0
              ? `الفلتر بعد توزيع التكلفة: ${result.filterCostPerLiter.toFixed(2)} ر.س/لتر`
              : undefined
          }
        />
      </section>

      {/* -------------------------------- Chart -------------------------------- */}
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <div
          onClickCapture={() => onOpenBreakEven(result.breakEvenMonth)}
          role="presentation"
        >
          <BreakEvenChart timeline={result.timeline} breakEvenMonth={result.breakEvenMonth} monthsLabel={monthsLabel} />
        </div>
      </Suspense>

      {result.missingData.length > 0 && (
        <section className="rounded-xl border border-warning/25 bg-warning-soft p-4">
          <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink-900">
            <Icon name="alert" size={15} className="text-warning" />
            بيانات ناقصة لم نخمّنها
          </p>
          <ul className="mt-1.5 list-disc ps-5 text-[12px] leading-6 text-ink-700">
            {result.missingData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------- Assumptions ----------------------------- */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4">
        <h2 className="font-display text-[14px] font-extrabold text-ink-950">الافتراضات المستخدمة في الحساب</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {result.assumptions.map((assumption) => (
            <div key={assumption.label} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-paper px-3 py-2">
              <dt className="text-[12px] text-ink-600">{assumption.label}</dt>
              <dd className="text-[12px] font-bold tabular-nums text-ink-900">{assumption.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11.5px] leading-6 text-ink-500">
          القيم المعروضة تقديرية وتعتمد على البيانات التي أدخلتها وأسعار المنتجات والخدمات المتاحة حاليًا. الاستهلاك الفعلي
          والتكاليف قد تختلف.
        </p>
      </section>

      {/* ------------------------- Sensitivity (advanced) ------------------------ */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between gap-3 text-start"
        >
          <span>
            <span className="block font-display text-[14px] font-extrabold text-ink-950">تحليل «ماذا لو؟»</span>
            <span className="mt-0.5 block text-[11.5px] text-ink-500">
              اختياري — لمعرفة أثر تغيّر الأسعار أو الاستهلاك أو الصيانة على النتيجة.
            </span>
          </span>
          <Icon name={advancedOpen ? "chevronUp" : "chevronDown"} size={16} className="shrink-0 text-ink-400" />
        </button>

        {advancedOpen && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  label: "إذا ارتفع سعر المياه",
                  value: input.waterPriceGrowthPercent,
                  onChange: (value: number) => ({ waterPriceGrowthPercent: value }),
                  suffix: "% سنويًا",
                  min: 0,
                  max: 40,
                },
                {
                  label: "إذا زاد عدد المستخدمين",
                  value: input.estimate.people,
                  onChange: (value: number) => ({ estimate: { ...input.estimate, people: value } }),
                  suffix: "أشخاص",
                  min: 1,
                  max: 12,
                },
                {
                  label: "إذا تغيّرت تكلفة الصيانة",
                  value: input.ownership.maintenancePrice,
                  onChange: (value: number) => ({ ownership: { ...input.ownership, maintenancePrice: value } }),
                  suffix: "ر.س للزيارة",
                  min: 0,
                  max: 600,
                },
              ]
            ).map((control) => (
              <label key={control.label} className="block rounded-lg border border-ink-100 bg-paper p-3">
                <span className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink-700">
                  {control.label}
                  <span className="font-bold tabular-nums text-ink-950">
                    {control.value} {control.suffix}
                  </span>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  value={control.value}
                  aria-label={control.label}
                  onChange={(event) => onPatch(control.onChange(Number(event.target.value)))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-700"
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------- Recommendations --------------------------- */}
      {recommendations.length > 0 && (
        <section className="rounded-xl border border-ink-100 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[14px] font-extrabold text-ink-950">أنظمة قد تناسب احتياجك</h2>
            <span className="text-[11px] text-ink-400">ترشيح إرشادي من الكتالوج — ليس تحليلًا لمياهك</span>
          </div>
          <ul className="mt-3 grid gap-3 lg:grid-cols-3">
            {recommendations.map((entry) => (
              <li key={entry.summary.slug} className="flex flex-col rounded-xl border border-ink-100 bg-paper p-3.5">
                <Link
                  to={`/p/${entry.summary.slug}`}
                  className="font-display text-[13.5px] font-bold text-ink-950 hover:text-brand-700"
                  onClick={() => onRecommendationClick(entry.summary.slug, "view")}
                >
                  {entry.summary.name}
                </Link>
                <p className="mt-1 flex-1 text-[11.5px] leading-6 text-ink-600">{entry.reason}</p>
                <dl className="mt-2 space-y-1 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-500">السعر</dt>
                    <dd className="font-bold tabular-nums text-ink-900">{formatMoney(entry.summary.price)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-500">التعادل التقديري</dt>
                    <dd className="font-bold tabular-nums text-ink-900">
                      {entry.breakEvenMonth ? `${entry.breakEvenMonth} شهرًا` : "لم يتحقق"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-500">التوفير المتوقع</dt>
                    <dd className="font-bold tabular-nums text-flow-800">{formatRiyals(Math.max(0, entry.savings))}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onRecommendationClick(entry.summary.slug, "use");
                      onUseProduct(entry.summary.slug);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-[11.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    <Icon name="refresh" size={13} />
                    احسب بهذا الجهاز
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      onRecommendationClick(entry.summary.slug, "compare");
                      if (!isCompared(entry.summary.id)) {
                        await toggleCompare({ id: entry.summary.id, name: entry.summary.name, slug: entry.summary.slug });
                      }
                      pushToast({ tone: "success", title: "أُضيف إلى المقارنة", duration: 2200 });
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-3 text-[11.5px] font-bold text-ink-700"
                  >
                    <Icon name="compare" size={13} />
                    أضف للمقارنة
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------ Actions ------------------------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await onSave();
          }}
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink-950 px-5 text-[12.5px] font-bold text-aqua-200 transition hover:bg-ink-900 disabled:opacity-60"
        >
          <Icon name="clipboard" size={15} />
          {saving ? "جارٍ الحفظ…" : "حفظ النتيجة"}
        </button>
        <button
          type="button"
          onClick={async () => {
            const url = onShare();
            setShareUrl(url);
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                pushToast({ tone: "success", title: "تم نسخ رابط الحساب", duration: 2400 });
              } else {
                pushToast({ tone: "info", title: "انسخ الرابط من الحقل أدناه", duration: 3000 });
              }
            } catch {
              pushToast({ tone: "info", title: "انسخ الرابط من الحقل أدناه", duration: 3000 });
            }
          }}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
        >
          <Icon name="share" size={15} />
          مشاركة الحساب
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
        >
          <Icon name="refresh" size={15} />
          ابدأ حسابًا جديدًا
        </button>
        <Link
          to="/c/water-filters"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-5 text-[12.5px] font-bold text-brand-800 transition hover:bg-brand-100"
        >
          <Icon name="compare" size={15} />
          قارن بجهاز آخر
        </Link>
      </section>

      {(savedMessage || shareUrl) && (
        <section className="space-y-2">
          {savedMessage && (
            <p className="rounded-lg border border-flow-200 bg-flow-50 p-3 text-[12px] leading-6 text-flow-900">{savedMessage}</p>
          )}
          {shareUrl && (
            <label className="block rounded-lg border border-ink-100 bg-paper p-3">
              <span className="text-[11.5px] font-semibold text-ink-600">رابط الحساب (بدون أي بيانات شخصية)</span>
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-1.5 h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[12px] text-ink-700"
                dir="ltr"
              />
            </label>
          )}
        </section>
      )}
    </div>
  );
}
