import { useState } from "react";
import type { CartLine } from "@/store/StoreProvider";
import type { CartTotals } from "@/lib/cart-logic";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { payments } from "@/services/payments";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

interface Props {
  items: CartLine[];
  totals: CartTotals;
  className?: string;
  /** extra line shown between shipping and total, e.g. selected service package */
  extraLine?: { label: string; value: number };
}

/** Sticky order summary reused across every checkout step. */
export function OrderSummaryCard({ items, totals, className, extraLine }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-ink-100 bg-surface shadow-hair">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 p-4 lg:cursor-default"
        >
          <span className="font-display text-[14.5px] font-bold text-ink-900">
            ملخص الطلب ({items.reduce((s, i) => s + i.quantity, 0)})
          </span>
          <span className="flex items-center gap-2">
            <span className="font-display text-[16px] font-extrabold tabular-nums text-ink-950">
              {formatMoney(totals.total + (extraLine?.value ?? 0))}
            </span>
            <Icon name="chevronDown" size={16} className={cn("text-ink-400 transition-transform lg:hidden", open && "rotate-180")} />
          </span>
        </button>

        <div className={cn("overflow-hidden transition-all lg:!block lg:!max-h-none", open ? "max-h-[2000px]" : "max-h-0")}>
          <div className="space-y-2.5 border-t border-ink-100 px-4 pb-4 pt-3.5">
            {items.map((line) => (
              <div key={line.id} className="flex items-center gap-2.5">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                  {line.image ? (
                    <img src={line.image} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center p-2">
                      <LogoMark className="size-full" />
                    </span>
                  )}
                  <span className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-ink-900 text-[9px] font-bold text-white">
                    {line.quantity}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[12px] font-semibold text-ink-800">{line.name}</p>
                  <p className="text-[10.5px] text-ink-400">{line.selectionLabel}</p>
                </div>
                <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink-800">
                  {formatMoney(line.unitPrice * line.quantity)}
                </span>
              </div>
            ))}
          </div>

          <dl className="space-y-1.5 border-t border-ink-100 px-4 py-3.5 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-500">المجموع الفرعي</dt>
              <dd className="tabular-nums text-ink-700">{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-success">الخصم</dt>
                <dd className="tabular-nums text-success">-{formatMoney(totals.discount)}</dd>
              </div>
            )}
            {extraLine && (
              <div className="flex justify-between">
                <dt className="text-ink-500">{extraLine.label}</dt>
                <dd className="tabular-nums text-ink-700">{formatMoney(extraLine.value)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">الشحن</dt>
              <dd className="tabular-nums text-ink-700">
                {totals.shippingCost === 0 ? "مجاني" : formatMoney(totals.shippingCost)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-[14px]">
              <dt className="font-bold text-ink-900">الإجمالي</dt>
              <dd className="font-display text-[17px] font-extrabold tabular-nums text-ink-950">
                {formatMoney(totals.total + (extraLine?.value ?? 0))}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-surface p-3.5 text-[11px] leading-5 text-ink-500">
        <Icon name={payments.current().live ? "lock" : "info"} size={15} className={`mt-0.5 shrink-0 ${payments.current().live ? "text-success" : "text-ink-400"}`} />
        لا نحتفظ ببيانات بطاقتك. {payments.current().live
          ? "تُدخل بيانات البطاقة داخل حقول بوابة الدفع المستضافة."
          : payments.current().id === "demo"
            ? "البناء الحالي تجريبي: لا توجد بوابة دفع متصلة ولا يُخصم أي مبلغ."
            : "الدفع الإلكتروني غير مفعّل في هذه البيئة."}
      </div>
    </aside>
  );
}
