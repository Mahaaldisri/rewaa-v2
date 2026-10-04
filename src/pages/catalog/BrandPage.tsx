import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { RecentlyViewedRail } from "@/components/common/RecentlyViewedRail";
import { catalogApi } from "@/services/catalogApi";
import { findBrandBySlug } from "@/data/catalog/brands";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, itemListSchema, usePageSeo } from "@/lib/seo";

/** Brand landing page — `/b/:slug`. */
export function BrandPage() {
  const { slug = "" } = useParams();
  const brand = findBrandBySlug(slug);

  const products = useAsync(() => catalogApi.listBrandProducts(slug, 24), [slug]);

  const crumbs = useMemo(
    () => [
      { label: "الرئيسية", href: "/" },
      { label: "العلامات التجارية", href: "/brands" },
      { label: brand?.name ?? "علامة تجارية", href: `/b/${slug}` },
    ],
    [brand?.name, slug]
  );

  usePageSeo({
    title: brand ? `${brand.name} — ${brand.tagline} | رواء` : "علامة تجارية | رواء",
    description: brand ? `${brand.description} تسوّق منتجات ${brand.name} من رواء.` : undefined,
    canonical: `/b/${slug}`,
    jsonLd: brand
      ? [
          breadcrumbSchema(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Brand",
            name: brand.name,
            alternateName: brand.nameEn,
            description: brand.description,
          },
          ...(products.data && products.data.items.length > 0
            ? [itemListSchema(products.data.items, `منتجات ${brand.name}`)]
            : []),
        ]
      : [],
  });

  if (!brand) return <Navigate to="/404" replace />;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x grid gap-6 py-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <span className="grid size-20 place-items-center rounded-2xl border border-ink-100 bg-paper font-display text-2xl font-extrabold text-brand-800 shadow-hair">
            {brand.logoText}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-extrabold text-ink-950">{brand.name}</h1>
              <Badge tone="neutral">{brand.nameEn}</Badge>
              <Badge tone="info" icon="mapPin">
                {brand.country}
              </Badge>
            </div>
            <p className="mt-2 text-[13.5px] font-semibold text-brand-700">{brand.tagline}</p>
            <p className="mt-2.5 max-w-3xl text-[13.5px] leading-7 text-ink-600">{brand.description}</p>
          </div>
          <div className="rounded-xl border border-ink-100 bg-paper p-4 lg:w-[260px]">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-bold text-ink-950">
              <Icon name="shield" size={15} className="text-flow-600" />
              الضمان والخدمة
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-ink-600">{brand.warrantyNote}</p>
            <p className="mt-2 text-[12px] leading-6 text-ink-600">{brand.serviceNote}</p>
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0">
            <SectionHeading
              eyebrow={`${products.data?.total ?? 0} منتج`}
              title={`منتجات ${brand.name}`}
              description="كل الأصناف المتوفرة من هذه العلامة داخل كتالوج رواء."
            />
            <div className="mt-5">
              {products.error && !products.loading ? (
                <ErrorState onRetry={products.retry} retrying={products.loading} />
              ) : products.loading && !products.data ? (
                <ProductGridSkeleton count={6} />
              ) : products.data && products.data.items.length > 0 ? (
                <ProductGrid items={products.data.items} />
              ) : (
                <EmptyState
                  title="لا تتوفر منتجات لهذه العلامة حاليًا"
                  description="يمكننا توفير الأصناف بالطلب. تواصل معنا لمعرفة المدة المتوقعة."
                  action={{ label: "تواصل معنا", href: "/contact/whatsapp" }}
                  secondaryAction={{ label: "تصفّح الكتالوج", href: "/c/water-filters" }}
                />
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">عن العلامة</h2>
              {brand.story.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="mt-2.5 text-[12.5px] leading-7 text-ink-600">
                  {paragraph}
                </p>
              ))}
            </article>

            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">لماذا من رواء؟</h2>
              <ul className="mt-3 space-y-3">
                {brand.highlights.map((highlight) => (
                  <li key={highlight.title} className="flex items-start gap-2.5">
                    <Icon name="check" size={15} className="mt-1 shrink-0 text-flow-600" />
                    <span>
                      <span className="block text-[12.5px] font-bold text-ink-900">{highlight.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-6 text-ink-600">{highlight.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-ink-100 bg-paper p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">أقسام تظهر فيها العلامة</h2>
              <ul className="mt-3 space-y-2">
                {brand.categories.map((categorySlug) => (
                  <li key={categorySlug}>
                    <Link
                      to={`/c/${categorySlug}`}
                      className="flex items-center justify-between rounded-md border border-ink-150 bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-ink-50"
                    >
                      <span>{categoryLabel(categorySlug)}</span>
                      <Icon name="chevronLeft" size={15} className="text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </div>
      </div>

      <RecentlyViewedRail />
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  "water-filters": "فلاتر المياه",
  cartridges: "الشمعات والقطع",
  "whole-house": "فلترة المنزل بالكامل",
  desalination: "أجهزة التحلية",
  "pumps-equipment": "المضخات والمعدات",
  testing: "فحص وتحليل المياه",
  dispensers: "برادات المياه",
};

function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug;
}
