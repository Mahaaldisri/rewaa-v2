import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { availabilityApi, type ServiceAvailability } from "@/services/serviceAvailability";
import { cn } from "@/utils/cn";

interface Props {
  className?: string;
  /** Preselects a city (e.g. the shipping city chosen earlier in checkout). */
  city?: string;
  /** Copy tweak: parts page vs booking page vs service page. */
  context?: "booking" | "parts" | "service";
}

/**
 * Service availability panel.
 *
 * Shows what the availability service actually knows: covered cities/districts,
 * installation and maintenance availability, fees and the nearest slot.
 * In the demo build the values are labelled as samples; when nothing is known
 * the panel says so instead of inventing coverage or appointments.
 */
export function ServiceAvailabilityPanel({ className, city, context = "booking" }: Props) {
  const cities = useMemo(() => availabilityApi.servedCities(), []);
  const [selected, setSelected] = useState(city ?? cities[0]?.name ?? "");
  const [data, setData] = useState<ServiceAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (city && city !== selected) setSelected(city);
    // The initial city comes from props; later changes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!selected) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void availabilityApi
      .forCity({ city: selected })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const rows = data
    ? [
        { key: "installation", label: "تركيب الأجهزة", icon: "settings" as const, entry: data.installation },
        { key: "maintenance", label: "صيانة وزيارات دورية", icon: "wrench" as const, entry: data.maintenance },
        { key: "waterTest", label: "زيارة فحص المياه", icon: "droplet" as const, entry: data.waterTest },
      ]
    : [];

  return (
    <section className={cn("rounded-xl border border-ink-100 bg-surface p-4 shadow-hair sm:p-5", className)} aria-labelledby="availability-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="availability-title" className="flex items-center gap-2 font-display text-[16px] font-extrabold text-ink-950">
            <span className="grid size-7 place-items-center rounded-md bg-flow-50 text-flow-700">
              <Icon name="mapPin" size={15} />
            </span>
            توفر الخدمة والمواعيد
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-6 text-ink-600">
            {context === "parts"
              ? "تحقّق من إمكانية وصول الفني إلى مدينتك قبل طلب التركيب أو الصيانة."
              : "اختر مدينتك لمعرفة ما إذا كانت فرق التركيب والصيانة تصل إليها، والرسوم التقديرية، وأقرب موعد."}
          </p>
        </div>
        {data?.source === "sample" && (
          <Badge tone="neutral" icon="info">
            بيانات توفر تجريبية
          </Badge>
        )}
        {data?.source === "api" && (
          <Badge tone="success" icon="checkCircle">
            بيانات مباشرة
          </Badge>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">المدينة</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {cities.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          to="/stores"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-paper px-4 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
        >
          <Icon name="store" size={15} />
          الفروع ومواعيد العمل
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data ? (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              "rounded-lg border p-3.5 text-[12.5px] leading-6",
              data.covered ? "border-flow-200 bg-flow-50 text-flow-900" : "border-ink-150 bg-paper text-ink-700"
            )}
          >
            <p className="font-bold">
              {data.covered ? `${data.cityName}: ضمن نطاق الخدمة المعلن` : `${data.cityName}: خارج نطاق الخدمة المعلن حاليًا`}
            </p>
            <p className="mt-0.5">{data.note}</p>
          </div>

          {data.covered && (
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100">
              {rows.map((row) => (
                <li key={row.key} className="flex flex-wrap items-center gap-3 bg-surface p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-paper text-ink-600">
                    <Icon name={row.icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-ink-900">{row.label}</span>
                    <span className="block text-[11.5px] text-ink-500">
                      {row.entry.available ? "متاح للحجز" : "يُحدَّد بعد تأكيد الطلب"}
                      {row.entry.fee !== undefined && ` · رسوم تقديرية ${formatMoney(row.entry.fee)}`}
                      {row.entry.sampleFee && row.entry.fee !== undefined && " (تجريبي)"}
                    </span>
                  </span>
                  <Link
                    to="/services/book"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 text-[11.5px] font-bold text-brand-800 transition hover:bg-brand-100"
                  >
                    احجز موعدًا
                    <Icon name="chevronLeft" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-ink-100 bg-paper p-3.5">
              <p className="text-[12px] font-bold text-ink-900">أقرب موعد متاح</p>
              {data.nearestSlot ? (
                <p className="mt-0.5 text-[12px] leading-6 text-ink-700">
                  {data.nearestSlot.label}
                  {data.nearestSlot.sample && <span className="text-ink-400"> — موعد تجريبي للعرض</span>}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] leading-6 text-ink-500">
                  لا نعرض مواعيد غير مؤكدة. أرسل طلب الحجز وسيتواصل الفريق بالموعد المتاح.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-ink-100 bg-paper p-3.5">
              <p className="text-[12px] font-bold text-ink-900">
                {data.districts.length > 0 ? "الأحياء التي يخدمها أقرب فرع" : "الفرع الأقرب"}
              </p>
              {data.branch ? (
                <p className="mt-0.5 text-[12px] leading-6 text-ink-700">
                  {data.branch.name} — {data.branch.district} · {data.branch.hours}
                  {data.districts.length > 1 && <span className="block text-ink-500">{data.districts.join(" · ")}</span>}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] leading-6 text-ink-500">تُحدَّد أقرب نقطة خدمة مع تأكيد الحجز.</p>
              )}
            </div>
          </div>

          {data.source === "sample" && (
            <p className="text-[11px] leading-5 text-ink-400">
              الأرقام أعلاه بيانات عرض تجريبية قابلة للتعديل من إعدادات المتجر، وليست مواعيد أو رسومًا مؤكدة.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
