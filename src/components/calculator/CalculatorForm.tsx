import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import {
  BOTTLE_PRESETS,
  DEFAULT_LITERS_PER_PERSON,
  presetById,
} from "@/lib/calculator-logic";
import type { CalculatorInput, CalculatorMode, OwnershipInput } from "@/types/calculator";
import type { ProductSummary } from "@/types/catalog";
import { cn } from "@/utils/cn";

interface Props {
  input: CalculatorInput;
  onChange: (patch: Partial<CalculatorInput>) => void;
  devices: ProductSummary[];
  onPickDevice: (slug: string) => void;
  maintenanceHint: { value: number; note: string };
  /** Missing catalogue values for the selected product, if any. */
  missingForProduct: string[];
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-700">{label}</span>
        <span className="text-[12.5px] font-bold tabular-nums text-ink-950">
          {value.toLocaleString("ar-SA")}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={`${value}${suffix ? ` ${suffix}` : ""}`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-700"
      />
      {hint && <span className="mt-1 block text-[11px] leading-5 text-ink-400">{hint}</span>}
    </label>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  suffix,
  hint,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-ink-700">{label}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
          className="h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        {suffix && <span className="shrink-0 text-[12px] text-ink-500">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-[11px] leading-5 text-ink-400">{hint}</span>}
    </label>
  );
}

/**
 * Calculator inputs.
 *
 * Two ways to describe the current spend (estimate / my purchases) and two ways
 * to describe the device (a catalogue product, or manual numbers). Every field
 * the catalogue already knows is pre-filled and remains editable.
 */
export function CalculatorForm({ input, onChange, devices, onPickDevice, maintenanceHint, missingForProduct }: Props) {
  const [deviceQuery, setDeviceQuery] = useState("");
  const preset = presetById(input.purchases.presetId);
  const pricePerLitre =
    input.purchases.unitLiters > 0 && input.purchases.unitPrice > 0
      ? input.purchases.unitPrice / input.purchases.unitLiters
      : 0;

  const filteredDevices = useMemo(() => {
    const needle = deviceQuery.trim().toLowerCase();
    const list = needle
      ? devices.filter((device) =>
          [device.name, device.nameEn, device.sku, device.brand].join(" ").toLowerCase().includes(needle)
        )
      : devices;
    return list.slice(0, 8);
  }, [devices, deviceQuery]);

  const setOwnership = (patch: Partial<OwnershipInput>) =>
    onChange({ ownership: { ...input.ownership, ...patch } });

  const selectDevice = (slug: string) => {
    onPickDevice(slug);
    setDeviceQuery("");
  };

  return (
    <div className="space-y-5">
      {/* --------------------------- Current spend --------------------------- */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[15px] font-extrabold text-ink-950">كيف تحصل على مياه الشرب الآن؟</h2>
          <div className="flex rounded-lg border border-ink-200 bg-paper p-0.5" role="tablist" aria-label="طريقة الحساب">
            {(
              [
                { id: "estimate" as CalculatorMode, label: "احسبها لي" },
                { id: "purchases" as CalculatorMode, label: "أعرف مشترياتي" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={input.mode === tab.id}
                onClick={() => onChange({ mode: tab.id })}
                className={cn(
                  "h-8 rounded-md px-3 text-[12px] font-bold transition",
                  input.mode === tab.id ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {input.mode === "estimate" && (
            <>
              <SliderRow
                label="عدد الأشخاص في المنزل"
                value={input.estimate.people}
                min={1}
                max={12}
                suffix="أشخاص"
                onChange={(value) => onChange({ estimate: { ...input.estimate, people: value } })}
              />
              <SliderRow
                label="متوسط استهلاك الفرد من مياه الشرب يوميًا"
                value={input.estimate.litersPerPersonPerDay}
                min={1}
                max={10}
                step={0.5}
                suffix="لتر"
                hint={`القيمة الافتراضية ${DEFAULT_LITERS_PER_PERSON} لتر للشرب والطبخ — عدّلها حسب استهلاكك.`}
                onChange={(value) => onChange({ estimate: { ...input.estimate, litersPerPersonPerDay: value } })}
              />
            </>
          )}

          {/* The price you pay today — used as the reference in both modes. */}
          <fieldset>
            <legend className="text-[12.5px] font-semibold text-ink-700">
              {input.mode === "estimate" ? "بكم تشتري مياه الشرب؟ (مرجع سعر اللتر)" : "نوع المياه المشتراة"}
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="نوع المياه المشتراة">
              {BOTTLE_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={input.purchases.presetId === option.id}
                  onClick={() =>
                    onChange({
                      purchases: {
                        ...input.purchases,
                        presetId: option.id,
                        unitLiters: option.unitLiters,
                        unitPrice: option.defaultUnitPrice,
                      },
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                    input.purchases.presetId === option.id
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-ink-400">
              {pricePerLitre > 0
                ? `سعر اللتر المرجعي: ${pricePerLitre.toFixed(2)} ر.س — عدّله أدناه ليطابق فاتورتك.`
                : "اختر نوع المياه أو أدخل السعر يدويًا ليعمل الحساب."}
            </p>
          </fieldset>

          {input.mode === "estimate" ? (
            <NumberRow
              label="مصروف آخر على المياه شهريًا (اختياري)"
              value={input.estimate.extraMonthlyCost}
              suffix="ر.س"
              hint="مثال: اشتراك موزع مياه أو توصيل — اتركه صفرًا إن لم يكن لديك."
              onChange={(value) => onChange({ estimate: { ...input.estimate, extraMonthlyCost: value } })}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberRow
                label={`حجم الوحدة (لتر) — ${preset.unitLabel}`}
                value={input.purchases.unitLiters}
                step={0.01}
                suffix="لتر"
                onChange={(value) => onChange({ purchases: { ...input.purchases, unitLiters: value } })}
              />
              <NumberRow
                label={`سعر الوحدة — ${preset.unitLabel}`}
                value={input.purchases.unitPrice}
                step={0.25}
                suffix="ر.س"
                hint="الأسعار الافتراضية قابلة للتعديل — استخدم فاتورتك الفعلية."
                onChange={(value) => onChange({ purchases: { ...input.purchases, unitPrice: value } })}
              />
              <NumberRow
                label={`عدد الوحدات (${preset.unitLabel}) لكل فترة`}
                value={input.purchases.unitsPerPeriod}
                onChange={(value) => onChange({ purchases: { ...input.purchases, unitsPerPeriod: value } })}
              />
              <label className="block">
                <span className="text-[12.5px] font-semibold text-ink-700">معدل الشراء</span>
                <select
                  value={input.purchases.frequency}
                  onChange={(event) =>
                    onChange({ purchases: { ...input.purchases, frequency: event.target.value as "weekly" | "monthly" } })
                  }
                  className="mt-1.5 h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="weekly">أسبوعيًا</option>
                  <option value="monthly">شهريًا</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------- The device ----------------------------- */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[15px] font-extrabold text-ink-950">نظام التنقية</h2>
          <Badge tone={input.ownership.manual ? "neutral" : "success"} icon={input.ownership.manual ? "settings" : "package"}>
            {input.ownership.manual ? "أرقام يدوية" : input.ownership.productName ?? "اختر جهازًا"}
          </Badge>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="text-[12.5px] font-semibold text-ink-700">ابحث عن جهاز في الكتالوج</span>
              <span className="mt-1.5 flex h-10 items-center gap-2 rounded-md border border-ink-200 bg-surface px-3 focus-within:border-brand-500">
                <Icon name="search" size={15} className="text-ink-400" />
                <input
                  value={deviceQuery}
                  onChange={(event) => setDeviceQuery(event.target.value)}
                  placeholder="اسم النظام أو رقم الموديل"
                  className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-ink-300"
                />
              </span>
            </label>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {filteredDevices.map((device) => (
                <li key={device.slug}>
                  <button
                    type="button"
                    onClick={() => selectDevice(device.slug)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-start text-[12px] transition",
                      input.ownership.productSlug === device.slug
                        ? "border-brand-500 bg-brand-50"
                        : "border-ink-100 bg-paper hover:border-ink-300"
                    )}
                  >
                    <span className="min-w-0 truncate text-ink-800">{device.name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-ink-600">{formatMoney(device.price)}</span>
                  </button>
                </li>
              ))}
              {filteredDevices.length === 0 && (
                <li className="rounded-md border border-ink-100 bg-paper p-3 text-[12px] text-ink-500">
                  لا يوجد جهاز بهذا الاسم — يمكنك المتابعة بالأرقام اليدوية أدناه.
                </li>
              )}
            </ul>
            {input.ownership.productSlug && (
              <Link
                to={`/p/${input.ownership.productSlug}`}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-700 hover:underline"
              >
                عرض صفحة الجهاز
                <Icon name="arrowLeft" size={13} />
              </Link>
            )}
          </div>

          <div className="space-y-3">
            <NumberRow
              label="سعر الجهاز"
              value={input.ownership.devicePrice}
              suffix="ر.س"
              onChange={(value) => setOwnership({ devicePrice: value, manual: true })}
            />
            <NumberRow
              label="تكلفة التركيب"
              value={input.ownership.installationCost}
              suffix="ر.س"
              hint={
                input.ownership.installationCost === 0
                  ? "اتركها صفرًا إذا كان التركيب مشمولًا أو إذا كنت ستركّبه بنفسك."
                  : undefined
              }
              onChange={(value) => setOwnership({ installationCost: value, manual: true })}
            />
            <NumberRow
              label="ملحقات وقطع أولية"
              value={input.ownership.initialAccessoriesCost}
              suffix="ر.س"
              onChange={(value) => setOwnership({ initialAccessoriesCost: value, manual: true })}
            />
          </div>
        </div>

        {missingForProduct.length > 0 && !input.ownership.manual && (
          <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft p-3 text-[11.5px] leading-6 text-ink-700">
            <p className="font-bold text-ink-900">قيم غير متوفرة في بيانات هذا المنتج:</p>
            <ul className="mt-1 list-disc ps-4">
              {missingForProduct.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-1">أدخلها يدويًا في الحقول أعلاه لتصبح المقارنة أدق — لم نخمّن أي قيمة بدلًا عنك.</p>
          </div>
        )}
      </section>

      {/* ---------------------------- Running costs --------------------------- */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4 sm:p-5">
        <h2 className="font-display text-[15px] font-extrabold text-ink-950">تكاليف التشغيل</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumberRow
            label="سعر طقم الشمعات"
            value={input.ownership.replacementKitPrice}
            suffix="ر.س"
            hint="يُعبّأ تلقائيًا من سعر الطقم المتوافق في الكتالوج عند اختيار جهاز."
            onChange={(value) => setOwnership({ replacementKitPrice: value })}
          />
          <NumberRow
            label="دورة استبدال الشمعات"
            value={input.ownership.replacementIntervalMonths}
            suffix="شهرًا"
            hint="من بيانات المنتج، وتُحسب كل شهر تستحق فيه فعليًا."
            onChange={(value) => setOwnership({ replacementIntervalMonths: value })}
          />
          <NumberRow
            label="تكلفة زيارة الصيانة"
            value={input.ownership.maintenancePrice}
            suffix="ر.س"
            hint={`${maintenanceHint.note} (الافتراضي ${maintenanceHint.value} ر.س عند تفعيل الخدمة).`}
            onChange={(value) => setOwnership({ maintenancePrice: value })}
          />
          <NumberRow
            label="دورية زيارة الصيانة"
            value={input.ownership.maintenanceIntervalMonths}
            suffix="شهرًا"
            onChange={(value) => setOwnership({ maintenanceIntervalMonths: value })}
          />
          <NumberRow
            label="تكاليف شهرية أخرى (كهرباء، قطع إضافية…)"
            value={input.ownership.extraMonthlyCost}
            suffix="ر.س"
            hint="اتركها صفرًا إن لم تتوفر بيانات استهلاك — لا نضيف تكلفة غير معروفة من تلقاء أنفسنا."
            onChange={(value) => setOwnership({ extraMonthlyCost: value })}
          />
          <label className="flex items-start gap-2 self-end rounded-md border border-ink-200 bg-paper p-3 text-[11.5px] leading-5 text-ink-600">
            <input
              type="checkbox"
              checked={input.ownership.manual}
              onChange={(event) => setOwnership({ manual: event.target.checked })}
              className="mt-0.5 size-4 accent-brand-700"
            />
            أعدّلت الأرقام يدويًا — استخدمها كما هي بدلًا من قيم الكتالوج.
          </label>
        </div>
      </section>

      {/* ------------------------------ Horizon ------------------------------ */}
      <section className="rounded-xl border border-ink-100 bg-surface p-4 sm:p-5">
        <h2 className="font-display text-[15px] font-extrabold text-ink-950">مدة المقارنة</h2>
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="مدة المقارنة">
            {[12, 36, 60, 120].map((months) => (
              <button
                key={months}
                type="button"
                role="radio"
                aria-checked={input.months === months}
                onClick={() => onChange({ months })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition",
                  input.months === months
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300"
                )}
              >
                {months / 12} {months === 12 ? "سنة" : months === 120 ? "سنة" : "سنوات"}
              </button>
            ))}
          </div>
          <SliderRow
            label="ارتفاع سعر المياه سنويًا"
            value={input.waterPriceGrowthPercent}
            min={0}
            max={30}
            suffix="%"
            hint="افتراضي 0% — حرّكه إن كنت تتوقع ارتفاع أسعار المياه المعبأة."
            onChange={(value) => onChange({ waterPriceGrowthPercent: value })}
          />
        </div>
      </section>
    </div>
  );
}
