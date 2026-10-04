import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Order, OrderStatus } from "@/types/order";
import { ordersApi } from "@/services/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PaymentGlyph } from "@/components/product/PaymentMethods";
import { LogoMark } from "@/components/brand/Logo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

const STATUS_ICON: Record<OrderStatus, IconName> = {
  processing: "clock",
  confirmed: "check",
  preparing: "package",
  shipped: "truck",
  delivered: "badgeCheck",
  cancelled: "close",
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    ordersApi
      .get(orderId)
      .then(setOrder)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="container-x py-8">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-6 h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-x flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-lg font-bold text-ink-900">لم نعثر على هذا الطلب</p>
        <Link to="/account/orders" className="mt-3 text-[12.5px] font-semibold text-brand-700 hover:underline">
          العودة إلى طلباتي
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-ambient">
      <div className="container-x py-6 sm:py-9">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "حسابي", href: "/account" },
            { label: "طلباتي", href: "/account?tab=orders" },
            { label: order.number, href: `/account/orders/${order.id}` },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-xl font-extrabold text-ink-950">{order.number}</h1>
          <span className="text-[12px] text-ink-500">{formatDate(order.createdAt)}</span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair sm:p-6">
            <h2 className="font-display text-[14.5px] font-bold text-ink-900">حالة الطلب</h2>
            <ol className="mt-5 space-y-5">
              {order.timeline.map((step, index) => {
                const done = Boolean(step.at);
                const isLast = index === order.timeline.length - 1;
                return (
                  <li key={step.status} className="relative flex gap-3">
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
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair">
              <h2 className="mb-3 font-display text-[14.5px] font-bold text-ink-900">المنتجات</h2>
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
                  <dt className="font-bold text-ink-900">الإجمالي</dt>
                  <dd className="font-display text-[16px] font-extrabold tabular-nums text-ink-950">{formatMoney(order.total)}</dd>
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

            <a
              href="tel:920001234"
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-surface text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              <Icon name="headset" size={15} />
              تحتاج مساعدة بخصوص الطلب؟
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
