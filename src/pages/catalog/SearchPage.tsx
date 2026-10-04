import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { EmptyState, ProductGridSkeleton } from "@/components/common/States";
import { searchApi, searchHistory, POPULAR_SEARCHES } from "@/services/searchApi";
import { useAsync } from "@/hooks/useAsync";
import { track } from "@/services/analytics";
import { usePageSeo } from "@/lib/seo";
import { formatNumber } from "@/lib/format";

/** Search results page — `/search?q=`. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query);
    if (query.trim().length >= 2) searchHistory.push(query);
  }, [query]);

  const results = useAsync(() => searchApi.search(query), [query]);

  /* Analytics: search term + result count (no query is sent before consent). */
  useEffect(() => {
    if (!query.trim() || !results.data) return;
    track("search", { search_term: query.trim(), results_count: results.data.total });
  }, [query, results.data]);

  usePageSeo({
    title: query ? `نتائج البحث عن "${query}" | رواء` : "البحث في المتجر | رواء",
    description: query
      ? `نتائج البحث عن ${query} في كتالوج رواء: أنظمة تنقية المياه، الشمعات، المضخات والمعدات.`
      : "ابحث في كتالوج رواء عن أنظمة تنقية المياه، الشمعات وقطع الغيار، والمعدات المرتبطة.",
    canonical: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    robots: "noindex, follow",
  });

  // Recent searches are read when the page mounts; they are external storage,
  // not React state, so there is nothing to depend on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recent = useMemo(() => searchHistory.read(), [query]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  };

  const total = results.data?.total ?? 0;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "البحث", href: "/search" }]} />
        </div>
      </div>

      <div className="container-x py-7">
        <h1 className="font-display text-2xl font-extrabold text-ink-950">
          {query ? <>نتائج البحث عن «{query}»</> : "ابحث في متجر رواء"}
        </h1>

        <form onSubmit={submit} role="search" className="mt-4 flex max-w-2xl items-center gap-2">
          <div className="relative flex-1">
            <Icon name="search" size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="ابحث بالمنتج أو الموديل أو رقم القطعة"
              aria-label="كلمة البحث"
              className="h-11 w-full rounded-lg border border-ink-200 bg-surface ps-10 pe-3 text-[13.5px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
          >
            ابحث
          </button>
        </form>

        {/* Recent + popular searches */}
        <div className="mt-5 space-y-3">
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-ink-500">عمليات بحث سابقة:</span>
              {recent.map((term) => (
                <Link
                  key={term}
                  to={`/search?q=${encodeURIComponent(term)}`}
                  className="rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-600 transition hover:border-brand-200 hover:text-brand-700"
                >
                  {term}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  searchHistory.clear();
                  setParams((current) => current);
                }}
                className="text-[11.5px] font-bold text-danger underline decoration-dotted underline-offset-2"
              >
                مسح السجل
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-ink-500">الأكثر بحثًا:</span>
            {POPULAR_SEARCHES.slice(0, 6).map((term) => (
              <Link
                key={term}
                to={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full bg-brand-50 px-3 py-1.5 text-[11.5px] font-semibold text-brand-800 transition hover:bg-brand-100"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {!query.trim() ? (
            <div className="rounded-xl border border-ink-100 bg-surface p-6">
              <h2 className="font-display text-[15px] font-extrabold text-ink-950">كيف تبحث بفعالية؟</h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {[
                  "اكتب اسم المنتج مثل «فلتر 7 مراحل»",
                  "أو رقم الموديل المطبوع على الجهاز مثل RO-7",
                  "أو نوع القطعة مثل «ممبرين» أو «طقم شمعات»",
                  "أو التصنيف مثل «تحلية منزلية»",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                    <Icon name="info" size={14} className="mt-1 shrink-0 text-aqua-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : results.loading && !results.data ? (
            <ProductGridSkeleton count={6} />
          ) : results.data && total > 0 ? (
            <div className="space-y-8">
              <p className="text-[12.5px] text-ink-500">
                <span className="font-bold text-ink-900 tabular-nums">{formatNumber(total)}</span> نتيجة في{" "}
                {results.data.products.length > 0 ? "المنتجات" : "الصفحات الأخرى"}
              </p>

              {results.data.products.length > 0 && (
                <section>
                  <h2 className="mb-4 font-display text-[15px] font-extrabold text-ink-950">منتجات</h2>
                  <ProductGrid items={results.data.products} />
                </section>
              )}

              {(results.data.categories.length > 0 || results.data.brands.length > 0 || results.data.guides.length > 0) && (
                <div className="grid gap-4 lg:grid-cols-3">
                  {results.data.categories.length > 0 && (
                    <section className="rounded-xl border border-ink-100 bg-surface p-4">
                      <h2 className="font-display text-[13.5px] font-extrabold text-ink-950">تصنيفات</h2>
                      <ul className="mt-3 space-y-2">
                        {results.data.categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              to={`/c/${category.slug}`}
                              className="flex items-center justify-between text-[12.5px] font-semibold text-ink-700 hover:text-brand-700"
                            >
                              {category.name}
                              <Icon name="chevronLeft" size={14} className="text-ink-300" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {results.data.brands.length > 0 && (
                    <section className="rounded-xl border border-ink-100 bg-surface p-4">
                      <h2 className="font-display text-[13.5px] font-extrabold text-ink-950">علامات تجارية</h2>
                      <ul className="mt-3 space-y-2">
                        {results.data.brands.map((brand) => (
                          <li key={brand.slug}>
                            <Link
                              to={`/b/${brand.slug}`}
                              className="flex items-center justify-between text-[12.5px] font-semibold text-ink-700 hover:text-brand-700"
                            >
                              {brand.name}
                              <Icon name="chevronLeft" size={14} className="text-ink-300" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {results.data.guides.length > 0 && (
                    <section className="rounded-xl border border-ink-100 bg-surface p-4">
                      <h2 className="font-display text-[13.5px] font-extrabold text-ink-950">مقالات مساعدة</h2>
                      <ul className="mt-3 space-y-2">
                        {results.data.guides.map((guide) => (
                          <li key={guide.slug}>
                            <Link
                              to={`/guides/${guide.slug}`}
                              className="flex items-start justify-between gap-2 text-[12.5px] font-semibold text-ink-700 hover:text-brand-700"
                            >
                              {guide.title}
                              <Icon name="chevronLeft" size={14} className="mt-1 shrink-0 text-ink-300" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title={`لا توجد نتائج مطابقة لـ «${query}»`}
              description={
                results.data?.fallbackTerms.length
                  ? `لم نعثر على نتائج مطابقة. قد تفيدك هذه المصطلحات: ${results.data.fallbackTerms.join(" · ")}`
                  : "جرّب كلمة أقصر أو رقم الموديل، أو تواصل مع الفريق لمساعدتك في تحديد المنتج."
              }
              action={{ label: "تصفّح كل الفلاتر", href: "/c/water-filters" }}
              secondaryAction={{ label: "اسأل الفريق", href: "/contact/whatsapp" }}
            >
              {results.data?.fallbackTerms && results.data.fallbackTerms.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {results.data.fallbackTerms.map((term) => (
                    <Link
                      key={term}
                      to={`/search?q=${encodeURIComponent(term)}`}
                      className="rounded-full bg-brand-50 px-3.5 py-2 text-[12px] font-bold text-brand-800 transition hover:bg-brand-100"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              )}
            </EmptyState>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-paper p-5">
          <Badge tone="aqua" icon="headset">
            مساعدة سريعة
          </Badge>
          <p className="text-[12.5px] text-ink-600">
            لم تجد ما تبحث عنه؟ أرسل لنا صورة الجهاز أو رقم الموديل على واتساب وسنحدد القطعة الصحيحة.
          </p>
          <Link
            to="/contact/whatsapp"
            className="ms-auto inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
          >
            <Icon name="whatsapp" size={15} />
            راسلنا على واتساب
          </Link>
        </div>
      </div>
    </div>
  );
}
