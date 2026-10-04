import { useEffect, useState } from "react";
import type { Promotion } from "@/types/product";
import { promotionState } from "@/lib/product-logic";
import { useCountdown } from "@/hooks/useCountdown";
import { pad2 } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

const TYPE_ICON: Record<Promotion["type"], IconName> = {
  percentage: "tag",
  fixed_amount: "tag",
  buy_x_get_y: "gift",
  flash_sale: "bolt",
  coupon: "ticket",
  free_shipping: "truck",
  free_gift: "gift",
  multi_buy: "layers",
  bundle: "package",
  installments: "wallet",
};

/* ----------------------------- Countdown ------------------------------ */

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        key={value}
        className="grid min-w-[46px] place-items-center rounded-md bg-ink-950 px-2 py-1.5 font-display text-[22px] font-extrabold tabular-nums leading-none text-aqua-300 shadow-hair animate-pop"
      >
        {pad2(value)}
      </span>
      <span className="mt-1 text-[10px] font-medium text-ink-500">{label}</span>
    </div>
  );
}

function Separator() {
  return (
    <span className="mb-4 flex flex-col gap-1" aria-hidden="true">
      <span className="size-1 rounded-full bg-ink-300" />
      <span className="size-1 rounded-full bg-ink-300" />
    </span>
  );
}

export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(endsAt);

  if (isExpired) {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-ink-100 px-2.5 py-1.5 text-[12px] font-semibold text-ink-500">
        <Icon name="clock" size={14} />
        انتهى العرض
      </p>
    );
  }

  return (
    <div className="flex items-end gap-1.5" role="timer" aria-live="off">
      <CountBox value={days} label="يوم" />
      <Separator />
      <CountBox value={hours} label="ساعة" />
      <Separator />
      <CountBox value={minutes} label="دقيقة" />
      <Separator />
      <CountBox value={seconds} label="ثانية" />
    </div>
  );
}

/* --------------------------- Promotion list --------------------------- */

interface Props {
  promotions: Promotion[];
  soldPercent?: number;
  className?: string;
}

export function PromotionPanel({ promotions, soldPercent = 72, className }: Props) {
  const { pushToast } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /** Re-evaluates promotion windows so an expiring offer flips its own state. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const highlighted = promotions.find((p) => p.highlight);
  const rest = promotions.filter((p) => p.id !== highlighted?.id);

  const copyCoupon = async (promo: Promotion) => {
    if (!promo.code) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopiedId(promo.id);
      pushToast({
        tone: "success",
        title: "تم نسخ كود الخصم",
        description: `${promo.code} — الصقه في صفحة إتمام الطلب`,
      });
      window.setTimeout(() => setCopiedId((id) => (id === promo.id ? null : id)), 2200);
    } catch {
      pushToast({
        tone: "error",
        title: "تعذّر نسخ الكود",
        description: `اكتب الكود يدويًا: ${promo.code}`,
      });
    }
  };

  if (promotions.length === 0) return null;

  return (
    <div className={cn("space-y-2.5", className)}>
      {highlighted && (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border p-4 transition-colors",
            promotionState(highlighted, now) === "active"
              ? "border-danger/25 bg-gradient-to-l from-danger-soft via-surface to-aqua-50/40"
              : "border-ink-200 bg-ink-50"
          )}
        >
          <div className="pointer-events-none absolute -end-6 -top-8 size-28 rounded-full bg-danger/10 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-danger px-2 py-1 text-[11px] font-bold text-white">
                <Icon name="bolt" size={13} filled />
                {promotionState(highlighted, now) === "active" ? "عرض لفترة محدودة" : "عرض منتهٍ"}
              </span>
              <h3 className="mt-2 font-display text-[15px] font-extrabold text-ink-950">
                {highlighted.title}
                {highlighted.value ? (
                  <span className="ms-2 rounded-md bg-ink-950 px-1.5 py-0.5 align-middle text-[12px] text-aqua-300">
                    خصم {highlighted.value}%
                  </span>
                ) : null}
              </h3>
              {highlighted.description && (
                <p className="mt-1 text-[12.5px] leading-5 text-ink-600">{highlighted.description}</p>
              )}
            </div>
            {promotionState(highlighted, now) === "active" && highlighted.endsAt ? (
              <div className="flex flex-col items-end gap-2">
                <p className="text-[11px] font-semibold text-ink-500">ينتهي العرض خلال</p>
                <FlashCountdown endsAt={highlighted.endsAt} />
              </div>
            ) : (
              <p className="flex items-center gap-1.5 self-center rounded-md bg-ink-100 px-3 py-2 text-[12px] font-semibold text-ink-500">
                <Icon name="clock" size={14} />
                انتهى هذا العرض — تابع العروض الجديدة
              </p>
            )}
          </div>

          {promotionState(highlighted, now) === "active" && (
            <div className="relative mt-3.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-ink-500">
                <span>بيع {soldPercent}% من كمية العرض</span>
                <span className="text-danger">تبقّى {100 - soldPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-danger to-aqua-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${soldPercent}%` }}
                />
              </div>
            </div>
          )}

          {highlighted.terms && (
            <ul className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {highlighted.terms.map((term) => (
                <li key={term} className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <Icon name="check" size={12} className="text-brand-500" />
                  {term}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {rest.map((promo) => {
        const state = promotionState(promo, now);
        const expired = state === "expired";
        return (
          <div
            key={promo.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-surface px-3.5 py-3 transition",
              expired ? "border-dashed border-ink-200 opacity-65" : "border-ink-100 hover:border-brand-200 hover:shadow-hair"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
                expired
                  ? "bg-ink-100 text-ink-400"
                  : promo.tone === "aqua"
                    ? "bg-aqua-50 text-aqua-700"
                    : "bg-brand-50 text-brand-700"
              )}
            >
              <Icon name={TYPE_ICON[promo.type]} size={16} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-ink-900">
                {promo.title}
                {expired && (
                  <span className="rounded-xs bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                    منتهٍ
                  </span>
                )}
              </p>
              {promo.description && (
                <p className="mt-0.5 text-[12px] leading-5 text-ink-500">{promo.description}</p>
              )}
              {promo.endsAt && !expired && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-aqua-700">
                  <Icon name="clock" size={12} />
                  ساري لفترة محدودة
                </p>
              )}
            </div>

            {promo.code && !expired && (
              <button
                type="button"
                onClick={() => copyCoupon(promo)}
                className={cn(
                  "shrink-0 rounded-md border border-dashed px-2.5 py-1.5 font-mono text-[12px] font-bold tracking-wider transition",
                  copiedId === promo.id
                    ? "border-success bg-success-soft text-success"
                    : "border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100"
                )}
                aria-label={`نسخ كود الخصم ${promo.code}`}
              >
                {copiedId === promo.id ? (
                  <span className="flex items-center gap-1">
                    <Icon name="check" size={13} strokeWidth={2.4} /> نُسخ
                  </span>
                ) : (
                  promo.code
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
