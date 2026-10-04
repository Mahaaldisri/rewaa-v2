import type { ServicePlan } from "@/types/product";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Props {
  plans: ServicePlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Installation & maintenance package selector.
 * The chosen plan is priced as a separate cart line, which is exactly how the
 * Cart API expects service SKUs to be submitted.
 */
export function ServicePlanPicker({ plans, selectedId, onSelect, disabled, className }: Props) {
  if (plans.length === 0) return null;

  return (
    <section
      className={cn("rounded-lg border border-ink-100 bg-surface p-4 shadow-hair", className)}
      aria-label="باقات التركيب والصيانة"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink-900">
          <span className="grid size-7 place-items-center rounded-md bg-flow-50 text-flow-700">
            <Icon name="headset" size={15} />
          </span>
          التركيب والصيانة
        </h3>
        <span className="rounded-md bg-flow-50 px-2 py-1 text-[11px] font-bold text-flow-700">
          فنيون معتمدون من رواء
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="اختر باقة الخدمة">
        {plans.map((plan) => {
          const isActive = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onSelect(plan.id)}
              className={cn(
                "relative flex flex-col rounded-lg border p-3 text-start transition duration-200",
                isActive
                  ? "border-brand-600 bg-brand-50/50 shadow-hair"
                  : "border-ink-100 bg-surface hover:border-ink-300 hover:bg-ink-50/60",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    "absolute -top-2 end-2.5 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold",
                    plan.recommended ? "bg-aqua-500 text-white" : "bg-flow-500 text-white"
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border-2 transition",
                    isActive ? "border-brand-700 bg-brand-700" : "border-ink-300 bg-surface"
                  )}
                >
                  {isActive && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-[12.5px] font-bold text-ink-900">{plan.name}</span>
              </span>

              <span className="mt-1.5 font-display text-[16px] font-extrabold tabular-nums text-ink-950">
                {plan.price === 0 ? "مجاني" : `+ ${formatMoney(plan.price)}`}
              </span>

              <ul className="mt-2 space-y-1">
                {plan.highlights.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] leading-4 text-ink-500">
                    <Icon name="check" size={11} strokeWidth={2.6} className="mt-0.5 shrink-0 text-flow-600" />
                    {item}
                  </li>
                ))}
              </ul>

              {plan.durationMonths > 0 && (
                <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-xs bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
                  <Icon name="clock" size={10} />
                  تغطية {plan.durationMonths} شهرًا
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-md bg-aqua-50/70 p-2.5 text-[11.5px] leading-5 text-ink-600">
        <Icon name="info" size={14} className="mt-0.5 shrink-0 text-aqua-600" />
        يتواصل معك قسم الجدولة خلال ساعة من تأكيد الطلب لتحديد موعد التركيب المناسب. التركيب مجاني داخل المدن
        المخدومة، وتُضاف رسوم انتقال للمواقع خارج النطاق يُبلَّغ بها قبل الزيارة.
      </p>
    </section>
  );
}
