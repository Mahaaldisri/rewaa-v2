import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/store/StoreProvider";
import { formatMoney } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/cart-logic";
import { Icon } from "@/components/ui/Icon";
import { usePageSeo } from "@/lib/seo";
import { payments } from "@/services/payments";
import { track } from "@/services/analytics";
import { itemFromCartLine } from "@/services/analytics/map";
import { legal } from "@/config/site";
import { QuantityPicker } from "@/components/product/QuantityPicker";
import { PaymentGlyphs } from "@/components/product/PaymentMethods";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

export function CartPage() {
  usePageSeo({
    title: "سلة الشراء | رواء",
    description: "راجع منتجات سلتك قبل إتمام الطلب.",
    canonical: "/cart",
    robots: "noindex, nofollow",
  });
  const navigate = useNavigate();
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    couponInput,
    setCouponInput,
    applyCoupon,
    removeCoupon,
    cartTotals,
  } = useStore();
  const [removingId, setRemovingId] = useState<string | null>(null);

  /* view_cart fires once per visit to the cart, with the current lines. */
  useEffect(() => {
    if (cart.length === 0) return;
    track("view_cart", {
      currency: legal.currency,
      value: cartTotals.total,
      items: cart.map(itemFromCartLine),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = (variantId: string) => {
    setRemovingId(variantId);
    window.setTimeout(() => {
      const line = cart.find((item) => item.variantId === variantId);
      if (line) {
        track("remove_from_cart", {
          currency: legal.currency,
          value: line.unitPrice * line.quantity,
          items: [itemFromCartLine(line)],
        });
      }
      removeFromCart(variantId);
      setRemovingId(null);
    }, 180);
  };

  if (cart.length === 0) {
    return (
      <div className="bg-ambient">
        <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-surface p-4 shadow-lift ring-1 ring-ink-100">
            <Icon name="cart" size={36} className="text-ink-300" />
          </span>
          <h1 className="mt-6 font-display text-xl font-extrabold text-ink-950 sm:text-2xl">سلتك فارغة حاليًا</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-ink-500">
            أضف نظام تنقية المياه المناسب لمنزلك، أو تصفّح قطع الغيار والمعدات المكمّلة.
          </p>
          <Link
            to="/p/water-filters/rewaa-pro-ro7"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 font-display text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
          >
            ابدأ التسوق
            <Icon name="arrowLeft" size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ambient">
      <div className="container-x py-5 sm:py-7">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "سلة التسوق", href: "/cart" },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold text-ink-950">
            سلة التسوق <span className="text-ink-400">({cartTotals.itemCount})</span>
          </h1>
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-400 transition hover:text-danger"
          >
            <Icon name="close" size={14} />
            إفراغ السلة
          </button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ------------------------------- Line items ------------------------------- */}
          <div className="space-y-3">
            {cart.map((line) => (
              <article
                key={line.id}
                className={cn(
                  "flex gap-3 rounded-xl border border-ink-100 bg-surface p-3 shadow-hair transition-all duration-200 sm:gap-4 sm:p-4",
                  removingId === line.variantId && "scale-[0.98] opacity-0"
                )}
              >
                <span className="size-20 shrink-0 overflow-hidden rounded-lg bg-paper-deep sm:size-24">
                  {line.image ? (
                    <img src={line.image} alt={line.name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid size-full place-items-center p-3">
                      <LogoMark className="size-full" />
                    </span>
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[13.5px] font-bold leading-5 text-ink-900">{line.name}</h3>
                      <p className="mt-1 text-[11.5px] text-ink-500">{line.selectionLabel}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-ink-300">SKU: {line.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(line.variantId)}
                      aria-label={`إزالة ${line.name} من السلة`}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-ink-400 transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                    <QuantityPicker
                      value={line.quantity}
                      onChange={(value) => updateCartQuantity(line.variantId, value)}
                      min={1}
                      max={20}
                      size="sm"
                      label=""
                      className="[&>label]:hidden"
                    />
                    <div className="text-end">
                      <p className="font-display text-[16px] font-extrabold tabular-nums text-ink-950">
                        {formatMoney(line.unitPrice * line.quantity)}
                      </p>
                      {line.quantity > 1 && (
                        <p className="text-[10.5px] text-ink-400">{formatMoney(line.unitPrice)} / للقطعة</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            <Link
              to="/p/water-filters/rewaa-pro-ro7"
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 bg-surface/60 py-3.5 text-[12.5px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
            >
              <Icon name="plus" size={14} />
              إضافة المزيد من المنتجات
            </Link>
          </div>

          {/* -------------------------------- Summary --------------------------------- */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <div className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair sm:p-5">
              <h2 className="font-display text-[15px] font-bold text-ink-900">ملخص الطلب</h2>

              {/* Coupon */}
              <div className="mt-3.5">
                {cartTotals.coupon ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-success">
                      <Icon name="ticket" size={14} />
                      {cartTotals.coupon.code} مُفعَّل
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-[11px] font-semibold text-success underline underline-offset-2"
                    >
                      إزالة
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyCoupon();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Icon name="ticket" size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="كود الخصم"
                        aria-label="كود الخصم"
                        className="h-10 w-full rounded-md border border-ink-200 bg-surface pe-3 ps-9 text-[12.5px] uppercase focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-10 shrink-0 rounded-md bg-ink-950 px-4 text-[12.5px] font-bold text-aqua-200 transition hover:bg-ink-900"
                    >
                      تطبيق
                    </button>
                  </form>
                )}
                {cartTotals.couponError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-danger">
                    <Icon name="alert" size={12} />
                    {cartTotals.couponError}
                  </p>
                )}
              </div>

              {/* Free shipping progress */}
              {cartTotals.subtotal - cartTotals.discount < FREE_SHIPPING_THRESHOLD && (
                <div className="mt-3.5 rounded-md bg-brand-50/70 p-2.5 ring-1 ring-inset ring-brand-100">
                  <p className="text-[11px] font-medium text-brand-800">
                    أضف{" "}
                    <strong className="font-display">
                      {formatMoney(FREE_SHIPPING_THRESHOLD - (cartTotals.subtotal - cartTotals.discount))}
                    </strong>{" "}
                    لتحصل على شحن مجاني
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, ((cartTotals.subtotal - cartTotals.discount) / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Totals */}
              <dl className="mt-4 space-y-2 border-t border-ink-100 pt-3.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">المجموع الفرعي</dt>
                  <dd className="font-semibold tabular-nums text-ink-800">{formatMoney(cartTotals.subtotal)}</dd>
                </div>
                {cartTotals.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-success">الخصم</dt>
                    <dd className="font-semibold tabular-nums text-success">-{formatMoney(cartTotals.discount)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">الشحن</dt>
                  <dd className="font-semibold tabular-nums text-ink-800">
                    {cartTotals.shippingCost === 0 ? "مجاني" : formatMoney(cartTotals.shippingCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-400">
                  <dt>شامل ضريبة القيمة المضافة</dt>
                  <dd>{formatMoney(cartTotals.vatIncluded)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-[15px]">
                  <dt className="font-bold text-ink-900">الإجمالي</dt>
                  <dd className="font-display text-[20px] font-extrabold tabular-nums text-ink-950">
                    {formatMoney(cartTotals.total)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98]"
              >
                <Icon name="lock" size={16} />
                متابعة إلى الدفع
              </button>

              <div className="mt-3.5 flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-ink-400">وسائل الدفع المتاحة</span>
                <PaymentGlyphs />
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-surface p-3.5 text-[11.5px] leading-5 text-ink-500">
              <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-success" />
              {payments.current().live
                ? "الدفع يتم عبر بوابة دفع إلكترونية، ولا تُخزَّن بيانات البطاقة في المتجر."
                : payments.current().id === "demo"
                  ? "وضع تجريبي: لا توجد بوابة دفع متصلة، ولن يُخصم أي مبلغ."
                  : "الدفع الإلكتروني غير مفعّل في هذه البيئة — يمكنك اختيار الدفع عند الاستلام أو التحويل البنكي."}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
