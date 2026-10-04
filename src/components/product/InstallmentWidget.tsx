import { useState } from "react";
import type { InstallmentProvider } from "@/types/product";
import { installmentPlan } from "@/lib/product-logic";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Props {
  providers: InstallmentProvider[];
  total: number;
  className?: string;
}

/**
 * Dynamic BNPL widget: provider list comes from the product payload, so adding
 * a new financing partner later requires no component change.
 */
export function InstallmentWidget({ providers, total, className }: Props) {
  const [activeId, setActiveId] = useState(providers[0]?.id ?? "");
  const active = providers.find((p) => p.id === activeId) ?? providers[0];
  const plan = active ? installmentPlan(total, active) : null;

  if (!providers.length || !plan || !active) return null;

  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-aqua-200/70 bg-aqua-50/50", className)}
      aria-label="خيارات التقسيط"
    >
      <div className="flex items-center justify-between gap-2 border-b border-aqua-200/60 px-3.5 py-2.5">
        <h3 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-aqua-900">
          <Icon name="wallet" size={15} className="text-aqua-600" />
          قسّط دفعتك بدون فوائد
        </h3>
        <span className="text-[11px] font-medium text-aqua-700">
          {providers.length} شركاء تقسيط
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto p-2.5 no-scrollbar" role="tablist" aria-label="مزوّد التقسيط">
        {providers.map((provider) => {
          const p = installmentPlan(total, provider);
          const isActive = provider.id === active.id;
          return (
            <button
              key={provider.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(provider.id)}
              className={cn(
                "flex min-w-[104px] shrink-0 flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-start transition",
                isActive
                  ? "border-aqua-400 bg-surface shadow-hair"
                  : "border-transparent bg-surface/50 hover:bg-surface",
                !p.eligible && "opacity-50"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: provider.accent }} />
                <span className="text-[12px] font-bold text-ink-800">{provider.nameAr}</span>
              </span>
              <span className="text-[10.5px] text-ink-500">
                {p.eligible ? `${p.count} دفعات × ${formatMoney(p.perInstallment)}` : p.reason}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-aqua-200/60 bg-surface/60 px-3.5 py-3">
        <div>
          <p className="text-[11.5px] text-ink-500">
            {plan.eligible ? (
              <>
                {plan.count} دفعات شهرية بقيمة{" "}
                <strong className="font-display text-[15px] font-extrabold text-ink-950">
                  {formatMoney(plan.perInstallment)}
                </strong>{" "}
                {plan.fee === 0
                  ? "بدون فوائد أو رسوم"
                  : `برسوم ${formatMoney(plan.fee)} (${plan.provider.feePercent}%)`}
              </>
            ) : (
              <span className="text-warning">{plan.reason} — جرّب مزوّدًا آخر</span>
            )}
          </p>
          <p className="mt-0.5 text-[10.5px] text-ink-400">
            الموافقة فورية عند إتمام الطلب · إجمالي المستحق {formatMoney(plan.total)}
          </p>
        </div>
        <a
          href="#installments-info"
          className="flex items-center gap-1 text-[11.5px] font-semibold text-aqua-700 underline decoration-aqua-300 underline-offset-4 transition hover:text-aqua-800"
        >
          كيف يعمل التقسيط؟
          <Icon name="chevronLeft" size={13} />
        </a>
      </div>
    </section>
  );
}
