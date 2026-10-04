import { formatMoney } from "@/lib/format";
import type { PriceQuote } from "@/lib/product-logic";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Props {
  quote: PriceQuote;
  vatPercent: number;
  unitLabel?: string;
  size?: "lg" | "xl";
  className?: string;
}

/** Price cluster — deliberately airy so current price and discount never collide. */
export function PriceBlock({ quote, vatPercent, unitLabel, size = "xl", className }: Props) {
  const hasDiscount = quote.discount > 0;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display font-extrabold leading-none tracking-tight text-ink-950 tabular-nums",
              size === "xl" ? "text-[38px] sm:text-[44px]" : "text-[26px]"
            )}
          >
            {formatMoney(quote.unitPrice, false)}
          </span>
          <span className="font-display text-[15px] font-bold text-ink-500">ر.س</span>
        </p>

        {hasDiscount && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-danger px-2 py-1 font-display text-[12.5px] font-extrabold text-white shadow-hair">
            <Icon name="tag" size={12} strokeWidth={2.2} />
            وفّر {quote.discount}%
          </span>
        )}

        {hasDiscount && quote.compareAtPrice && (
          <span className="mb-1.5 flex items-baseline gap-2 text-[12.5px]">
            <s className="text-ink-400 tabular-nums">{formatMoney(quote.compareAtPrice)}</s>
            <span className="font-semibold text-success tabular-nums">
              توفير {formatMoney(quote.saved)}
            </span>
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
        <span className="inline-flex items-center gap-1">
          <Icon name="check" size={12} className="text-success" strokeWidth={2.4} />
          شامل ضريبة القيمة المضافة {vatPercent}% ({formatMoney(quote.vatIncluded)})
        </span>
        {unitLabel && <span className="text-ink-400">· {unitLabel}</span>}
      </div>
    </div>
  );
}
