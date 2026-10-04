import type {
  CatalogQuery,
  CatalogResult,
  CategoryListing,
  CategoryNode,
  FilterGroup,
  FilterOption,
  Paginated,
  ProductSummary,
  SortKey,
} from "@/types/catalog";
import type { Brand } from "@/types/catalog";
import {
  brandProductCounts,
  bestSellers,
  catalogEntries,
  categoryProductCounts,
  discountedProducts,
  newArrivals,
  productSummaries,
  relatedProducts,
  summaryBySlug,
} from "@/data/catalog";
import { allCategories, categories, categoryTrail, findCategoryBySlug, topLevelCategories } from "@/data/catalog/categories";
import { brands, findBrandBySlug } from "@/data/catalog/brands";
import {
  hasRo,
  hasUv,
  isDiscounted,
  matchInstallationType,
  matchUseCase,
  matchUsers,
  savingsAmount,
  INSTALLATION_TYPE_OPTIONS,
  USE_CASE_OPTIONS,
  USERS_OPTIONS,
} from "@/lib/filter-model";
import { ApiError } from "@/types/product";

/**
 * Catalog API — categories, products, facets and brand pages.
 * Every method resolves from the mock catalog today and is shaped so a real
 * REST endpoint can replace it without touching any page component.
 */

const DEFAULT_PAGE_SIZE = 12;

function delay(ms = 320): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms * (0.7 + Math.random() * 0.6)));
}

const SORT_LABELS: Record<SortKey, string> = {
  featured: "الأكثر ملاءمة",
  newest: "الأحدث",
  price_asc: "السعر: من الأقل للأعلى",
  price_desc: "السعر: من الأعلى للأقل",
  rating: "الأعلى تقييمًا",
  best_selling: "الأكثر مبيعًا",
  savings_desc: "الأكثر توفيرًا",
};

export const sortOptions = (Object.keys(SORT_LABELS) as SortKey[]).map((id) => ({ id, label: SORT_LABELS[id] }));

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */
function inCategory(summary: ProductSummary, query: CatalogQuery): boolean {
  if (!query.categorySlug) return true;
  if (query.subcategorySlug) return summary.subcategorySlug === query.subcategorySlug;
  // Parent category: include every product whose category matches.
  const category = findCategoryBySlug(query.categorySlug);
  const slug = category?.slug ?? query.categorySlug;
  return summary.categorySlug === slug;
}

function matchesQuery(summary: ProductSummary, query: CatalogQuery, ignore?: string): boolean {
  const attrs = summary.attributes;
  if (!inCategory(summary, query)) return false;

  if (ignore !== "brandSlugs" && query.brandSlugs?.length && !query.brandSlugs.includes(summary.brandSlug)) return false;
  if (ignore !== "minPrice" && query.minPrice !== undefined && summary.price < query.minPrice) return false;
  if (ignore !== "maxPrice" && query.maxPrice !== undefined && summary.price > query.maxPrice) return false;
  if (ignore !== "stages" && query.stages?.length && !(attrs.stages !== undefined && query.stages.includes(attrs.stages)))
    return false;
  if (ignore !== "systemType" && query.systemType?.length && !query.systemType.includes(attrs.systemType ?? "")) return false;
  if (ignore !== "usage" && query.usage?.length && !query.usage.includes(attrs.usage ?? "home")) return false;
  if (ignore !== "hasPump" && query.hasPump !== undefined && Boolean(attrs.hasPump) !== query.hasPump) return false;
  if (ignore !== "hasTank" && query.hasTank !== undefined && Boolean(attrs.hasTank) !== query.hasTank) return false;
  if (
    ignore !== "installationIncluded" &&
    query.installationIncluded !== undefined &&
    Boolean(attrs.installationIncluded) !== query.installationIncluded
  )
    return false;
  if (
    ignore !== "minWarrantyMonths" &&
    query.minWarrantyMonths !== undefined &&
    (attrs.warrantyMonths ?? 0) < query.minWarrantyMonths
  )
    return false;
  if (ignore !== "availability") {
    if (query.availability === "in_stock" && !summary.inStock) return false;
    if (query.availability === "coming_soon" && summary.stockStatus !== "coming_soon") return false;
  }
  if (ignore !== "useCase" && query.useCase?.length && !query.useCase.some((value) => matchUseCase(summary, value)))
    return false;
  if (ignore !== "users" && query.users?.length && !query.users.some((value) => matchUsers(summary, value))) return false;
  if (
    ignore !== "installType" &&
    query.installationType?.length &&
    !query.installationType.some((value) => matchInstallationType(summary, value))
  )
    return false;
  if (ignore !== "features") {
    if (query.hasUv && !hasUv(summary)) return false;
    if (query.hasRo && !hasRo(summary)) return false;
  }
  if (ignore !== "offers" && query.discounted && !isDiscounted(summary)) return false;
  if (ignore !== "minRating" && query.minRating !== undefined && summary.rating < query.minRating) return false;
  if (ignore !== "capacity" && query.capacityBuckets?.length) {
    const capacity = attrs.capacityLiters;
    if (!capacity) return false;
    const matches = query.capacityBuckets.some((bucket) =>
      bucket === "small" ? capacity < 10 : bucket === "medium" ? capacity >= 10 && capacity <= 20 : capacity > 20
    );
    if (!matches) return false;
  }
  if (ignore !== "flowRate" && query.flowRateBuckets?.length) {
    const flow = attrs.flowRateGpd;
    if (!flow) return false;
    const matches = query.flowRateBuckets.some((bucket) =>
      bucket === "low" ? flow <= 100 : bucket === "mid" ? flow > 100 && flow <= 400 : flow > 400
    );
    if (!matches) return false;
  }
  if (
    ignore !== "replacementMonths" &&
    query.replacementMonths?.length &&
    !(attrs.replacementMonths !== undefined && query.replacementMonths.includes(attrs.replacementMonths))
  )
    return false;
  if (ignore !== "compatibleModel" && query.compatibleModel?.trim()) {
    const needle = query.compatibleModel.trim().toLowerCase();
    const models = (attrs.compatibleModels ?? []) as string[];
    const haystack = [...models, summary.sku, summary.name].join(" ").toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (query.search?.trim()) {
    const needle = query.search.trim().toLowerCase();
    const haystack = [summary.name, summary.brand, summary.sku, summary.categoryName, summary.subcategoryName, ...summary.tags]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function sortSummaries(items: ProductSummary[], sort: SortKey = "featured"): ProductSummary[] {
  const list = [...items];
  switch (sort) {
    case "newest":
      return list.sort((a, b) => new Date(b.releasedAt ?? 0).getTime() - new Date(a.releasedAt ?? 0).getTime());
    case "price_asc":
      return list.sort((a, b) => a.price - b.price);
    case "price_desc":
      return list.sort((a, b) => b.price - a.price);
    case "rating":
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "best_selling":
      return list.sort((a, b) => b.reviewCount - a.reviewCount);
    case "savings_desc":
      // Only meaningful with discount data; products without a discount sink.
      return list.sort((a, b) => savingsAmount(b) - savingsAmount(a) || a.price - b.price);
    default:
      return list.sort(
        (a, b) =>
          Number(b.inStock) - Number(a.inStock) ||
          Number(Boolean(b.badge)) - Number(Boolean(a.badge)) ||
          b.rating * Math.log10(b.reviewCount + 10) - a.rating * Math.log10(a.reviewCount + 10)
      );
  }
}

/* ------------------------------------------------------------------ */
/* Facets                                                              */
/* ------------------------------------------------------------------ */
function buildFacets(base: ProductSummary[], groupIds: FilterGroup["id"][]): FilterGroup[] {
  const groups: FilterGroup[] = [];

  for (const id of groupIds) {
    switch (id) {
      case "price": {
        const prices = base.map((summary) => summary.price);
        if (prices.length === 0) break;
        groups.push({
          id,
          label: "السعر",
          kind: "range",
          options: [],
          min: Math.floor(Math.min(...prices) / 10) * 10,
          max: Math.ceil(Math.max(...prices) / 10) * 10,
          step: 10,
          unit: "ر.س",
        });
        break;
      }
      case "brand": {
        const counts = new Map<string, { label: string; count: number }>();
        base.forEach((summary) => {
          const current = counts.get(summary.brandSlug);
          counts.set(summary.brandSlug, { label: summary.brand, count: (current?.count ?? 0) + 1 });
        });
        if (counts.size < 2) break;
        groups.push({
          id,
          label: "العلامة التجارية",
          kind: "list",
          options: Array.from(counts.entries())
            .map(([value, meta]) => ({ id: value, label: meta.label, count: meta.count }))
            .sort((a, b) => b.count - a.count),
        });
        break;
      }
      case "stages": {
        const counts = new Map<number, number>();
        base.forEach((summary) => {
          if (summary.attributes.stages) counts.set(summary.attributes.stages, (counts.get(summary.attributes.stages) ?? 0) + 1);
        });
        if (counts.size === 0) break;
        groups.push({
          id,
          label: "عدد مراحل التنقية",
          kind: "list",
          options: Array.from(counts.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([value, count]) => ({ id: String(value), label: `${value} مراحل`, count })),
        });
        break;
      }
      case "systemType": {
        const labels: Record<string, string> = {
          ro: "تناضح عكسي",
          "direct-flow": "نظام مباشر",
          "whole-house": "فلتر مركزي",
          cartridge: "شمعات وقطع",
          pump: "مضخات",
          tank: "خزانات",
          testing: "أجهزة قياس",
          accessory: "ملحقات",
          softener: "أجهزة تليين",
          dispenser: "برادات",
        };
        const counts = new Map<string, number>();
        base.forEach((summary) => {
          const type = summary.attributes.systemType;
          if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
        });
        if (counts.size < 2) break;
        groups.push({
          id,
          label: "نوع النظام",
          kind: "list",
          options: Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({ id: value, label: labels[value] ?? value, count })),
        });
        break;
      }
      case "capacity": {
        const buckets: { id: string; label: string; test: (v: number) => boolean }[] = [
          { id: "small", label: "أقل من 10 لتر", test: (v) => v < 10 },
          { id: "medium", label: "10 – 20 لتر", test: (v) => v >= 10 && v <= 20 },
          { id: "large", label: "أكثر من 20 لتر", test: (v) => v > 20 },
        ];
        const options = buckets
          .map((bucket) => ({
            id: bucket.id,
            label: bucket.label,
            count: base.filter((s) => s.attributes.capacityLiters && bucket.test(s.attributes.capacityLiters)).length,
          }))
          .filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({ id, label: "السعة", kind: "list", options });
        break;
      }
      case "flowRate": {
        const buckets: { id: string; label: string; test: (v: number) => boolean }[] = [
          { id: "low", label: "حتى 100 جالون/يوم", test: (v) => v <= 100 },
          { id: "mid", label: "100 – 400 جالون/يوم", test: (v) => v > 100 && v <= 400 },
          { id: "high", label: "أكثر من 400 جالون/يوم", test: (v) => v > 400 },
        ];
        const options = buckets
          .map((bucket) => ({
            id: bucket.id,
            label: bucket.label,
            count: base.filter((s) => s.attributes.flowRateGpd && bucket.test(s.attributes.flowRateGpd)).length,
          }))
          .filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({ id, label: "معدل الإنتاج", kind: "list", options });
        break;
      }
      case "pump": {
        const withPump = base.filter((s) => s.attributes.hasPump).length;
        if (withPump === 0 || withPump === base.length) break;
        groups.push({ id, label: "مضخة تعزيز", kind: "toggle", options: [{ id: "with", label: "يشمل مضخة", count: withPump }] });
        break;
      }
      case "tank": {
        const withTank = base.filter((s) => s.attributes.hasTank).length;
        if (withTank === 0 || withTank === base.length) break;
        groups.push({ id, label: "خزان تخزين", kind: "toggle", options: [{ id: "with", label: "يشمل خزان", count: withTank }] });
        break;
      }
      case "usage": {
        const labels: Record<string, string> = { home: "منزلي", commercial: "تجاري", both: "منزلي وتجاري" };
        const counts = new Map<string, number>();
        base.forEach((summary) => {
          const usage = summary.attributes.usage;
          if (usage) counts.set(usage, (counts.get(usage) ?? 0) + 1);
        });
        if (counts.size < 2) break;
        groups.push({
          id,
          label: "الاستخدام",
          kind: "list",
          options: Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({ id: value, label: labels[value] ?? value, count })),
        });
        break;
      }
      case "installation": {
        const withInstall = base.filter((s) => s.attributes.installationIncluded).length;
        if (withInstall === 0 || withInstall === base.length) break;
        groups.push({
          id,
          label: "التركيب",
          kind: "toggle",
          options: [{ id: "available", label: "تركيب متوفر", count: withInstall }],
        });
        break;
      }
      case "warranty": {
        const buckets: { id: string; label: string; min: number }[] = [
          { id: "12", label: "سنة على الأقل", min: 12 },
          { id: "24", label: "سنتان على الأقل", min: 24 },
          { id: "36", label: "3 سنوات وأكثر", min: 36 },
        ];
        const options = buckets
          .map((bucket) => ({
            id: bucket.id,
            label: bucket.label,
            count: base.filter((s) => (s.attributes.warrantyMonths ?? 0) >= bucket.min).length,
          }))
          .filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({ id, label: "الضمان", kind: "list", options });
        break;
      }
      case "availability": {
        const inStock = base.filter((s) => s.inStock).length;
        groups.push({
          id,
          label: "التوفر",
          kind: "toggle",
          options: [{ id: "in_stock", label: "المتوفر فقط", count: inStock }],
        });
        break;
      }
      case "rating": {
        const options: FilterOption[] = [4, 3].map((value) => ({
          id: String(value),
          label: `${value} نجوم وأعلى`,
          count: base.filter((s) => s.rating >= value).length,
        }));
        groups.push({ id, label: "التقييم", kind: "list", options });
        break;
      }
      case "replacementInterval": {
        const buckets = [3, 6, 12];
        const options = buckets
          .map((months) => ({
            id: String(months),
            label: `كل ${months} أشهر`,
            count: base.filter((s) => s.attributes.replacementMonths === months).length,
          }))
          .filter((option) => option.count > 0);
        if (options.length === 0) break;
        groups.push({ id, label: "دورة الاستبدال", kind: "list", options });
        break;
      }
      case "compatibleModels":
        groups.push({ id, label: "رقم الموديل المتوافق", kind: "search", options: [] });
        break;
      /* ----------------------- Derived groups ----------------------- */
      case "useCase": {
        const options = USE_CASE_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          hint: option.hint,
          count: base.filter((summary) => matchUseCase(summary, option.id)).length,
        })).filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({ id, label: "الاستخدام", kind: "list", options });
        break;
      }
      case "users": {
        const options = USERS_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          count: base.filter((summary) => matchUsers(summary, option.id)).length,
        })).filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({
          id,
          label: "عدد المستخدمين",
          kind: "list",
          hint: "تقدير مبني على معدل التدفق أو السعة المعلنة للمنتج.",
          options,
        });
        break;
      }
      case "installType": {
        const options = INSTALLATION_TYPE_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          count: base.filter((summary) => matchInstallationType(summary, option.id)).length,
        })).filter((option) => option.count > 0);
        if (options.length < 2) break;
        groups.push({ id, label: "طريقة التركيب", kind: "list", options });
        break;
      }
      case "features": {
        const options: FilterOption[] = [];
        const ro = base.filter(hasRo).length;
        const uv = base.filter(hasUv).length;
        if (ro > 0 && ro < base.length) options.push({ id: "ro", label: "تناضح عكسي (RO)", count: ro });
        if (uv > 0 && uv < base.length) options.push({ id: "uv", label: "أشعة فوق بنفسجية (UV)", count: uv });
        if (options.length === 0) break;
        groups.push({ id, label: "الميزات", kind: "list", options });
        break;
      }
      case "offers": {
        const discounted = base.filter(isDiscounted).length;
        if (discounted === 0 || discounted === base.length) break;
        groups.push({
          id,
          label: "العروض والخصومات",
          kind: "toggle",
          options: [{ id: "yes", label: "عليه خصم حاليًا", count: discounted }],
        });
        break;
      }
      default:
        break;
    }
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/* Category listing                                                    */
/* ------------------------------------------------------------------ */
function withCounts(category: CategoryNode): CategoryNode {
  return {
    ...category,
    productCount: categoryProductCounts[category.slug] ?? 0,
    children: category.children.map((child) => ({
      ...child,
      productCount: categoryProductCounts[child.slug] ?? 0,
    })),
  };
}

export const catalogApi = {
  /** GET /v1/categories */
  async listCategories(): Promise<CategoryNode[]> {
    await delay(220);
    return topLevelCategories.map(withCounts);
  },

  /** GET /v1/categories/:slug */
  async getCategoryListing(categorySlug: string, subcategorySlug?: string): Promise<CategoryListing> {
    await delay(260);
    const trail = categoryTrail(subcategorySlug ?? categorySlug);
    const category = trail[0] ?? findCategoryBySlug(categorySlug);
    if (!category) throw new ApiError("لم نعثر على هذا التصنيف", "NOT_FOUND", 404);
    const subcategory = subcategorySlug ? category.children.find((c) => c.slug === subcategorySlug || c.aliases?.includes(subcategorySlug)) : undefined;
    if (subcategorySlug && !subcategory) throw new ApiError("لم نعثر على هذا التصنيف الفرعي", "NOT_FOUND", 404);

    return {
      category: withCounts(category),
      subcategory: subcategory ? withCounts(subcategory) : undefined,
      breadcrumbs: [
        { label: "الرئيسية", href: "/" },
        { label: category.name, href: `/c/${category.slug}` },
        ...(subcategory ? [{ label: subcategory.name, href: `/c/${category.slug}/${subcategory.slug}` }] : []),
      ],
      siblings: category.children.map(withCounts),
    };
  },

  /** GET /v1/products?... */
  async listProducts(query: CatalogQuery, categorySlug?: string, subcategorySlug?: string): Promise<CatalogResult> {
    await delay(360);
    const resolved = { ...query, categorySlug, subcategorySlug };
    const filtered = productSummaries.filter((summary) => matchesQuery(summary, resolved));
    const sorted = sortSummaries(filtered, resolved.sort);
    const page = Math.max(1, resolved.page ?? 1);
    const pageSize = resolved.pageSize ?? DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    const category = categorySlug ? findCategoryBySlug(categorySlug) : undefined;
    const subcategory = subcategorySlug ? category?.children.find((c) => c.slug === subcategorySlug) : undefined;
    const groupIds = Array.from(
      (subcategory ?? category)?.filterGroups ?? (["price", "brand", "availability", "rating", "systemType"] as FilterGroup["id"][])
    );

    // Facets are counted against the result set (so counts always match the list).
    const facets = buildFacets(sorted, groupIds);

    return {
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: sorted.length,
      page,
      pageSize,
      totalPages,
      facets,
      appliedCount: countAppliedFilters(resolved),
    };
  },

  /** GET /v1/products/:slug/summary */
  async getSummary(slug: string): Promise<ProductSummary> {
    await delay(200);
    const summary = summaryBySlug(slug);
    if (!summary) throw new ApiError("لم نعثر على المنتج", "NOT_FOUND", 404);
    return summary;
  },

  /** GET /v1/products?ids=… (wishlist / compare / recently viewed hydration) */
  async listBySlugs(slugs: string[]): Promise<ProductSummary[]> {
    await delay(240);
    return slugs.map((slug) => summaryBySlug(slug)).filter((summary): summary is ProductSummary => Boolean(summary));
  },

  /** GET /v1/products?ids= (wishlist / compare hydration by product id) */
  async listByIds(ids: string[]): Promise<ProductSummary[]> {
    await delay(240);
    if (ids.length === 0) return [];
    const byId = new Map(productSummaries.map((summary) => [summary.id, summary]));
    return ids.map((id) => byId.get(id)).filter((summary): summary is ProductSummary => Boolean(summary));
  },

  /** GET /v1/brands */
  async listBrands(): Promise<Brand[]> {
    await delay(220);
    return brands;
  },

  /** GET /v1/brands/:slug */
  async getBrand(slug: string): Promise<Brand> {
    await delay(240);
    const brand = findBrandBySlug(slug);
    if (!brand) throw new ApiError("لم نعثر على هذه العلامة التجارية", "NOT_FOUND", 404);
    return brand;
  },

  /** GET /v1/brands/:slug/products */
  async listBrandProducts(slug: string, pageSize = 24): Promise<Paginated<ProductSummary>> {
    await delay(300);
    const items = productSummaries.filter((summary) => summary.brandSlug === slug);
    return {
      items: sortSummaries(items, "featured").slice(0, pageSize),
      total: items.length,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  },

  /** Curated collections used by the homepage, offers page and empty states. */
  async collections(): Promise<{
    bestSellers: ProductSummary[];
    newArrivals: ProductSummary[];
    discounted: ProductSummary[];
  }> {
    await delay(180);
    return { bestSellers: bestSellers(8), newArrivals: newArrivals(8), discounted: discountedProducts(8) };
  },

  /** GET /v1/products/:slug/related?group= */
  async relatedSummaries(slug: string, group: "similar" | "bought_together"): Promise<ProductSummary[]> {
    await delay(200);
    return relatedProducts(slug, group, { limit: group === "similar" ? 8 : 4 })
      .map((item) => summaryBySlug(item.slug))
      .filter((summary): summary is ProductSummary => Boolean(summary));
  },
};

export function countAppliedFilters(query: CatalogQuery): number {
  let count = 0;
  if (query.brandSlugs?.length) count += query.brandSlugs.length;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) count += 1;
  if (query.stages?.length) count += query.stages.length;
  if (query.systemType?.length) count += query.systemType.length;
  if (query.usage?.length) count += query.usage.length;
  if (query.hasPump !== undefined) count += 1;
  if (query.hasTank !== undefined) count += 1;
  if (query.installationIncluded !== undefined) count += 1;
  if (query.minWarrantyMonths !== undefined) count += 1;
  if (query.availability === "in_stock") count += 1;
  if (query.minRating !== undefined) count += 1;
  if (query.replacementMonths?.length) count += query.replacementMonths.length;
  if (query.capacityBuckets?.length) count += query.capacityBuckets.length;
  if (query.flowRateBuckets?.length) count += query.flowRateBuckets.length;
  if (query.compatibleModel) count += 1;
  return count;
}

/* Re-exported helpers so pages do not import data files directly. */
export const categoryHelpers = {
  all: allCategories,
  roots: categories,
  bySlug: findCategoryBySlug,
  counts: categoryProductCounts,
  brandCounts: brandProductCounts,
  entries: catalogEntries,
};
