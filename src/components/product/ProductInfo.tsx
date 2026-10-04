import {
  useEffect,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
  type RefObject,
} from "react";
import type { Product, ProductImage, ServicePlan, Variant } from "@/types/product";
import {
  availabilityOf,
  quotePrice,
  selectionLabel,
  type Selection,
} from "@/lib/product-logic";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { Badge, Stars } from "@/components/ui/primitives";
import { PriceBlock } from "./PriceBlock";
import { VariantSelector } from "./VariantSelector";
import { QuantityPicker } from "./QuantityPicker";
import { PromotionPanel } from "./PromotionPanel";
import { ShippingPanel } from "./ShippingPanel";
import { InstallmentWidget } from "./InstallmentWidget";
import { TrustStrip, SellerCard } from "./TrustStrip";
import { PaymentMethodsPanel } from "./PaymentMethods";
import { ServicePlanPicker } from "./ServicePlanPicker";
import { cn } from "@/utils/cn";

interface Props {
  product: Product;
  variant?: Variant;
  selection: Selection;
  onSelectionChange: (groupId: string, optionId: string) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => Promise<boolean>;
  onBuyNow: () => Promise<void>;
  onShare: () => void;
  images: ProductImage[];
  buyBoxRef: RefObject<HTMLDivElement | null>;
  servicePlanId: string;
  onServicePlanChange: (id: string) => void;
  servicePlan?: ServicePlan;
}

const AVAILABILITY_STYLE = {
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
} as const;

export function ProductInfo({
  product,
  variant,
  selection,
  onSelectionChange,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
  onShare,
  images,
  buyBoxRef,
  servicePlanId,
  onServicePlanChange,
  servicePlan,
}: Props) {
  const { addingToCart, isWishlisted, toggleWishlist, isCompared, toggleCompare, pushToast } = useStore();
  const availability = availabilityOf(variant);
  const quote = quotePrice(variant, product, quantity);
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const [justAdded, setJustAdded] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const handleAdd = async () => {
    const ok = await onAddToCart();
    if (ok) {
      setJustAdded(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setJustAdded(false), 1600);
    }
  };

  const handleBuyNow = async () => {
    setBuyingNow(true);
    try {
      await onBuyNow();
    } finally {
      setBuyingNow(false);
    }
  };

  const handleNotify = (e: ReactFormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    pushToast({
      tone: "success",
      title: "تم تسجيل تنبيه التوفر",
      description: `سنراسلك على ${notifyEmail} فور وصول ${selectionLabel(product, selection)}`,
    });
    setNotifyEmail("");
  };

  const copySku = async () => {
    const sku = variant?.sku ?? product.sku;
    try {
      await navigator.clipboard.writeText(sku);
      pushToast({ tone: "info", title: "تم نسخ رمز المنتج", description: sku, duration: 2200 });
    } catch {
      pushToast({ tone: "warning", title: "تعذّر النسخ", description: `رمز المنتج: ${sku}` });
    }
  };

  const servicePrice = servicePlan?.price ?? 0;
  const soldPercent = Math.min(94, Math.round((product.soldCount / (product.soldCount + 400)) * 100));

  // Derived from the selected option, never hard-coded.
  const stagesLabel = product.optionGroups
    .find((g) => g.id === "stages")
    ?.options.find((o) => o.id === selection.stages)?.label;
  const unitLabel = stagesLabel ? `${stagesLabel} · شامل التركيب` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* ------------------------------ Heading ------------------------------ */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/b/${product.brandSlug}`}
            className="group inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-700 transition hover:text-brand-900"
          >
            <LogoMark className="size-6 shrink-0" />
            {product.brand}
            <Icon name="chevronLeft" size={13} className="transition-transform group-hover:-translate-x-0.5" />
          </a>
          <span className="text-ink-200">|</span>
          <span className="text-[11.5px] text-ink-500">
            {product.category.name} › {product.subcategory.name}
          </span>
        </div>

        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-[1.3] text-ink-950 text-balance sm:text-[31px]">
          {product.name}
        </h1>

        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-ink-600 text-pretty">
          {product.shortDescription}
        </p>

        {/* Rating + meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px]">
          <a href="#reviews" className="group flex items-center gap-2 rounded-md transition hover:opacity-80">
            <span className="font-display text-[15px] font-extrabold text-ink-950 tabular-nums">
              {product.rating.toFixed(1)}
            </span>
            <Stars value={product.rating} size={15} />
            <span className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-4 group-hover:decoration-brand-500">
              {formatNumber(product.reviewCount)} تقييم
            </span>
          </a>
          <span className="flex items-center gap-1.5 text-ink-500">
            <Icon name="package" size={14} className="text-ink-400" />
            {formatNumber(product.soldCount)} عملية بيع
          </span>
          <button
            type="button"
            onClick={copySku}
            className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-500 transition hover:text-brand-700"
            aria-label={`نسخ رمز المنتج ${variant?.sku ?? product.sku}`}
          >
            <Icon name="copy" size={13} />
            SKU: {variant?.sku ?? product.sku}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.badges.map((badge) => (
            <Badge key={badge.id} tone={badge.tone} icon={badge.icon as IconName} size="md">
              {badge.label}
            </Badge>
          ))}
        </div>
      </header>

      <div className="h-px bg-gradient-to-l from-transparent via-ink-200 to-transparent" />

      {/* ------------------------------- Price ------------------------------- */}
      <PriceBlock quote={quote} vatPercent={product.vatPercent} unitLabel={unitLabel} />

      {/* ---------------------------- Promotions ----------------------------- */}
      <PromotionPanel promotions={product.promotions} soldPercent={soldPercent} />

      {/* ----------------------------- Variants ------------------------------ */}
      <div ref={buyBoxRef} className="rounded-lg border border-ink-100 bg-surface p-4 shadow-hair">
        <VariantSelector product={product} selection={selection} onChange={onSelectionChange} />

        {/* Availability */}
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center gap-2 rounded-md px-3 py-2.5 ring-1 ring-inset transition-colors",
            AVAILABILITY_STYLE[availability.tone]
          )}
          role="status"
          aria-live="polite"
        >
          <span className="relative flex size-2.5 shrink-0">
            {availability.purchasable && availability.status !== "low_stock" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
            )}
            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
          </span>
          <span className="text-[12.5px] font-bold">{availability.label}</span>
          {availability.status === "low_stock" && availability.remaining > 0 && (
            <span className="rounded-xs bg-white/70 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums">
              متبقي {availability.remaining} فقط
            </span>
          )}
          {availability.status === "coming_soon" && variant?.availableAt && (
            <span className="rounded-xs bg-white/70 px-1.5 py-0.5 text-[11.5px] font-bold">
              الوصول المتوقع: {formatDate(variant.availableAt)}
            </span>
          )}
          <span className="w-full text-[11.5px] leading-4 opacity-90 sm:w-auto sm:flex-1">{availability.message}</span>
        </div>

        {/* ------------------------- Quantity + CTAs ------------------------- */}
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <QuantityPicker
            value={quantity}
            onChange={onQuantityChange}
            min={1}
            max={Math.max(1, Math.min(availability.remaining || 1, 10))}
            disabled={!availability.purchasable}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-md bg-ink-50/70 px-3 py-2">
            <span className="text-[11px] font-medium text-ink-500">إجمالي السعر</span>
            <span className="font-display text-[19px] font-extrabold tabular-nums text-ink-950">
              {formatMoney(quote.subtotal + servicePrice)}
            </span>
            {servicePrice > 0 && (
              <span className="text-[11px] text-ink-500">
                يشمل {servicePlan?.name} ({formatMoney(servicePrice)})
              </span>
            )}
            {quote.discount > 0 && (
              <span className="text-[11px] font-semibold text-success">
                وفّرت {formatMoney(quote.saved * quantity)} من السعر الأصلي
              </span>
            )}
          </div>
        </div>

        {availability.purchasable ? (
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addingToCart}
              className={cn(
                "group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-5 py-4 font-display text-[15px] font-extrabold text-white shadow-brand transition-all duration-300",
                "bg-brand-700 hover:bg-brand-800 active:scale-[0.985] disabled:cursor-wait",
                justAdded && "bg-success"
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/25 to-transparent transition-transform duration-700",
                  !addingToCart && "group-hover:translate-x-full"
                )}
                aria-hidden="true"
              />
              {addingToCart ? (
                <>
                  <Icon name="refresh" size={18} className="animate-spin-slow" />
                  جارٍ الإضافة…
                </>
              ) : justAdded ? (
                <>
                  <Icon name="check" size={19} strokeWidth={2.6} />
                  تمت الإضافة إلى السلة
                </>
              ) : (
                <>
                  <Icon name="cart" size={19} />
                  {availability.ctaLabel}
                </>
              )}
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={buyingNow}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink-950 px-4 py-3.5 font-display text-[14px] font-bold text-aqua-200 transition hover:bg-ink-900 active:scale-[0.985] disabled:cursor-wait disabled:opacity-80"
              >
                {buyingNow ? (
                  <Icon name="refresh" size={17} className="animate-spin-slow" />
                ) : (
                  <Icon name="bolt" size={17} filled />
                )}
                {buyingNow ? "جارٍ التحويل للدفع…" : "اشترِ الآن"}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                className={cn(
                  "grid size-[50px] shrink-0 place-items-center rounded-lg border transition active:scale-95",
                  wishlisted
                    ? "border-danger/30 bg-danger-soft text-danger"
                    : "border-ink-200 bg-surface text-ink-600 hover:border-danger/40 hover:text-danger"
                )}
              >
                <Icon name="heart" size={19} filled={wishlisted} />
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(product)}
                aria-pressed={compared}
                aria-label={compared ? "إزالة من المقارنة" : "إضافة إلى المقارنة"}
                className={cn(
                  "grid size-[50px] shrink-0 place-items-center rounded-lg border transition active:scale-95",
                  compared
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-700"
                )}
              >
                <Icon name="compare" size={18} />
              </button>
              <button
                type="button"
                onClick={onShare}
                aria-label="مشاركة المنتج"
                className="grid size-[50px] shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-ink-600 transition hover:border-ink-400 hover:text-ink-900 active:scale-95"
              >
                <Icon name="share" size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* -------- Out of stock / coming soon: notify-me flow -------- */
          <div className="mt-4 space-y-2.5">
            <form onSubmit={handleNotify} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="notify-email" className="sr-only">
                البريد الإلكتروني لتنبيه التوفر
              </label>
              <div className="relative flex-1">
                <Icon name="user" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="notify-email"
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="بريدك الإلكتروني — لنخبرك فور توفره"
                  className="h-[50px] w-full rounded-lg border border-ink-200 bg-surface pe-3 ps-9 text-[13px] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <button
                type="submit"
                className="h-[50px] shrink-0 rounded-lg bg-ink-950 px-5 font-display text-[14px] font-bold text-aqua-200 transition hover:bg-ink-900 active:scale-[0.985] sm:w-auto"
              >
                {availability.ctaLabel}
              </button>
            </form>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-pressed={wishlisted}
                className={cn(
                  "flex h-[46px] flex-1 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition active:scale-[0.985]",
                  wishlisted ? "border-danger/30 bg-danger-soft text-danger" : "border-ink-200 bg-surface text-ink-700 hover:border-danger/40 hover:text-danger"
                )}
              >
                <Icon name="heart" size={17} filled={wishlisted} />
                {wishlisted ? "في المفضلة" : "أضف للمفضلة"}
              </button>
              <button
                type="button"
                onClick={onShare}
                className="grid size-[46px] shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-ink-600 transition hover:border-ink-400 active:scale-95"
                aria-label="مشاركة المنتج"
              >
                <Icon name="share" size={17} />
              </button>
            </div>
            <p className="flex items-center gap-1.5 rounded-md bg-ink-50 px-3 py-2 text-[11.5px] text-ink-500">
              <Icon name="info" size={13} className="text-info" />
              جرّب خيارًا آخر من {product.optionGroups[0]?.name ?? "الخيارات"} — بعض الإصدارات متوفرة الآن.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------ Installation & service ----------------------- */}
      <ServicePlanPicker
        plans={product.servicePlans}
        selectedId={servicePlanId}
        onSelect={onServicePlanChange}
        disabled={!availability.purchasable}
      />

      {/* ---------------------------- Installments ---------------------------- */}
      <InstallmentWidget providers={product.installmentProviders} total={quote.subtotal + servicePrice} />

      {/* ------------------------------ Shipping ------------------------------ */}
      <ShippingPanel product={product} orderValue={quote.subtotal + servicePrice} purchasable={availability.purchasable} />

      {/* -------------------------------- Trust -------------------------------- */}
      <TrustStrip product={product} />
      <SellerCard product={product} />

      {/* ------------------------------- Payment ------------------------------- */}
      <PaymentMethodsPanel methods={product.paymentMethods} />

      {/* Small print */}
      <p className="text-[11px] leading-5 text-ink-400">
        معرّف المنتج: <span className="font-mono">{product.id}</span> · الصور المعروضة ({images.length}) لأغراض
        التوضيح وقد تختلف درجة اللون قليلًا حسب إضاءة التصوير وشاشة الجهاز.
      </p>
    </div>
  );
}
