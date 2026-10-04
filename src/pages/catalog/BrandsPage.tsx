import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/common/States";
import { catalogApi } from "@/services/catalogApi";
import { useAsync } from "@/hooks/useAsync";
import { absoluteUrl, breadcrumbSchema, usePageSeo } from "@/lib/seo";
import type { Brand } from "@/types/catalog";

const crumbs = [
  { label: "الرئيسية", href: "/" },
  { label: "العلامات التجارية", href: "/brands" },
];

/**
 * Brand directory — `/brands`.
 *
 * Lists every brand that actually exists in the catalogue data, so the
 * “العلامات التجارية” link from a brand page and the footer always resolves to a
 * real page instead of a dead route.
 */
export function BrandsPage() {
  const brands = useAsync(() => catalogApi.listBrands(), []);

  usePageSeo({
    title: "العلامات التجارية | رواء",
    description:
      "تصفّح العلامات التجارية المتوفرة في كتالوج رواء: الخطوط الاحترافية وأنظمة المنازل والمضخات والخزانات، مع الضمان والخدمة وقطع الغيار لكل علامة.",
    canonical: "/brands",
    jsonLd: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "العلامات التجارية في رواء",
        numberOfItems: (brands.data ?? []).length,
        itemListElement: (brands.data ?? []).map((brand, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: brand.name,
          url: absoluteUrl(`/b/${brand.slug}`),
        })),
      },
    ],
  });

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      <section className="container-x py-8">
        <Badge tone="brand" icon="layers">
          دليل العلامات
        </Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-950">العلامات التجارية في رواء</h1>
        <p className="mt-2.5 max-w-3xl text-[13.5px] leading-7 text-ink-600">
          كل علامة هنا موجودة فعليًا في الكتالوج. نذكر في صفحة كل علامة ما توفره رواء من ضمان وخدمة وقطع غيار، دون أي
          ادعاءات اعتماد أو شراكة غير موثّقة.
        </p>

        {brands.error && !brands.loading ? (
          <div className="mt-6">
            <ErrorState onRetry={brands.retry} retrying={brands.loading} />
          </div>
        ) : brands.loading && !brands.data ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(brands.data ?? []).map((brand: Brand) => (
              <li key={brand.id}>
                <Link
                  to={`/b/${brand.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-hair"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-ink-100 bg-paper font-display text-[15px] font-extrabold text-brand-800">
                      {brand.logoText}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-extrabold text-ink-950 group-hover:text-brand-800">
                        {brand.name}
                      </span>
                      <span className="block text-[11.5px] text-ink-500">
                        {brand.nameEn} · {brand.country}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 block text-[12.5px] font-semibold text-brand-700">{brand.tagline}</span>
                  <span className="mt-2 line-clamp-3 flex-1 text-[12px] leading-6 text-ink-600">{brand.description}</span>
                  <span className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-brand-700">
                    اعرض المنتجات
                    <Icon name="arrowLeft" size={13} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
