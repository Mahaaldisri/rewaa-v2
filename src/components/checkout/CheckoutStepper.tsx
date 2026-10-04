import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

export interface CheckoutStep {
  id: string;
  label: string;
  icon: IconName;
}

interface Props {
  steps: CheckoutStep[];
  activeIndex: number;
  completedIndex: number;
  onStepClick: (index: number) => void;
}

/** Horizontal progress stepper — only completed steps are clickable. */
export function CheckoutStepper({ steps, activeIndex, completedIndex, onStepClick }: Props) {
  return (
    <nav aria-label="خطوات إتمام الطلب" className="mb-6">
      <ol className="flex items-start gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const isDone = index < completedIndex || index < activeIndex;
          const isActive = index === activeIndex;
          const isClickable = index <= completedIndex && index !== activeIndex;

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "mx-auto h-[2px] flex-1 rounded-full transition-colors duration-300",
                    index === 0 ? "invisible" : isDone ? "bg-brand-600" : "bg-ink-200"
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "-mt-4 flex flex-col items-center gap-1.5 bg-transparent px-1",
                  isClickable && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 font-display text-[12px] font-bold transition-all duration-300 sm:size-9",
                    isActive
                      ? "border-brand-700 bg-brand-700 text-white shadow-brand"
                      : isDone
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-surface text-ink-400"
                  )}
                >
                  {isDone && !isActive ? <Icon name="check" size={15} strokeWidth={2.6} /> : <Icon name={step.icon} size={15} />}
                </span>
                <span
                  className={cn(
                    "hidden text-[11px] font-semibold sm:block",
                    isActive ? "text-brand-800" : isDone ? "text-ink-700" : "text-ink-400"
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
