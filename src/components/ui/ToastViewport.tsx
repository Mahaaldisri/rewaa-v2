import { useStore, type ToastTone } from "@/store/StoreProvider";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/utils/cn";

const TONE: Record<ToastTone, { icon: IconName; ring: string; chip: string }> = {
  success: { icon: "check", ring: "border-success/30", chip: "bg-success-soft text-success" },
  error: { icon: "alert", ring: "border-danger/30", chip: "bg-danger-soft text-danger" },
  warning: { icon: "alert", ring: "border-warning/30", chip: "bg-warning-soft text-warning" },
  info: { icon: "info", ring: "border-info/30", chip: "bg-info-soft text-info" },
};

/**
 * Global toast stack.
 * Bottom-end on desktop (clear of the sticky buy bar) and top on mobile.
 */
export function ToastViewport() {
  const { toasts, dismissToast } = useStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-20 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-24 sm:top-auto sm:end-6 sm:items-end"
      role="region"
      aria-label="الإشعارات"
    >
      <div aria-live="polite" aria-atomic="false" className="contents">
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface/95 p-3 shadow-pop backdrop-blur-md animate-toast-in",
                tone.ring
              )}
            >
              <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-md", tone.chip)}>
                <Icon name={tone.icon} size={17} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-5 text-ink-900">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-500">{toast.description}</p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-1.5 text-xs font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-800"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="إغلاق الإشعار"
                className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
              >
                <Icon name="close" size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
