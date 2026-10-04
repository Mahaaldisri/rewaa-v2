import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { clamp } from "@/lib/format";
import { cn } from "@/utils/cn";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  size?: "md" | "sm";
  label?: string;
  className?: string;
}

/**
 * Accessible quantity stepper.
 * - clamps on every input path (buttons, typing, arrow keys, paste)
 * - never leaves an invalid value in state
 * - announces the remaining quantity through a polite live region
 */
export function QuantityPicker({
  value,
  onChange,
  min = 1,
  max,
  disabled,
  size = "md",
  label = "الكمية",
  className,
}: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") {
      setDraft(String(min));
      onChange(min);
      return;
    }
    const next = clamp(parseInt(digits, 10), min, max);
    setDraft(String(next));
    onChange(next);
  };

  const step = (delta: number) => {
    if (disabled) return;
    const next = clamp(value + delta, min, max);
    onChange(next);
    setDraft(String(next));
  };

  const dims = size === "sm" ? "h-9" : "h-12";
  const btn = size === "sm" ? "w-9" : "w-11";

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={inputId} className="mb-1.5 block text-[12.5px] font-bold text-ink-800">
        {label}
      </label>
      <div
        className={cn(
          "inline-flex items-stretch overflow-hidden rounded-md border bg-surface transition",
          disabled ? "border-ink-100 opacity-60" : "border-ink-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200",
          dims
        )}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || value <= min}
          aria-label="إنقاص الكمية"
          className={cn(
            "grid shrink-0 place-items-center border-e border-ink-100 text-ink-600 transition",
            btn,
            !disabled && value > min ? "hover:bg-ink-50 active:scale-90" : "cursor-not-allowed text-ink-300"
          )}
        >
          <Icon name="minus" size={size === "sm" ? 14 : 16} strokeWidth={2.2} />
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "");
            setDraft(digits);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              step(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              step(-1);
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
              inputRef.current?.blur();
            }
          }}
          aria-describedby={`${inputId}-hint`}
          className="w-10 shrink-0 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-ink-950 focus:outline-none focus:ring-0 sm:w-12"
        />

        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || value >= max}
          aria-label="زيادة الكمية"
          className={cn(
            "grid shrink-0 place-items-center border-s border-ink-100 text-ink-600 transition",
            btn,
            !disabled && value < max ? "hover:bg-ink-50 active:scale-90" : "cursor-not-allowed text-ink-300"
          )}
        >
          <Icon name="plus" size={size === "sm" ? 14 : 16} strokeWidth={2.2} />
        </button>
      </div>

      <p id={`${inputId}-hint`} className="mt-1.5 text-[11px] leading-4 text-ink-400" aria-live="polite">
        {disabled
          ? "اختيار الكمية غير متاح لهذه الحالة"
          : value >= max
            ? `الحد الأقصى للطلب من هذا الخيار: ${max} قطعة`
            : `متاح حتى ${max} قطعة من هذا الخيار`}
      </p>
    </div>
  );
}
