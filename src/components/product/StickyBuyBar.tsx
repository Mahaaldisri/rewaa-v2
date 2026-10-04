import type { Product, ProductImage, Variant } from "@/types/product";
import type { AvailabilityState, PriceQuote } from "@/lib/product-logic";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { QuantityPicker } from "./QuantityPicker";
import { cn } from "@/utils/cn";

interface Props {
  visible: boolean;
  product: Product;
  variant?: Variant;
  quote: PriceQuote;
  /** Selected service package price, shown inside the bar total */
  addonPrice?: number;
  addonLabel?: string;
  availability: AvailabilityState;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => Promise<boolean>;
  onBuyNow: () => Promise<void>;
  adding: boolean;
  image?: ProductImage;
}

/**
 * Sticky purchase bar.
 * Slides in once the main buy box leaves the viewport; compact on mobile
 * (price + CTA) and richer on desktop (thumbnail, quantity, both CTAs).
 */
export function StickyBuyBar({
  visible,
  product,
  variant,
  quote,
  addonPrice = 0,
  addonLabel,
  availability,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
  adding,
  image,
}: Props) {
  const disabled = !availability.purchasable || adding;
  const orderTotal = quote.subtotal + addonPrice;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="safe-bottom border-t border-ink-200/80 bg-surface/95 shadow-[0_-8px_30px_-12px_rgba(10,18,16,0.35)] backdrop-blur-xl">
        <div className="container-x flex items-center gap-3 py-2.5">
          {/* Thumbnail + identity */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-paper-deep ring-1 ring-ink-100 sm:size-14">
              {image ? (
                <img src={image.thumb} alt="" className="size-full object-cover" loading="lazy" />
              ) : (
                <LogoMark className="size-full p-1.5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold leading-tight text-ink-900 sm:text-[13.5px]">
                {product.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold",
                    availability.tone === "success" && "text-success",
                    availability.tone === "warning" && "text-warning",
                    availability.tone === "danger" && "text-danger",
                    availability.tone === "info" && "text-info"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {availability.label}
                </span>
                {variant && <span className="hidden truncate sm:inline">· {variant.sku}</span>}
              </p>
            </div>
          </div>

          {/* Quantity (tablet+) */}
          <div className="hidden md:block">
            <QuantityPicker
              value={quantity}
              onChange={onQuantityChange}
              min={1}
              max={Math.max(1, Math.min(availability.remaining || 1, 10))}
              disabled={!availability.purchasable}
              size="sm"
              label=""
              className="[&_label]:hidden"
            />
          </div>

          {/* Price */}
          <div className="hidden shrink-0 text-end sm:block">
            <p className="font-display text-[19px] font-extrabold leading-none tabular-nums text-ink-950">
              {formatMoney(orderTotal)}
            </p>
            {addonPrice > 0 ? (
              <p className="mt-1 max-w-[150px] truncate text-[11px] text-ink-500">+ {addonLabel}</p>
            ) : (
              quote.discount > 0 && (
                <p className="mt-1 text-[11px] text-ink-400">
                  <s className="tabular-nums">{formatMoney((quote.compareAtPrice ?? 0) * quantity)}</s>
                  <span className="ms-1.5 font-semibold text-success">-{quote.discount}%</span>
                </p>
              )
            )}
          </div>

          {/* CTAs */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onBuyNow}
              disabled={disabled}
              className="hidden h-11 items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-4 font-display text-[13px] font-bold text-aqua-200 transition hover:bg-ink-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
            >
              <Icon name="bolt" size={15} filled />
              اشترِ الآن
            </button>
            <button
              type="button"
              onClick={onAddToCart}
              disabled={disabled}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-lg px-4 font-display text-[13.5px] font-extrabold text-white shadow-brand transition active:scale-[0.98]",
                availability.purchasable ? "bg-brand-700 hover:bg-brand-800" : "bg-ink-400",
                "disabled:cursor-not-allowed"
              )}
            >
              {adding ? (
                <Icon name="refresh" size={16} className="animate-spin-slow" />
              ) : (
                <Icon name="cart" size={16} />
              )}
              <span className="max-w-[120px] truncate sm:max-w-none">
                {adding ? "جارٍ الإضافة…" : availability.purchasable ? "أضف إلى السلة" : availability.label}
              </span>
              <span className="hidden tabular-nums sm:inline">{formatMoney(orderTotal)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
