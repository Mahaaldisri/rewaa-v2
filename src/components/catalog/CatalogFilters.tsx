import { useEffect, useState } from "react";
import type { CatalogQuery, FilterGroup } from "@/types/catalog";
import { sortOptions } from "@/services/catalogApi";
import type { CatalogFiltersController } from "@/hooks/useCatalogFilters";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Query → option state                                                */
/* ------------------------------------------------------------------ */

const BOOLEAN_GROUPS = ["pump", "tank", "installation"] as const;

function selectedValues(group: FilterGroup, query: CatalogQuery): string[] {
  switch (group.id) {
    case "brand":
      return query.brandSlugs ?? [];
    case "stages":
      return (query.stages ?? []).map(String);
    case "systemType":
      return query.systemType ?? [];
    case "capacity":
      return query.capacityBuckets ?? [];
    case "flowRate":
      return query.flowRateBuckets ?? [];
    case "usage":
      return [...(query.usage ?? [])];
    case "replacementInterval":
      return (query.replacementMonths ?? []).map(String);
    case "warranty":
      return query.minWarrantyMonths !== undefined ? [String(query.minWarrantyMonths)] : [];
    case "rating":
      return query.minRating !== undefined ? [String(query.minRating)] : [];
    case "pump":
      return query.hasPump ? ["with"] : [];
    case "tank":
      return query.hasTank ? ["with"] : [];
    case "installation":
      return query.installationIncluded ? ["available"] : [];
    case "availability":
      return query.availability ? [query.availability] : [];
    case "compatibleModels":
      return query.compatibleModel ? [query.compatibleModel] : [];
    case "useCase":
      return query.useCase ?? [];
    case "users":
      return query.users ?? [];
    case "installType":
      return query.installationType ?? [];
    case "features":
      return [query.hasRo ? "ro" : null, query.hasUv ? "uv" : null].filter((value): value is string => Boolean(value));
    case "offers":
      return query.discounted ? ["yes"] : [];
    default:
      return [];
  }
}

/** Keyboard-accessible single-thumb range used for the price bounds. */
function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-ink-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} — السعر`}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={() => onCommit(value)}
        onKeyUp={(event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
            onCommit(value);
          }
        }}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-150 accent-brand-700"
      />
      <span className="w-14 shrink-0 text-end text-[11px] tabular-nums text-ink-600">{value}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Group renderer                                                      */
/* ------------------------------------------------------------------ */

function GroupBlock({ group, controller }: { group: FilterGroup; controller: CatalogFiltersController }) {
  const { query } = controller;
  const values = selectedValues(group, query);

  const [priceDraft, setPriceDraft] = useState({
    min: query.minPrice !== undefined ? String(query.minPrice) : "",
    max: query.maxPrice !== undefined ? String(query.maxPrice) : "",
  });
  const [modelDraft, setModelDraft] = useState(query.compatibleModel ?? "");

  useEffect(() => {
    setPriceDraft({
      min: query.minPrice !== undefined ? String(query.minPrice) : "",
      max: query.maxPrice !== undefined ? String(query.maxPrice) : "",
    });
  }, [query.minPrice, query.maxPrice]);

  const groupId = group.id;
  const isBooleanGroup = (BOOLEAN_GROUPS as readonly string[]).includes(groupId);

  if (group.kind === "range") {
    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-2">
          {(["min", "max"] as const).map((edge) => (
            <label key={edge} className="flex-1">
              <span className="sr-only">{edge === "min" ? "أقل سعر" : "أعلى سعر"}</span>
              <input
                type="number"
                inputMode="numeric"
                min={group.min}
                max={group.max}
                step={group.step ?? 10}
                value={priceDraft[edge]}
                placeholder={edge === "min" ? String(group.min ?? 0) : String(group.max ?? "")}
                onChange={(event) => setPriceDraft((prev) => ({ ...prev, [edge]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    controller.setRange(
                      priceDraft.min ? Number(priceDraft.min) : undefined,
                      priceDraft.max ? Number(priceDraft.max) : undefined
                    );
                  }
                }}
                className="h-9 w-full rounded-md border border-ink-200 bg-surface px-2.5 text-[12px] tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() =>
              controller.setRange(
                priceDraft.min ? Number(priceDraft.min) : undefined,
                priceDraft.max ? Number(priceDraft.max) : undefined
              )
            }
            className="h-9 shrink-0 rounded-md bg-ink-950 px-3 text-[12px] font-bold text-aqua-200"
          >
            تطبيق
          </button>
        </div>
        {group.min !== undefined && group.max !== undefined && (
          <>
            <div className="mt-3 space-y-2">
              <RangeRow
                label="من"
                min={group.min}
                max={group.max}
                step={group.step ?? 10}
                value={Number(priceDraft.min || group.min)}
                onChange={(value) => setPriceDraft((prev) => ({ ...prev, min: String(value) }))}
                onCommit={(value) =>
                  controller.setRange(value, priceDraft.max ? Number(priceDraft.max) : undefined)
                }
              />
              <RangeRow
                label="إلى"
                min={group.min}
                max={group.max}
                step={group.step ?? 10}
                value={Number(priceDraft.max || group.max)}
                onChange={(value) => setPriceDraft((prev) => ({ ...prev, max: String(value) }))}
                onCommit={(value) =>
                  controller.setRange(priceDraft.min ? Number(priceDraft.min) : undefined, value)
                }
              />
            </div>
            <p className="mt-1.5 text-[11px] tabular-nums text-ink-400">
              نطاق الكتالوج: {group.min} – {group.max} {group.unit ?? ""}
            </p>
          </>
        )}
      </div>
    );
  }

  if (group.id === "compatibleModels" || group.kind === "search") {
    return (
      <div className="mt-2.5 flex items-center gap-2">
        <input
          value={modelDraft}
          onChange={(event) => setModelDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") controller.setModel(modelDraft);
          }}
          placeholder="اكتب رقم الموديل"
          aria-label="بحث برقم الموديل"
          className="h-9 w-full rounded-md border border-ink-200 bg-surface px-2.5 text-[12px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="button"
          onClick={() => controller.setModel(modelDraft)}
          className="h-9 shrink-0 rounded-md bg-ink-950 px-3 text-[12px] font-bold text-aqua-200"
        >
          ابحث
        </button>
      </div>
    );
  }

  return (
    <ul className={cn("mt-2.5 space-y-1", group.options.length > 6 && "max-h-60 overflow-y-auto pe-1")}>
      {group.options.map((option) => {
        const checked = values.includes(option.id);
        return (
          <li key={option.id}>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-[12.5px] transition hover:bg-ink-50">
              <span className="flex items-center gap-2 text-ink-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (groupId === "availability") controller.setAvailability(checked ? undefined : (option.id as "in_stock" | "coming_soon"));
                    else if (groupId === "offers") controller.setDiscounted(!checked);
                    else if (groupId === "useCase") controller.toggleDerived("useCase", option.id);
                    else if (groupId === "users") controller.toggleDerived("users", option.id);
                    else if (groupId === "installType") controller.toggleDerived("installType", option.id);
                    else if (groupId === "features") controller.toggleDerived("features", option.id);
                    else if (group.kind === "toggle" || isBooleanGroup) controller.toggleBoolean(groupId);
                    else if (groupId === "rating") controller.setMinRating(checked ? undefined : Number(option.id));
                    else if (groupId === "warranty") controller.setMinWarranty(checked ? undefined : Number(option.id));
                    else controller.toggleListValue(groupId, option.id);
                  }}
                  className="size-4 accent-brand-700"
                />
                {option.swatch && (
                  <span
                    className="size-3.5 rounded-full ring-1 ring-inset ring-ink-200"
                    style={{ background: option.swatch }}
                    aria-hidden="true"
                  />
                )}
                <span className="flex flex-col">
                  {option.label}
                  {(option as { hint?: string }).hint && (
                    <span className="text-[10.5px] font-normal text-ink-400">{(option as { hint?: string }).hint}</span>
                  )}
                </span>
              </span>
              <span className="text-[11px] tabular-nums text-ink-400">{option.count}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function FilterBody({ facets, controller }: { facets: FilterGroup[]; controller: CatalogFiltersController }) {
  return (
    <div className="space-y-5">
      {(controller.query.useCase?.length ?? 0) > 0 && (
        <p className="rounded-lg border border-aqua-200 bg-aqua-50/70 p-2.5 text-[11.5px] leading-5 text-aqua-900">
          <Icon name="info" size={12} className="me-1 inline" />
          عدد المستخدمين وطريقة التركيب تقديرات مبنية على بيانات المنتج (التدفق، السعة، الفئة) وليست ضمانًا للاستخدام.
        </p>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[14px] font-extrabold text-ink-950">تصفية النتائج</h2>
        <button type="button" onClick={controller.reset} className="text-[12px] font-bold text-brand-700 hover:underline">
          مسح الكل
        </button>
      </div>

      {facets.map((group) => (
        <section key={group.id} className="border-t border-ink-100 pt-4 first:border-t-0 first:pt-0">
          <h3 className="text-[12.5px] font-bold text-ink-800">
            {group.label}
            {group.hint && <span className="ms-1 text-[11px] font-normal text-ink-400">({group.hint})</span>}
          </h3>
          <GroupBlock group={group} controller={controller} />
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exports used by listing pages                                       */
/* ------------------------------------------------------------------ */

export function CatalogSidebar({
  facets,
  controller,
}: {
  facets: FilterGroup[];
  controller: CatalogFiltersController;
}) {
  if (facets.length === 0) return null;
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[calc(var(--header-h)+16px)] max-h-[calc(100vh-var(--header-h)-32px)] overflow-y-auto rounded-xl border border-ink-100 bg-surface p-4">
        <FilterBody facets={facets} controller={controller} />
      </div>
    </aside>
  );
}

export function FilterTrigger({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-3 text-[12px] font-bold text-ink-700 lg:hidden"
    >
      <Icon name="filter" size={14} />
      تصفية
      {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-700 text-[10px] text-white">{count}</span>}
    </button>
  );
}

export function FilterDrawer({
  open,
  onClose,
  facets,
  controller,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  facets: FilterGroup[];
  controller: CatalogFiltersController;
  resultCount: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="تصفية النتائج">
      <button type="button" className="absolute inset-0 bg-ink-950/50" aria-label="إغلاق التصفية" onClick={onClose} />
      {/* Bottom sheet: thumb-reachable on phones, unchanged on larger screens. */}
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-surface shadow-pop">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-200" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="font-display text-[14px] font-extrabold text-ink-950">تصفية النتائج</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <FilterBody facets={facets} controller={controller} />
        </div>

        <div className="flex items-center gap-2 border-t border-ink-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={controller.reset}
            className="h-11 shrink-0 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-600"
          >
            مسح الكل
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg bg-brand-700 text-[13px] font-bold text-white shadow-brand"
          >
            عرض {resultCount} منتج
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterChips({ controller }: { controller: CatalogFiltersController }) {
  const chips = controller.activeFilters;
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.groupId}-${chip.optionId}`}
          type="button"
          onClick={() => controller.removeFilter(chip.groupId, chip.optionId)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-[11.5px] font-bold text-brand-800 transition hover:border-brand-300"
        >
          {chip.label}
          <Icon name="close" size={12} strokeWidth={2.4} />
        </button>
      ))}
      <button type="button" onClick={controller.reset} className="text-[11.5px] font-bold text-ink-500 hover:text-danger">
        مسح الكل
      </button>
    </div>
  );
}

export function SortSelect({
  value,
  onChange,
}: {
  value: CatalogQuery["sort"];
  onChange: (value: NonNullable<CatalogQuery["sort"]>) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-ink-500">
      <span className="hidden sm:inline">ترتيب حسب</span>
      <select
        value={value ?? "featured"}
        onChange={(event) => onChange(event.target.value as NonNullable<CatalogQuery["sort"]>)}
        aria-label="ترتيب النتائج"
        className="h-9 rounded-md border border-ink-200 bg-surface px-2.5 text-[12.5px] font-semibold text-ink-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        {sortOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
