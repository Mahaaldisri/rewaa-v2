import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { estimateDelivery, freeShippingProgress, type DeliveryEstimate } from "@/lib/product-logic";
import { formatDate, formatMoney } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

type DeliveryKind = DeliveryEstimate["kind"];

const KINDS: { id: DeliveryKind; label: string; icon: IconName; note: string }[] = [
  { id: "standard", label: "شحن قياسي", icon: "truck", note: "الأكثر اختيارًا" },
  { id: "express", label: "شحن سريع", icon: "bolt", note: "أولوية في التجهيز" },
  { id: "same_day", label: "توصيل فوري", icon: "store", note: "الرياض وجدة" },
  { id: "pickup", label: "استلام من المعرض", icon: "mapPin", note: "بدون رسوم" },
];

interface Props {
  product: Product;
  orderValue: number;
  purchasable: boolean;
  className?: string;
}

/** Shipping & delivery estimator — city driven, fully mock-API replaceable. */
export function ShippingPanel({ product, orderValue, purchasable, className }: Props) {
  const { shipping } = product;
  const [cityId, setCityId] = useState(shipping.cities[0]?.id ?? "");
  const [kind, setKind] = useState<DeliveryKind>("standard");
  const [checking, setChecking] = useState(false);

  const city = useMemo(
    () => shipping.cities.find((c) => c.id === cityId) ?? shipping.cities[0],
    [shipping.cities, cityId]
  );

  const estimate = useMemo(
    () => (city ? estimateDelivery(city, shipping, kind, orderValue) : null),
    [city, shipping, kind, orderValue]
  );

  // Simulates a Shipping API call whenever the destination changes.
  useEffect(() => {
    if (!city) return;
    setChecking(true);
    const id = window.setTimeout(() => setChecking(false), 420);
    return () => window.clearTimeout(id);
  }, [city, kind, orderValue]);

  if (!city || !estimate) return null;

  const progress = freeShippingProgress(orderValue, shipping.freeShippingThreshold);
  const branchesInCity = shipping.branches.filter((b) => b.city === city.name);
  const unavailableKind =
    (kind === "same_day" && !city.sameDayAvailable) || (kind === "pickup" && branchesInCity.length === 0);

  return (
    <section
      className={cn("rounded-lg border border-ink-100 bg-surface p-4 shadow-hair", className)}
      aria-label="الشحن والتوصيل"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink-900">
          <span className="grid size-7 place-items-center rounded-md bg-brand-50 text-brand-700">
            <Icon name="truck" size={15} />
          </span>
          الشحن والتوصيل
        </h3>

        <div className="flex items-center gap-2">
          <label htmlFor="shipping-city" className="text-[11.5px] font-medium text-ink-500">
            التوصيل إلى
          </label>
          <div className="relative">
            <select
              id="shipping-city"
              value={city.id}
              onChange={(e) => setCityId(e.target.value)}
              className="appearance-none rounded-md border border-ink-200 bg-surface py-1.5 pe-7 ps-2.5 text-[12.5px] font-semibold text-ink-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {shipping.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.region}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-ink-400" />
          </div>
        </div>
      </div>

      {/* Free shipping progress */}
      <div className="mt-3.5 rounded-md bg-brand-50/70 p-3 ring-1 ring-inset ring-brand-100">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          {progress.qualified ? (
            <span className="flex items-center gap-1.5 font-bold text-success">
              <Icon name="check" size={14} strokeWidth={2.6} />
              طلبك مؤهّل للشحن المجاني
            </span>
          ) : (
            <span className="font-medium text-brand-800">
              أضف <strong className="font-display">{formatMoney(progress.remaining)}</strong> لتحصل على شحن مجاني
            </span>
          )}
          <span className="text-[11px] tabular-nums text-brand-700">{progress.percent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              progress.qualified ? "bg-success" : "bg-brand-500"
            )}
            style={{ width: `${Math.max(4, progress.percent)}%` }}
          />
        </div>
      </div>

      {/* Delivery options */}
      <div className="mt-3.5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="خيار التوصيل">
        {KINDS.map((option) => {
          const isActive = kind === option.id;
          const isBlocked =
            (option.id === "same_day" && !city.sameDayAvailable) ||
            (option.id === "pickup" && branchesInCity.length === 0);
          const est = estimateDelivery(city, shipping, option.id, orderValue);

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setKind(option.id)}
              disabled={!purchasable && option.id !== "pickup"}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-2.5 text-start transition duration-200",
                isActive
                  ? "border-brand-600 bg-brand-50/60 shadow-hair"
                  : "border-ink-100 bg-surface hover:border-ink-300 hover:bg-ink-50/60",
                isBlocked && "opacity-55",
                (!purchasable && option.id !== "pickup") && "cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md transition-colors",
                  isActive ? "bg-brand-700 text-white" : "bg-ink-50 text-ink-500"
                )}
              >
                <Icon name={option.icon} size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-ink-900">{option.label}</span>
                  <span className="text-[11.5px] font-semibold tabular-nums text-ink-600">
                    {isBlocked ? "غير متاح" : est.cost === 0 ? "مجاني" : formatMoney(est.cost)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-500">
                  {isBlocked
                    ? option.id === "same_day"
                      ? `غير متوفر في ${city.name}`
                      : "لا يوجد معرض في هذه المدينة"
                    : option.note}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Estimate summary */}
      <div
        className={cn(
          "mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-md bg-ink-950 px-3.5 py-3 text-white transition-opacity",
          checking && "opacity-70"
        )}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11.5px] text-aqua-300">
            <Icon name="mapPin" size={13} />
            التوصيل المتوقع إلى {city.name}
            {checking && <span className="ms-1 text-[10.5px] text-ink-400">جارٍ الحساب…</span>}
          </p>
          <p className="mt-1 font-display text-[15px] font-bold">
            {unavailableKind ? "غير متاح لهذه الوجهة" : estimate.label}
          </p>
          {!unavailableKind && kind !== "pickup" && (
            <p className="mt-0.5 text-[11px] text-ink-400">
              بين {formatDate(estimate.from.toISOString())} و {formatDate(estimate.to.toISOString())} · عند الطلب قبل 6 مساءً
            </p>
          )}
        </div>
        <span className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11.5px] font-semibold tabular-nums ring-1 ring-inset ring-white/10">
          {unavailableKind ? "—" : estimate.cost === 0 ? "شحن مجاني" : formatMoney(estimate.cost)}
        </span>
      </div>

      {/* Pickup branches */}
      {kind === "pickup" && (
        <div className="mt-3 rounded-md border border-ink-100 p-3 animate-fade">
          {branchesInCity.length === 0 ? (
            <p className="flex items-center gap-2 text-[12px] text-ink-500">
              <Icon name="info" size={14} className="text-info" />
              لا توجد معارض في {city.name} حاليًا — اختر مدينة أخرى أو الشحن للمنازل.
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11.5px] font-semibold text-ink-500">المعارض المتاحة في {city.name}</p>
              <ul className="space-y-2">
                {branchesInCity.map((branch) => (
                  <li key={branch.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-ink-50 text-ink-500">
                      <Icon name="store" size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-ink-900">{branch.name}</p>
                      <p className="text-[11px] leading-4 text-ink-500">
                        {branch.address} · {branch.hours}
                        {branch.distanceKm ? ` · يبعد ${branch.distanceKm} كم` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 text-[10.5px] font-bold",
                        branch.stock > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      )}
                    >
                      {branch.stock > 0 ? `متوفر ${branch.stock}` : "غير متوفر"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Carriers */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-100 pt-3">
        <span className="text-[11px] font-semibold text-ink-400">شركاء الشحن</span>
        <div className="flex flex-wrap gap-1.5">
          {shipping.carriers.map((carrier) => (
            <span
              key={carrier.id}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink-50 px-2 py-1 text-[11px] font-medium text-ink-600 ring-1 ring-inset ring-ink-100"
              title={carrier.etaLabel}
            >
              <Icon name="package" size={12} className="text-ink-400" />
              {carrier.name}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[11px] leading-4 text-ink-400">{shipping.note}</p>
    </section>
  );
}
