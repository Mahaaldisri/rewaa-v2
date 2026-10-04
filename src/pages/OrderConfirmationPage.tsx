import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Order, OrderStatus } from "@/types/order";
import { ordersApi } from "@/services/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PaymentGlyph } from "@/components/product/PaymentMethods";
import { LogoMark } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/primitives";
import { usePageSeo } from "@/lib/seo";
import { cn } from "@/utils/cn";

const STATUS_ICON: Record<OrderStatus, IconName> = {
  processing: "clock",
  confirmed: "check",
  preparing: "package",
  shipped: "truck",
  delivered: "badgeCheck",
  cancelled: "close",
};

export function OrderConfirmationPage() {
  usePageSeo({
    title: "تأكيد الطلب | رواء",
    description: "تفاصيل طلبك وحالة الدفع والتوصيل.",
    canonical: "/order",
    robots: "noindex, nofollow",
  });
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    ordersApi
      .get(orderId)
      .then((data) => active && setOrder(data))
      .catch(() => active && setError("لم نعثر على هذا الطلب."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="container-x py-10">
        <Skeleton className="mx-auto h-20 w-20 rounded-2xl" />
        <Skeleton className="mx-auto mt-5 h-6 w-64" />
        <Skeleton className="mx-auto mt-3 h-4 w-48" />
        <Skeleton className="mx-auto mt-8 h-64 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger">
          <Icon name="alert" size={26} />
        </span>
        <h1 className="mt-5 font-display text-xl font-extrabold text-ink-950">لم نتمكن من إيجاد الطلب</h1>
        <p className="mt-2 text-[13px] text-ink-500">تأكد من الرابط أو راجع طلباتك من صفحة الحساب.</p>
        <Link to="/" className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-ambient">
      <div className="container-x py-10 sm:py-14">
        {/* Success header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="relative mx-auto grid size-20 place-items-center rounded-2xl bg-success-soft text-success shadow-lift animate-pop">
            <Icon name="check" size={38} strokeWidth={2.4} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-950 sm:text-[28px]">
            تم تأكيد طلبك بنجاح 🎉
          </h1>
          <p className="mt-2 text-[13.5px] leading-6 text-ink-500">
            شكرًا لثقتك في رواء. أرسلنا تفاصيل الطلب إلى بريدك الإلكتروني، وسيتواصل فريق الجدولة معك قريبًا لتأكيد
            موعد التركيب.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-white">
            <LogoMark className="size-5" />
            <span className="font-mono text-[13px] font-bold tracking-wider">{order.number}</span>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 lg:grid-cols-[1.3fr_1fr]">
          {/* Timeline */}
          <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair sm:p-6">
            <h2 className="font-display text-[14.5px] font-bold text-ink-900">حالة الطلب</h2>
            <ol className="mt-5 space-y-5">
              {order.timeline.map((step, index) => {
                const done = Boolean(step.at);
                const isLast = index === order.timeline.length - 1;
                return (
                  <li key={step.status} className="relative flex gap-3 ps-0">
                    {!isLast && (
                      <span
                        className={cn(
                          "absolute top-8 start-[15px] h-[calc(100%-8px)] w-0.5",
                          done ? "bg-brand-500" : "bg-ink-200"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2",
                        done ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-surface text-ink-300"
                      )}
                    >
                      <Icon name={STATUS_ICON[step.status]} size={14} />
                    </span>
                    <div>
                      <p className={cn("text-[13px] font-bold", done ? "text-ink-900" : "text-ink-400")}>{step.label}</p>
                      {step.at && <p className="text-[11px] text-ink-400">{formatDate(step.at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-lg bg-brand-50/60 p-3.5 text-[12px] text-brand-900 ring-1 ring-inset ring-brand-100">
              <p className="flex items-center gap-1.5 font-bold">
                <Icon name="truck" size={14} />
                التسليم المتوقع
              </p>
              <p className="mt-1">
                بين {formatDate(order.estimatedDeliveryFrom)} و {formatDate(order.estimatedDeliveryTo)}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair">
              <h2 className="mb-3 font-display text-[14.5px] font-bold text-ink-900">تفاصيل الطلب</h2>
              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.variantId} className="flex items-center gap-2.5">
                    <span className="size-12 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                      {item.image ? (
                        <img src={item.image} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center p-2">
                          <LogoMark className="size-full" />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[12px] font-semibold text-ink-800">{item.name}</p>
                      <p className="text-[10.5px] text-ink-400">
                        {item.selectionLabel} × {item.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink-800">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-3.5 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-ink-500">المجموع الفرعي</dt>
                  <dd className="tabular-nums text-ink-700">{formatMoney(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-success">الخصم</dt>
                    <dd className="tabular-nums text-success">-{formatMoney(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-500">الشحن</dt>
                  <dd className="tabular-nums text-ink-700">{order.shippingCost === 0 ? "مجاني" : formatMoney(order.shippingCost)}</dd>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-[14px]">
                  <dt className="font-bold text-ink-900">الإجمالي المدفوع</dt>
                  <dd className="font-display text-[17px] font-extrabold tabular-nums text-ink-950">
                    {formatMoney(order.total)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2 rounded-md bg-ink-50 p-2.5">
                <PaymentGlyph id={order.paymentMethod} />
                <span className="text-[11.5px] font-semibold text-ink-700">{order.paymentLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair">
              <h2 className="mb-2 font-display text-[13.5px] font-bold text-ink-900">عنوان الشحن</h2>
              <p className="text-[12.5px] leading-6 text-ink-600">
                {order.address.fullName} · {order.address.phone}
                <br />
                {order.address.district}، {order.address.street}
                {order.address.buildingNo ? `، مبنى ${order.address.buildingNo}` : ""} — {order.address.cityName}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                to="/account/orders"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-ink-950 text-[13px] font-bold text-aqua-200 transition hover:bg-ink-900"
              >
                <Icon name="package" size={15} />
                تتبّع طلباتي
              </Link>
              <Link
                to="/"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-surface text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                متابعة التسوق
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
