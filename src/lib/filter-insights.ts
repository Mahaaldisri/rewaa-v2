/**
 * Smart filter suggestions.
 *
 * Produces a short, factual sentence about the current filter combination. It
 * never claims a water-quality or health outcome; it only restates the filters
 * the shopper applied and the number of catalogue products that match.
 */
import type { CatalogFilterState } from "@/hooks/useCatalogFilters";
import { labelForOption } from "@/lib/filter-model";

export interface FilterInsight {
  /** The sentence shown next to the result count. */
  message: string;
  /** Short label used by analytics and tests. */
  kind: "empty" | "single" | "personalised" | "generic";
}

function humanList(values: string[], mapper: (value: string) => string, max = 2): string {
  const labels = values.slice(0, max).map(mapper);
  return labels.join(" و");
}

export function buildFilterInsight(query: Partial<CatalogFilterState>, total: number): FilterInsight | null {
  const useCase = query.useCase ?? [];
  const users = query.users ?? [];
  const installType = query.installationType ?? [];
  const systemType = query.systemType ?? [];
  const features = [query.hasRo ? "ro" : null, query.hasUv ? "uv" : null].filter((value): value is string => Boolean(value));
  const nothingApplied =
    useCase.length + users.length + installType.length + systemType.length + features.length === 0 &&
    query.minPrice === undefined &&
    query.maxPrice === undefined &&
    !query.discounted &&
    !query.availability;

  if (nothingApplied) return null;

  if (total === 0) {
    return {
      kind: "empty",
      message: "لا يوجد منتج يجمع كل هذه الشروط معًا. جرّب إزالة شرط أو اثنين، أو ابدأ من أقرب المنتجات المتاحة.",
    };
  }

  if (users.length > 0 && useCase.length > 0) {
    const people = humanList(users, (value) => labelForOption("users", value));
    const place = humanList(useCase, (value) => labelForOption("useCase", value));
    return {
      kind: "personalised",
      message: `بناءً على اختيارك (${place} — ${people})، وجدنا ${total} ${
        total === 1 ? "خيارًا" : "خيارات"
      } من الكتالوج. الترشيح مبني على بيانات المنتج وليس على تحليل لمياهك.`,
    };
  }

  if (total === 1) {
    return { kind: "single", message: "يوجد منتج واحد يطابق شروطك الحالية." };
  }

  const parts = [
    ...useCase.map((value) => labelForOption("useCase", value)),
    ...users.map((value) => labelForOption("users", value)),
    ...installType.map((value) => labelForOption("installationType", value)),
    ...features.map((value) => labelForOption("features", value)),
  ];

  return {
    kind: "generic",
    message:
      parts.length > 0
        ? `وجدنا ${total} منتجًا يناسب اختيارك (${parts.slice(0, 3).join(" · ")}).`
        : `وجدنا ${total} منتجًا يطابق الفلاتر المطبّقة.`,
  };
}
