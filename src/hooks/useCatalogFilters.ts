import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ActiveFilter, CatalogQuery, FilterGroupId, SortKey } from "@/types/catalog";
import { labelForOption } from "@/lib/filter-model";

/**
 * Catalogue filters are stored in the URL, so a filtered result set can be
 * shared, refreshed and restored with the browser back button.
 */

const BOOLEAN_GROUPS: FilterGroupId[] = ["pump", "tank", "installation", "availability"];

/** Human labels for chip text on the derived groups. */
const GROUP_LABELS: Partial<Record<FilterGroupId, (value: string) => string>> = {
  useCase: (value) => labelForOption("useCase", value),
  users: (value) => `${labelForOption("users", value)}`,
  installType: (value) => labelForOption("installationType", value),
  features: (value) => labelForOption("features", value),
};

export interface CatalogFilterState extends CatalogQuery {
  page: number;
  pageSize: number;
  sort: SortKey;
  /** `?need=` — the shopping-intent slug the listing was opened with. */
  needSlug?: string;
}

const DEFAULT_PAGE_SIZE = 12;

export function useCatalogFilters(options: { pageSize?: number; sort?: SortKey } = {}) {
  const [params, setParams] = useSearchParams();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  const query = useMemo<CatalogFilterState>(() => {
    const list = (key: FilterGroupId, mapper: (value: string) => string | number = (value) => value) =>
      params.getAll(key).map(mapper);
    const numberList = (key: FilterGroupId) => params.getAll(key).map(Number).filter((value) => !Number.isNaN(value));
    const bool = (key: FilterGroupId) => (params.get(key) === "1" ? true : undefined);

    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const minRating = params.get("rating_above");
    const minWarranty = params.get("warranty_above");
    const availability = params.get("availability");
    const features = params.getAll("features");

    return {
      brandSlugs: list("brand"),
      stages: numberList("stages"),
      systemType: list("systemType"),
      usage: list("usage") as CatalogQuery["usage"],
      replacementMonths: numberList("replacementInterval"),
      capacityBuckets: params.getAll("capacity"),
      flowRateBuckets: params.getAll("flowRate"),
      hasPump: bool("pump"),
      hasTank: bool("tank"),
      installationIncluded: bool("installation"),
      availability:
        availability === "1" || availability === "in_stock"
          ? "in_stock"
          : availability === "coming_soon"
            ? "coming_soon"
            : undefined,
      useCase: list("useCase"),
      users: list("users"),
      installationType: list("installType"),
      hasRo: features.includes("ro") ? true : undefined,
      hasUv: features.includes("uv") ? true : undefined,
      discounted: params.get("offers") === "1" ? true : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      minWarrantyMonths: minWarranty ? Number(minWarranty) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      compatibleModel: params.get("model") ?? undefined,
      needSlug: params.get("need") ?? undefined,
      sort: (params.get("sort") as SortKey | null) ?? options.sort ?? "featured",
      page: Number(params.get("page") ?? 1) || 1,
      pageSize,
    } as CatalogFilterState;
  }, [params, pageSize, options.sort]);

  const commit = useCallback(
    (mutate: (next: URLSearchParams) => void, opts: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(params);
      mutate(next);
      if (opts.resetPage !== false) next.delete("page");
      setParams(next, { replace: false });
    },
    [params, setParams]
  );

  const toggleListValue = useCallback(
    (groupId: FilterGroupId, value: string) => {
      commit((next) => {
        const current = next.getAll(groupId);
        next.delete(groupId);
        const remaining = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        remaining.forEach((item) => next.append(groupId, item));
      });
    },
    [commit]
  );

  const toggleBoolean = useCallback(
    (groupId: FilterGroupId) => {
      commit((next) => {
        if (next.get(groupId) === "1") next.delete(groupId);
        else next.set(groupId, "1");
      });
    },
    [commit]
  );

  const setRange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      commit((next) => {
        if (min === undefined) next.delete("minPrice");
        else next.set("minPrice", String(min));
        if (max === undefined) next.delete("maxPrice");
        else next.set("maxPrice", String(max));
      });
    },
    [commit]
  );

  const setMinRating = useCallback(
    (rating: number | undefined) => {
      commit((next) => {
        if (rating === undefined) next.delete("rating_above");
        else next.set("rating_above", String(rating));
      });
    },
    [commit]
  );

  const setMinWarranty = useCallback(
    (months: number | undefined) => {
      commit((next) => {
        if (months === undefined) next.delete("warranty_above");
        else next.set("warranty_above", String(months));
      });
    },
    [commit]
  );

  const setModel = useCallback(
    (value: string) => {
      commit((next) => {
        if (!value.trim()) next.delete("model");
        else next.set("model", value.trim());
      });
    },
    [commit]
  );

  /** Toggles one value inside a multi-value derived group. */
  const toggleDerived = useCallback(
    (param: string, value: string) => {
      commit((next) => {
        const current = next.getAll(param);
        next.delete(param);
        const remaining = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        remaining.forEach((item) => next.append(param, item));
      });
    },
    [commit]
  );

  const setAvailability = useCallback(
    (value: "in_stock" | "coming_soon" | undefined) => {
      commit((next) => {
        if (!value) next.delete("availability");
        else if (value === "in_stock") next.set("availability", "1");
        else next.set("availability", value);
      });
    },
    [commit]
  );

  const setDiscounted = useCallback(
    (value: boolean) => {
      commit((next) => {
        if (value) next.set("offers", "1");
        else next.delete("offers");
      });
    },
    [commit]
  );

  const setSort = useCallback(
    (sort: SortKey) => {
      commit((next) => next.set("sort", sort), { resetPage: false });
    },
    [commit]
  );

  const setPage = useCallback(
    (page: number) => {
      commit((next) => next.set("page", String(page)), { resetPage: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [commit]
  );

  const reset = useCallback(() => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    setParams(next);
  }, [params, setParams]);

  const removeFilter = useCallback(
    (groupId: FilterGroupId, optionId: string) => {
      if (groupId === "price") setRange(undefined, undefined);
      else if (groupId === "rating") setMinRating(undefined);
      else if (groupId === "warranty") setMinWarranty(undefined);
      else if (groupId === "compatibleModels") setModel("");
      else if (groupId === "availability") setAvailability(undefined);
      else if (groupId === "offers") setDiscounted(false);
      else if (groupId === "useCase") toggleDerived("useCase", optionId);
      else if (groupId === "users") toggleDerived("users", optionId);
      else if (groupId === "installType") toggleDerived("installType", optionId);
      else if (groupId === "features") toggleDerived("features", optionId);
      else if (BOOLEAN_GROUPS.includes(groupId)) toggleBoolean(groupId);
      else toggleListValue(groupId, optionId);
    },
    [
      setMinRating,
      setMinWarranty,
      setModel,
      setRange,
      setAvailability,
      setDiscounted,
      toggleBoolean,
      toggleListValue,
      toggleDerived,
    ]
  );

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    const label = (groupId: FilterGroupId, optionId: string) => {
      const custom = GROUP_LABELS[groupId];
      return custom ? custom(optionId) : optionId;
    };
    const push = (groupId: FilterGroupId, optionId: string, text: string) =>
      chips.push({ groupId, optionId, label: text });

    query.brandSlugs?.forEach((slug) => push("brand", slug, label("brand", slug)));
    query.stages?.forEach((stage) => push("stages", String(stage), `${stage} مراحل`));
    query.systemType?.forEach((type) => push("systemType", type, label("systemType", type)));
    query.usage?.forEach((usage) => push("usage", usage, label("usage", usage)));
    query.replacementMonths?.forEach((months) => push("replacementInterval", String(months), `استبدال كل ${months} أشهر`));
    query.capacityBuckets?.forEach((bucket) => push("capacity", bucket, label("capacity", bucket)));
    query.flowRateBuckets?.forEach((bucket) => push("flowRate", bucket, label("flowRate", bucket)));
    if (query.hasPump) push("pump", "with", "يشمل مضخة");
    if (query.hasTank) push("tank", "with", "يشمل خزان");
    if (query.installationIncluded) push("installation", "available", "التركيب متوفر");
    if (query.availability === "in_stock") push("availability", "in_stock", "المتوفر فقط");
    if (query.availability === "coming_soon") push("availability", "coming_soon", "متوفر قريبًا");
    query.useCase?.forEach((value) => push("useCase", value, label("useCase", value)));
    query.users?.forEach((value) => push("users", value, label("users", value)));
    query.installationType?.forEach((value) => push("installType", value, label("installType", value)));
    if (query.hasRo) push("features", "ro", label("features", "ro"));
    if (query.hasUv) push("features", "uv", label("features", "uv"));
    if (query.discounted) push("offers", "yes", "عليه خصم");
    if (query.minRating !== undefined) push("rating", String(query.minRating), `${query.minRating} نجوم وأعلى`);
    if (query.minWarrantyMonths !== undefined) push("warranty", String(query.minWarrantyMonths), `ضمان ${query.minWarrantyMonths} شهرًا`);
    if (query.minPrice !== undefined || query.maxPrice !== undefined)
      push("price", "price", `${query.minPrice ?? 0} – ${query.maxPrice ?? "∞"} ر.س`);
    if (query.compatibleModel) push("compatibleModels", query.compatibleModel, `موديل: ${query.compatibleModel}`);

    return chips;
  }, [query]);

  /** Facet payloads carry the human labels (brand names, bucket titles). */
  const resolveLabels = useCallback((labels: Partial<Record<FilterGroupId, Record<string, string>>>) => {
    return (groupId: FilterGroupId, optionId: string) => labels[groupId]?.[optionId];
  }, []);

  return {
    query,
    activeFilters,
    toggleListValue,
    toggleBoolean,
    toggleDerived,
    setRange,
    setMinRating,
    setMinWarranty,
    setModel,
    setAvailability,
    setDiscounted,
    setSort,
    setPage,
    reset,
    removeFilter,
    resolveLabels,
  };
}

export type CatalogFiltersController = ReturnType<typeof useCatalogFilters>;
