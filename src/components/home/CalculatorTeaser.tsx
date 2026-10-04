import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import {
  BOTTLE_PRESETS,
  calculate,
  DEFAULT_LITERS_PER_PERSON,
  formatRiyals,
} from "@/lib/calculator-logic";
import { calculatorApi } from "@/services/calculatorApi";
import { useAsync } from "@/hooks/useAsync";

/**
 * Homepage teaser for the savings calculator.
 *
 * The numbers are a clearly-labelled *sample*: one catalogue device priced by
 * `calculatorApi`, compared over five years for a four-person household at the
 * published default bottle price. Nothing here claims to describe the visitor's
 * own water or spending — the calculator itself is where they change it all.
 */
export function CalculatorTeaser() {
  const sample = useAsync(async () => {
    const devices = await calculatorApi.devices();
    // Prefer a well-known, in-stock device so the teaser reflects a real product.
    const device =
      devices.find((entry) => entry.stockStatus !== "out_of_stock" && entry.reviewCount > 10) ?? devices[0];
    if (!device) return null;
    const cost = await calculatorApi.costModel(device.slug);
    if (!cost) return null;

    const preset = BOTTLE_PRESETS.find((entry) => entry.id === "gallon") ?? BOTTLE_PRESETS[0];
    const ownership = calculatorApi.ownershipFrom(cost, { maintenanceIntervalMonths: 12 });
    const result = calculate({
      mode: "estimate",
      estimate: { people: 4, litersPerPersonPerDay: DEFAULT_LITERS_PER_PERSON, extraMonthlyCost: 0 },
      purchases: {
        presetId: preset.id,
        unitLiters: preset.unitLiters,
        unitPrice: preset.defaultUnitPrice,
        unitsPerPeriod: 6,
        frequency: "monthly",
      },
      ownership: { ...ownership, maintenancePrice: calculatorApi.suggestedMaintenancePrice().value },
      months: 60,
      waterPriceGrowthPercent: 0,
    });

    return { device, cost, preset, result };
  }, []);

  if (sample.loading && !sample.data) {
    return (
      <section className="container-x pt-12">
        <Skeleton className="h-52 w-full rounded-2xl" />
      </section>
    );
  }

  if (!sample.data) return null;
  const { device, cost, preset, result } = sample.data;

  return (
    <section className="container-x pt-12">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-950 text-white">
        <div className="grid gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:py-10">
          <div>
            <Badge tone="aqua" icon="percent">
              حاسبة التوفير
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-extrabold leading-snug text-white sm:text-[28px]">
              هل المياه المعبأة أوفر لك؟ احسبها بالأرقام في دقيقة
            </h2>
            <p className="mt-3 max-w-lg text-[13px] leading-7 text-ink-300">
              أدخل استهلاك منزلك أو مشترياتك الحالية، واختر نظامًا من الكتالوج، واعرف نقطة التعادل والتوفير المتوقع خلال
              المدة التي تختارها — كل قيمة قابلة للتعديل، ولا نضيف أي رقم غير معلن في بيانات المنتج.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/calculator"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-aqua-400 px-6 text-[13.5px] font-bold text-ink-950 transition hover:bg-aqua-300 active:scale-[0.98]"
              >
                <Icon name="percent" size={17} />
                احسب توفيري
              </Link>
              <Link
                to="/product-finder"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-6 text-[13.5px] font-bold text-white transition hover:bg-white/10"
              >
                <Icon name="target" size={17} />
                ساعدني أختار النظام
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10 sm:p-5">
            <p className="text-[11.5px] font-bold text-aqua-200">
              مثال توضيحي — أسرة من 4 أفراد تشتري عبوات {preset.unitLiters} لترًا بـ {formatMoney(preset.defaultUnitPrice)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11.5px] text-ink-300">نقطة التعادل</dt>
                <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums">
                  {result.breakEvenMonth ? `${result.breakEvenMonth} شهرًا` : "لم تتحقق"}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-ink-300">التوفير خلال 5 سنوات</dt>
                <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-aqua-200">
                  {formatRiyals(Math.max(0, result.savings))}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-ink-300">تكلفة اللتر حاليًا</dt>
                <dd className="mt-0.5 text-[13px] font-bold tabular-nums">
                  {result.bottledCostPerLiter > 0 ? `${result.bottledCostPerLiter.toFixed(2)} ر.س` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-ink-300">بعد الفلتر</dt>
                <dd className="mt-0.5 text-[13px] font-bold tabular-nums">
                  {result.filterCostPerLiter > 0 ? `${result.filterCostPerLiter.toFixed(2)} ر.س` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-white/10 pt-3 text-[11.5px] leading-6 text-ink-300">
              النظام المستخدم في المثال:{" "}
              <Link to={`/p/${device.slug}`} className="font-bold text-white underline decoration-dotted">
                {device.name}
              </Link>
              {cost.replacementKit ? ` مع طقم شمعات بـ ${formatMoney(cost.replacementKit.price)}.` : "."} القيم تقديرية
              وتُعدَّل بالكامل في الحاسبة.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
