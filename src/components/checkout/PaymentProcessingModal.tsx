import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

interface Step {
  id: string;
  label: string;
  icon: IconName;
}

const STEPS: Step[] = [
  { id: "validate", label: "التحقق من بيانات الدفع", icon: "shield" },
  { id: "bank", label: "التواصل مع البنك لتأكيد العملية", icon: "lock" },
  { id: "order", label: "تأكيد الطلب وحجز المخزون", icon: "package" },
];

interface Props {
  open: boolean;
  onDone: () => void;
  /** Set when the order call actually failed — swaps the dialog into a retry state. */
  failure?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

/**
 * "Payment progress" overlay — purely presentational; the real charge happens
 * in `ordersApi.create`. Each stage auto-advances, then calls `onDone`.
 */
export function PaymentProcessingModal({ open, onDone, failure = null, onRetry, onBack }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!open || failure) {
      if (!open) setActiveStep(0);
      return;
    }
    const timers: number[] = [];
    STEPS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => setActiveStep(index + 1), 750 * (index + 1))
      );
    });
    timers.push(window.setTimeout(onDone, 750 * STEPS.length + 500));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  if (failure) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="تعذّر إتمام الدفع"
        className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm animate-fade"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface p-6 text-center shadow-pop animate-pop">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
            <Icon name="alert" size={26} />
          </span>
          <h2 className="mt-4 font-display text-[16px] font-extrabold text-ink-950">تعذّر إتمام عملية الدفع</h2>
          <p className="mt-2 text-[12.5px] leading-6 text-ink-600">{failure}</p>
          <p className="mt-1.5 text-[11.5px] text-ink-500">
            لم يتم إنشاء الطلب ولم يُخصم أي مبلغ. يمكنك إعادة المحاولة أو اختيار وسيلة دفع أخرى.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
              >
                <Icon name="refresh" size={15} />
                إعادة المحاولة
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-surface text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
              >
                <Icon name="card" size={15} />
                تغيير وسيلة الدفع
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="جارٍ معالجة الدفع"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm animate-fade"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-pop animate-pop">
        <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-ink-950 p-3 shadow-lift">
          <LogoMark className="size-full animate-pulse" />
        </span>
        <h2 className="mt-4 font-display text-[16px] font-extrabold text-ink-950">جارٍ إتمام عملية الدفع</h2>
        <p className="mt-1 text-[12px] text-ink-500">لا تغلق هذه الصفحة أو تحدّثها…</p>

        <ul className="mt-5 space-y-3 text-start">
          {STEPS.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <li key={step.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300",
                    done
                      ? "border-success bg-success text-white"
                      : active
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-surface text-ink-300"
                  )}
                >
                  {done ? (
                    <Icon name="check" size={14} strokeWidth={2.6} />
                  ) : active ? (
                    <Icon name="refresh" size={14} className="animate-spin-slow" />
                  ) : (
                    <Icon name={step.icon} size={13} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-medium transition-colors",
                    done ? "text-ink-800" : active ? "font-bold text-ink-900" : "text-ink-400"
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-aqua-500 via-flow-500 to-brand-600 transition-[width] duration-700 ease-out"
            style={{ width: `${(activeStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
