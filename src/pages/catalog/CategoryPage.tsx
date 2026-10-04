import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import {
  ActiveFilterChips,
  CatalogSidebar,
  FilterDrawer,
  FilterTrigger,
  SortSelect,
} from "@/components/catalog/CatalogFilters";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { Pagination } from "@/components/common/Pagination";
import { Accordion } from "@/components/common/Accordion";
import { RecentlyViewedRail } from "@/components/common/RecentlyViewedRail";
import { catalogApi } from "@/services/catalogApi";
import { contentApi } from "@/services/contentApi";
import { findCategoryBySlug, topLevelCategories } from "@/data/catalog/categories";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { track } from "@/services/analytics";
import { buildFilterInsight } from "@/lib/filter-insights";
import { itemsFromSummaries } from "@/services/analytics/map";
import { needs } from "@/data/content/needs";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, faqSchema, itemListSchema, usePageSeo } from "@/lib/seo";
import type { CategoryNode, FilterGroup } from "@/types/catalog";
import type { FaqItem } from "@/types/content";

export function CategoryPage() {
  const { slug = "", subSlug } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const controller = useCatalogFilters();

  const category = findCategoryBySlug(slug);
  const subcategory = subSlug ? findCategoryBySlug(subSlug) : undefined;
  const invalid = !category || (subSlug !== undefined && !subcategory);

  const listing = useAsync(
    () => catalogApi.getCategoryListing(slug, subSlug),
    [slug, subSlug]
  );

  /**
   * `?need=` comes from the "shop by need" grid and the homepage. When present
   * (and the shopper has not filtered by system type themselves) it narrows the
   * listing to the system types that actually solve that problem.
   */
  const need = useMemo(() => needs.find((item) => item.slug === controller.query.needSlug), [controller.query.needSlug]);

  const effectiveQuery = useMemo(() => {
    if (!need || (controller.query.systemType ?? []).length > 0) return controller.query;
    return { ...controller.query, systemType: need.recommendedSystemTypes };
  }, [controller.query, need]);

  const results = useAsync(
    () => catalogApi.listProducts(effectiveQuery, slug, subSlug),
    [
      slug,
      subSlug,
      JSON.stringify({
        ...effectiveQuery,
        page: effectiveQuery.page,
      }),
    ]
  );

  const faqIds = subcategory?.seo.faqIds ?? category?.seo.faqIds ?? [];
  const faqs = useAsync(() => contentApi.faqsByIds(faqIds), [faqIds.join(",")]);

  const facets: FilterGroup[] = results.data?.facets ?? listing.data ? (results.data?.facets ?? []) : [];

  const crumbs = listing.data?.breadcrumbs ?? [
    { label: "الرئيسية", href: "/" },
    { label: category?.name ?? "تصنيف", href: `/c/${slug}` },
  ];

  const seoTitle = subcategory?.seo.title ?? category?.seo.title ?? "تصنيف المنتجات";
  const seoDescription = subcategory?.seo.description ?? category?.seo.description ?? "";

  const jsonLd = useMemo(() => {
    const documents: Record<string, unknown>[] = [breadcrumbSchema(crumbs)];
    if (results.data && results.data.items.length > 0) {
      documents.push(itemListSchema(results.data.items, subcategory?.name ?? category?.name ?? "منتجات"));
    }
    if (faqs.data && faqs.data.length > 0) {
      documents.push(faqSchema(faqs.data.map((faq: FaqItem) => ({ question: faq.question, answer: faq.answer }))));
    }
    return documents;
  }, [crumbs, results.data, faqs.data, subcategory?.name, category?.name]);

  usePageSeo({
    title: `${seoTitle} | رواء`,
    description: seoDescription,
    canonical: subSlug ? `/c/${slug}/${subSlug}` : `/c/${slug}`,
    type: "website",
    image: subcategory?.heroImage ?? category?.heroImage,
    keywords: [subcategory?.name ?? "", category?.name ?? "", "رواء", "تنقية مياه"].filter(Boolean),
    jsonLd,
  });

  /* Smart filter insight — a human sentence describing the current result set. */
  const insight = useMemo(() => buildFilterInsight(controller.query, results.data?.total ?? 0), [controller.query, results.data?.total]);

  /* Nearest alternatives when the filters exclude everything (never an empty page). */
  const relaxedQuery = useMemo(() => {
    const {
      minPrice: _minPrice,
      maxPrice: _maxPrice,
      minRating: _minRating,
      minWarrantyMonths: _minWarranty,
      ...rest
    } = controller.query;
    return { ...rest, page: 1 };
  }, [controller.query]);
  const needsAlternatives = Boolean(results.data && results.data.total === 0 && controller.activeFilters.length > 0);
  const alternatives = useAsync(
    () => (needsAlternatives ? catalogApi.listProducts(relaxedQuery, slug, subSlug) : Promise.resolve(null)),
    [needsAlternatives, slug, subSlug, JSON.stringify(relaxedQuery)]
  );

  /* Analytics: report the visible listing once per query change. */
  useEffect(() => {
    if (!results.data) return;
    const applied = controller.activeFilters.length;
    if (applied > 0) {
      track("filter_applied", {
        category: slug,
        filter_count: applied,
        filters: controller.activeFilters.map((chip) => `${chip.groupId}:${chip.optionId}`).slice(0, 12),
        results_count: results.data.total,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(controller.activeFilters), results.data?.total]);

  /* Analytics: report the visible listing once per query change. */
  useEffect(() => {
    if (!results.data || results.data.items.length === 0) return;
    track("view_item_list", {
      item_list_id: subSlug ? `${slug}/${subSlug}` : slug,
      item_list_name: subcategory?.name ?? category?.name ?? "قائمة منتجات",
      items: itemsFromSummaries(results.data.items),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.data]);

  // Client-side navigation between categories should reset the drawer.
  useEffect(() => setDrawerOpen(false), [slug, subSlug]);

  if (invalid) return <Navigate to="/404" replace />;

  const current = subcategory ?? category;
  const isNested = Boolean(subcategory);

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      {/* Spare parts: hand shoppers the compatibility checker before they buy. */}
      {slug === "cartridges" && (
        <div className="border-b border-ink-100 bg-flow-50">
          <div className="container-x flex flex-wrap items-center gap-3 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-flow-700">
              <Icon name="settings" size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-flow-900">لست متأكدًا أن الشمعة تناسب جهازك؟</p>
              <p className="text-[11.5px] leading-5 text-flow-800">
                اكتب رقم الموديل في فاحص التوافق، وستعرف القطع المتوافقة مع سبب كل تطابق قبل الشراء.
              </p>
            </div>
            <Link
              to="/compatibility"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-flow-600 px-3.5 text-[12px] font-bold text-white transition hover:bg-flow-700"
            >
              افتح فاحص التوافق
              <Icon name="chevronLeft" size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Category hero */}
      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x grid gap-6 py-7 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name={current.icon} size={19} />
              </span>
              <span className="text-[11.5px] font-bold tracking-[0.18em] text-ink-400">{current.nameEn}</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink-950 sm:text-[28px]">
              {current.name}
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-7 text-ink-600">{current.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="neutral" icon="package">
                {results.data ? `${results.data.total} منتج` : "…"}
              </Badge>
              <Badge tone="info" icon="truck">
                توصيل 1–6 أيام داخل المملكة
              </Badge>
              <Badge tone="success" icon="shield">
                ضمان المصنّع على الأجهزة
              </Badge>
            </div>
          </div>

          {listing.data && listing.data.siblings.length > 0 && (
            <nav aria-label={`تصنيفات فرعية في ${category?.name}`} className="lg:justify-self-end">
              <ul className="grid grid-cols-2 gap-2">
                {listing.data.siblings.slice(0, 6).map((sibling: CategoryNode) => (
                  <li key={sibling.id}>
                    <Link
                      to={`/c/${slug}/${sibling.slug}`}
                      className={
                        "flex h-full flex-col justify-between gap-2 rounded-lg border px-3 py-2.5 transition " +
                        (sibling.slug === subcategory?.slug
                          ? "border-brand-300 bg-brand-50 text-brand-900"
                          : "border-ink-150 bg-surface text-ink-700 hover:border-brand-200 hover:bg-ink-50")
                      }
                    >
                      <span className="flex items-center gap-2 text-[12.5px] font-bold">
                        <Icon name={sibling.icon} size={15} className="text-brand-600" />
                        {sibling.name}
                      </span>
                      <span className="text-[11px] text-ink-500">{sibling.productCount ?? 0} منتج</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>

      {/* Shop-by-need guidance (?need=) */}
      {need && (
        <section className="container-x pt-6" aria-label={`ترشيح حسب الحاجة: ${need.title}`}>
          <div className="rounded-xl border border-aqua-200 bg-aqua-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-aqua-700 shadow-hair">
                  <Icon name={need.icon as IconName} size={19} />
                </span>
                <div>
                  <Badge tone="aqua" icon="target">
                    ترشيح حسب الحاجة
                  </Badge>
                  <h2 className="mt-2 font-display text-[15px] font-extrabold text-ink-950">{need.title}</h2>
                  <p className="mt-1 text-[12.5px] leading-6 text-ink-700">{need.problem}</p>
                  <p className="mt-2 max-w-3xl text-[12.5px] leading-6 text-ink-600">{need.guidance}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {need.relatedGuideSlug && (
                  <Link
                    to={`/guides/${need.relatedGuideSlug}`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
                  >
                    <Icon name="file" size={15} />
                    اقرأ الدليل
                  </Link>
                )}
                <Link
                  to={subSlug ? `/c/${slug}/${subSlug}` : `/c/${slug}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[12.5px] font-bold text-aqua-200"
                >
                  <Icon name="close" size={14} />
                  اعرض كل المنتجات
                </Link>
              </div>
            </div>

            {(controller.query.systemType ?? []).length === 0 && need.recommendedSystemTypes.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-aqua-200/70 pt-3 text-[11.5px] text-aqua-900">
                <Icon name="filter" size={13} />
                النتائج أدناه مُرشّحة على أنواع الأنظمة المناسبة لهذه الحالة:
                <span className="font-bold">{need.recommendedSystemTypes.join(" · ")}</span>
                — ويمكنك تعديلها من التصفية في أي وقت.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Listing */}
      <div className="container-x flex flex-col gap-6 py-6 lg:flex-row lg:items-start">
        <CatalogSidebar facets={facets} controller={controller} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FilterTrigger onClick={() => setDrawerOpen(true)} count={controller.activeFilters.length} />
              <p className="text-[12.5px] text-ink-500">
                {results.loading ? (
                  <Skeleton className="inline-block h-4 w-24 align-middle" />
                ) : (
                  <>
                    <span className="font-bold text-ink-900 tabular-nums">{results.data?.total ?? 0}</span> منتج
                  </>
                )}
              </p>
            </div>
            <SortSelect value={controller.query.sort} onChange={controller.setSort} />
          </div>

          {controller.activeFilters.length > 0 && (
            <div className="mt-3 space-y-3">
              <ActiveFilterChips controller={controller} />
              {insight && (
                <p className="flex items-start gap-2 rounded-lg border border-flow-200 bg-flow-50 p-3 text-[12px] leading-6 text-flow-900">
                  <Icon name="sparkles" size={14} className="mt-1 shrink-0" />
                  <span>{insight.message}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-5">
            {results.error && !results.loading ? (
              <ErrorState onRetry={results.retry} retrying={results.loading} />
            ) : results.loading && !results.data ? (
              <ProductGridSkeleton count={8} />
            ) : results.data && results.data.items.length > 0 ? (
              <>
                <ProductGrid items={results.data.items} />
                <Pagination
                  className="mt-8"
                  page={results.data.page}
                  totalPages={results.data.totalPages}
                  onChange={controller.setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="search"
                title="لا توجد منتجات مطابقة للفلاتر الحالية"
                description={
                  controller.activeFilters.length > 0
                    ? `جرّب إزالة أحد الشروط (${controller.activeFilters
                        .slice(0, 2)
                        .map((chip) => chip.label)
                        .join("، ")}) — أو ابدأ من قائمة أقرب المنتجات أدناه.`
                    : "جرّب تصنيفًا فرعيًا آخر — يمكنك أيضًا سؤال فريقنا عن البديل الأنسب."
                }
                action={{
                  label: "إعادة ضبط الفلاتر",
                  onClick: () => {
                    track("filter_cleared", { category: slug, previous_count: controller.activeFilters.length });
                    controller.reset();
                  },
                }}
                secondaryAction={{ label: "تحدّث مع الفريق", href: "/contact/whatsapp" }}
              >
                {alternatives.data && alternatives.data.items.length > 0 && (
                  <div className="mt-4 w-full">
                    <p className="text-[12px] font-bold text-ink-800">أقرب منتجات متاحة في هذا القسم</p>
                    <div className="mt-3 text-start">
                      <ProductGrid items={alternatives.data.items.slice(0, 4)} columns={4} />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  {(listing.data?.siblings ?? []).slice(0, 4).map((sibling) => (
                    <Link
                      key={sibling.id}
                      to={`/c/${slug}/${sibling.slug}`}
                      className="rounded-full bg-brand-50 px-3.5 py-2 text-[12px] font-bold text-brand-800 transition hover:bg-brand-100"
                    >
                      {sibling.name}
                    </Link>
                  ))}
                </div>
              </EmptyState>
            )}
          </div>

          {/* Category benefits */}
          {current.benefits && current.benefits.length > 0 && results.data && (
            <ul className="mt-10 grid gap-3 sm:grid-cols-3">
              {current.benefits.map((benefit) => (
                <li key={benefit.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                    <Icon name={benefit.icon} size={18} />
                  </span>
                  <h3 className="mt-3 font-display text-[13.5px] font-bold text-ink-950">{benefit.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{benefit.description}</p>
                </li>
              ))}
            </ul>
          )}

          {/* SEO copy + buying guide */}
          <section className="mt-10 space-y-6">
            {current.seo.intro && (
              <div className="rounded-xl border border-ink-100 bg-paper p-5">
                <h2 className="font-display text-[16px] font-extrabold text-ink-950">{seoTitle}</h2>
                <p className="mt-2.5 text-[13.5px] leading-7 text-ink-700">{current.seo.intro}</p>
              </div>
            )}

            {isNested && current.buyingGuide && (
              <div className="rounded-xl border border-ink-100 bg-surface p-5">
                <h2 className="font-display text-[15px] font-extrabold text-ink-950">{current.buyingGuide.title}</h2>
                <ol className="mt-3 space-y-2.5">
                  {current.buyingGuide.steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-[13px] leading-7 text-ink-700">
                      <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {current.seo.sections && current.seo.sections.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                {current.seo.sections.map((section) => (
                  <article key={section.id} className="rounded-xl border border-ink-100 bg-surface p-5">
                    <h3 className="font-display text-[14.5px] font-bold text-ink-950">{section.title}</h3>
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 24)} className="mt-2 text-[13px] leading-7 text-ink-600">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="mt-3 space-y-2">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                            <Icon name="check" size={14} className="mt-1 shrink-0 text-flow-600" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            )}

            {faqs.data && faqs.data.length > 0 && (
              <div>
                <SectionHeading
                  eyebrow="أسئلة شائعة"
                  title={`أسئلة عن ${current.name}`}
                  description="إجابات مختصرة من فريق خدمة العملاء — وتجد قائمة الأسئلة الكاملة في مركز المساعدة."
                  action={{ label: "كل الأسئلة", href: "/faq" }}
                />
                <Accordion
                  className="mt-4"
                  items={faqs.data.map((faq: FaqItem) => ({
                    id: faq.id,
                    title: faq.question,
                    content: <p>{faq.answer}</p>,
                  }))}
                />
              </div>
            )}
          </section>

          {/* Related categories */}
          <section className="mt-10">
            <SectionHeading eyebrow="تصفّح أيضًا" title="تصنيفات مرتبطة" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {topLevelCategories
                .filter((item) => item.slug !== category?.slug)
                .slice(0, 4)
                .map((item) => (
                  <Link
                    key={item.id}
                    to={`/c/${item.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-surface p-3.5 transition hover:border-brand-200 hover:shadow-hair"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 transition group-hover:bg-brand-50 group-hover:text-brand-700">
                      <Icon name={item.icon} size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[13px] font-bold text-ink-950">{item.name}</span>
                      <span className="block text-[11px] text-ink-500">{item.productCount ?? 0} منتج</span>
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </div>

      <RecentlyViewedRail />

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facets={facets}
        controller={controller}
        resultCount={results.data?.total ?? 0}
      />
    </div>
  );
}
