import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { cn } from "@/utils/cn";
import type { MaintenancePlan } from "@/types/content";

/** Plan card shared by the service pages and the annual-contracts page. */
export function ServicePlanCard({ plan, serviceSlug }: { plan: MaintenancePlan; serviceSlug: string }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border bg-surface p-5",
        plan.recommended ? "border-brand-300 shadow-brand" : "border-ink-100 shadow-hair"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[15px] font-extrabold text-ink-950">{plan.name}</h3>
        {plan.badge && <Badge tone={plan.recommended ? "brand" : "neutral"}>{plan.badge}</Badge>}
      </div>

      <p className="mt-2 text-[12.5px] leading-6 text-ink-600">{plan.bestFor}</p>

      <div className="mt-3.5 flex items-end gap-2">
        <span className="font-display text-2xl font-extrabold text-ink-950 tabular-nums">
          {formatMoney(plan.pricePerYear)}
        </span>
        {plan.compareAtPrice && plan.compareAtPrice > plan.pricePerYear && (
          <span className="pb-1 text-[12.5px] text-ink-400 line-through tabular-nums">
            {formatMoney(plan.compareAtPrice)}
          </span>
        )}
        <span className="pb-1 text-[11.5px] text-ink-500">/ سنة</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          {plan.visits} زيارات سنويًا
        </li>
        <li className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          استجابة {plan.responseHours} ساعة
        </li>
        <li className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          أولوية {plan.priority}
        </li>
        {plan.cartridgesIncluded && (
          <li className="rounded-full bg-flow-50 px-2.5 py-1 text-[11px] font-semibold text-flow-700">
            {plan.cartridgeSets > 0 ? `${plan.cartridgeSets} أطقم شمعات` : "شمعات مشمولة"}
          </li>
        )}
      </ul>

      <ul className="mt-4 space-y-2">
        {plan.includes.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
            <Icon name="check" size={14} className="mt-1 shrink-0 text-flow-600" />
            {item}
          </li>
        ))}
      </ul>

      {plan.excludes.length > 0 && (
        <details className="mt-3 text-[12px] text-ink-500">
          <summary className="cursor-pointer font-bold text-ink-600">غير مشمول في الباقة</summary>
          <ul className="mt-2 space-y-1.5">
            {plan.excludes.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" />
                {item}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-3 text-[11px] text-ink-400">
        الأسعار المعروضة قيمة تجريبية قابلة للتعديل قبل الإطلاق.
      </p>

      <div className="mt-auto pt-5">
        <Link
          to={`/services/book?plan=${plan.id}&type=maintenance`}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition",
            plan.recommended
              ? "bg-brand-700 text-white shadow-brand hover:bg-brand-800"
              : "border border-ink-200 bg-surface text-ink-800 hover:bg-ink-50"
          )}
          data-service={serviceSlug}
        >
          اختر هذه الباقة
          <Icon name="arrowLeft" size={15} />
        </Link>
      </div>
    </article>
  );
}
