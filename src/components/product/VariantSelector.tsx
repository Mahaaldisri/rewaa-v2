import type { Product } from "@/types/product";
import { optionAvailability, type Selection } from "@/lib/product-logic";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Props {
  product: Product;
  selection: Selection;
  onChange: (groupId: string, optionId: string) => void;
  disabled?: boolean;
}

/**
 * Generic variant picker.
 * Renders any option group shape (swatch / chip / select) coming from the API,
 * marks combinations that don't exist as unavailable, and sold-out combos with a
 * strike — both conveyed with an icon + text, never colour alone.
 */
export function VariantSelector({ product, selection, onChange, disabled }: Props) {
  return (
    <div className="space-y-5">
      {product.optionGroups.map((group) => {
        const selectedId = selection[group.id];
        const selectedOption = group.options.find((o) => o.id === selectedId);

        return (
          <fieldset key={group.id} disabled={disabled} className="min-w-0">
            <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-bold text-ink-800">
                {group.name}
                {selectedOption && (
                  <span className="ms-2 font-normal text-ink-500">
                    <span className="font-semibold text-ink-900">{selectedOption.label}</span>
                    {selectedOption.note && <span className="ms-1.5 text-[11px] text-aqua-600">{selectedOption.note}</span>}
                  </span>
                )}
              </span>
              {group.hint && <span className="text-[11px] text-ink-400">{group.hint}</span>}
            </legend>

            {group.type === "select" ? (
              <div className="relative">
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => onChange(group.id, e.target.value)}
                  aria-label={group.name}
                  className="w-full appearance-none rounded-md border border-ink-200 bg-surface px-3 py-2.5 pe-9 text-[13px] font-medium transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {group.options.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400" />
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label={group.name}
                className={cn("flex flex-wrap gap-2", group.type === "swatch" && "gap-2.5")}
              >
                {group.options.map((option) => {
                  const state = optionAvailability(product, group.id, option.id, selection);
                  const isSelected = option.id === selectedId;
                  const blocked = option.disabled || state.unavailable;

                  if (group.type === "swatch") {
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${group.name}: ${option.label}${state.soldOut ? " (نافد)" : ""}${blocked ? " (غير متوفر)" : ""}`}
                        disabled={blocked}
                        onClick={() => onChange(group.id, option.id)}
                        title={`${option.label}${option.note ? ` — ${option.note}` : ""}`}
                        className={cn(
                          "group relative grid size-11 place-items-center rounded-full transition duration-200",
                          "ring-1 ring-inset ring-ink-200/70",
                          isSelected
                            ? "outline outline-2 outline-offset-[3px] outline-brand-700 ring-transparent"
                            : "hover:scale-[1.06] hover:ring-ink-300",
                          blocked && "cursor-not-allowed opacity-45 hover:scale-100"
                        )}
                      >
                        <span
                          className="size-full rounded-full"
                          style={{ backgroundImage: option.swatch ?? "var(--color-ink-200)" }}
                        />
                        {isSelected && (
                          <span className="absolute grid size-4 place-items-center rounded-full bg-surface text-brand-700 shadow-hair">
                            <Icon name="check" size={11} strokeWidth={3} />
                          </span>
                        )}
                        {(state.soldOut || blocked) && (
                          <span
                            className="absolute inset-0 rounded-full after:absolute after:start-1/2 after:top-1/2 after:h-[1.5px] after:w-[76%] after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-danger/70 after:content-['']"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${group.name}: ${option.label}${state.soldOut ? " (نافد)" : ""}${blocked ? " (غير متوفر)" : ""}`}
                      disabled={blocked}
                      onClick={() => onChange(group.id, option.id)}
                      className={cn(
                        "relative min-w-[74px] overflow-hidden rounded-md border px-3 py-2 text-[13px] font-semibold transition duration-200",
                        isSelected
                          ? "border-brand-700 bg-brand-50 text-brand-800 shadow-hair"
                          : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                        blocked && "cursor-not-allowed opacity-50 hover:border-ink-200 hover:bg-surface",
                        state.soldOut && !isSelected && "text-ink-400 line-through decoration-danger/60",
                        state.lowStock && isSelected && "border-warning/60"
                      )}
                    >
                      {option.label}
                      {state.soldOut && (
                        <span className="absolute inset-x-0 bottom-0 bg-ink-900/85 py-[1px] text-[9px] font-bold text-white no-underline">
                          نافد
                        </span>
                      )}
                      {state.lowStock && !state.soldOut && (
                        <span className="absolute -end-6 top-1 rotate-45 bg-warning px-6 py-[1px] text-[8.5px] font-bold text-white">
                          محدود
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {group.type === "swatch" && selectedOption && (
              <p className="mt-2 text-[11.5px] text-ink-500">
                اللون المختار: <span className="font-semibold text-ink-800">{selectedOption.label}</span>
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
