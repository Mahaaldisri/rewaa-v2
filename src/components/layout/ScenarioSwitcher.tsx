import { useEffect, useRef, useState } from "react";
import { SCENARIOS, type ScenarioId } from "@/services/api";
import { env } from "@/config/env";
import { useStore } from "@/store/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

/**
 * In-page QA tool: drives the mock service layer through every product state
 * (stock levels, empty/error states, slow network) so each branch of the UI can
 * be inspected without touching the data files.
 *
 * Development-only: it renders nothing at all in a production build, so real
 * shoppers can never switch the store into a simulated state.
 */
export function ScenarioSwitcher() {
  const { scenario, changeScenario, pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!env.devTools) return null;

  const active = SCENARIOS.find((s) => s.id === scenario);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
          open
            ? "border-aqua-400 bg-aqua-50 text-aqua-800"
            : "border-ink-200 bg-surface text-ink-600 hover:border-aqua-300 hover:text-aqua-700"
        )}
      >
        <Icon name="layers" size={14} />
        <span className="hidden lg:inline">حالات المنتج</span>
        <span className="max-w-[110px] truncate lg:hidden">{active?.label}</span>
        <Icon name="chevronDown" size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="حالات المنتج التجريبية"
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-[290px] origin-top-end animate-pop overflow-hidden rounded-lg border border-ink-200 bg-surface shadow-pop"
        >
          <div className="border-b border-ink-100 bg-ink-50/70 px-3.5 py-2.5">
            <p className="text-[11px] font-bold tracking-wide text-ink-700">أدوات معاينة الواجهة</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-500">
              تُمرَّر الحالة إلى طبقة الـ API الوهمية لإعادة تحميل الصفحة بحالة مختلفة.
            </p>
          </div>
          <ul className="max-h-[320px] overflow-y-auto p-1.5 thin-scrollbar">
            {SCENARIOS.map((item) => {
              const isActive = item.id === scenario;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      changeScenario(item.id as ScenarioId);
                      setOpen(false);
                      pushToast({
                        tone: "info",
                        title: `تم تفعيل: ${item.label}`,
                        description: item.hint,
                        duration: 2600,
                      });
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-start transition",
                      isActive ? "bg-brand-50 ring-1 ring-inset ring-brand-200" : "hover:bg-ink-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        isActive ? "bg-brand-600" : "bg-ink-200"
                      )}
                    />
                    <span className="min-w-0">
                      <span className={cn("block text-[12.5px] font-semibold", isActive ? "text-brand-800" : "text-ink-800")}>
                        {item.label}
                      </span>
                      <span className="block text-[11px] leading-4 text-ink-500">{item.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
