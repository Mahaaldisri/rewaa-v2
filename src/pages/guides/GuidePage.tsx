import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ErrorState, ContentSkeleton } from "@/components/common/States";
import { contentApi } from "@/services/contentApi";
import { catalogApi } from "@/services/catalogApi";
import { guides } from "@/data/content/guides";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, articleSchema, faqSchema, usePageSeo } from "@/lib/seo";
import { cn } from "@/utils/cn";

/** Single article — `/guides/:slug`. */
export function GuidePage() {
  const { slug = "" } = useParams();
  const known = guides.some((guide) => guide.slug === slug);
  const guide = useAsync(() => contentApi.getGuide(slug), [slug]);
  const [activeSection, setActiveSection] = useState<string>("");

  const relatedProducts = useAsync(() => catalogApi.listBySlugs(guide.data?.relatedProductSlugs ?? []), [
    guide.data?.relatedProductSlugs.join(","),
  ]);

  const relatedGuides = useMemo(
    () => guides.filter((item) => item.slug !== slug && item.categoryId === guide.data?.categoryId).slice(0, 3),
    [slug, guide.data?.categoryId]
  );

  const relatedService = useAsync(async () => {
    if (!guide.data?.relatedServiceSlug) return null;
    return contentApi.getService(guide.data.relatedServiceSlug).catch(() => null);
  }, [guide.data?.relatedServiceSlug]);

  const crumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "مركز المعرفة", href: "/guides" },
    { label: guide.data?.title ?? "مقال", href: `/guides/${slug}` },
  ];

  usePageSeo({
    title: guide.data ? `${guide.data.title} | مركز معرفة رواء` : "مقال | رواء",
    description: guide.data?.excerpt,
    canonical: `/guides/${slug}`,
    image: guide.data?.heroImage,
    type: "article",
    jsonLd: guide.data
      ? [
          breadcrumbSchema(crumbs),
          articleSchema(guide.data),
          ...(guide.data.faqs.length > 0
            ? [faqSchema(guide.data.faqs.map((faq) => ({ question: faq.q, answer: faq.a })))]
            : []),
        ]
      : [],
  });

  // Track the section in view so the table of contents can highlight it.
  useEffect(() => {
    if (!guide.data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0.01 }
    );
    guide.data.sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [guide.data]);

  if (!known) return <Navigate to="/404" replace />;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      {guide.loading && !guide.data ? (
        <div className="container-x py-10">
          <ContentSkeleton rows={6} />
        </div>
      ) : guide.error && !guide.loading ? (
        <div className="container-x py-10">
          <ErrorState onRetry={guide.retry} retrying={guide.loading} />
        </div>
      ) : guide.data ? (
        <>
          <article className="container-x py-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
              <div className="min-w-0">
                <header>
                  <Badge tone="aqua">{guide.data.categoryLabel}</Badge>
                  <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
                    {guide.data.title}
                  </h1>
                  <p className="mt-3 text-[14px] leading-8 text-ink-600">{guide.data.excerpt}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-ink-100 py-3 text-[12px] text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <Icon name="user" size={14} />
                      {guide.data.author} — {guide.data.authorRole}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="clock" size={14} />
                      {guide.data.readingMinutes} دقائق قراءة
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="refresh" size={14} />
                      آخر تحديث{" "}
                      {new Date(guide.data.updatedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </header>

                <img
                  src={guide.data.heroImage}
                  alt={guide.data.title}
                  className="mt-5 aspect-[16/9] w-full rounded-xl object-cover"
                  loading="lazy"
                />

                {/* Mobile TOC */}
                <details className="mt-6 rounded-xl border border-ink-100 bg-paper p-4 lg:hidden">
                  <summary className="cursor-pointer font-display text-[13px] font-extrabold text-ink-950">
                    محتويات المقال
                  </summary>
                  <ol className="mt-2.5 space-y-1.5">
                    {guide.data.sections.map((section, index) => (
                      <li key={section.id}>
                        <a href={`#${section.id}`} className="flex items-center gap-2 text-[12.5px] text-ink-600">
                          <span className="text-[11px] font-bold text-ink-400 tabular-nums">{index + 1}.</span>
                          {section.heading}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>

                <div className="mt-6 space-y-8">
                  {guide.data.sections.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-28">
                      <h2 className="font-display text-[20px] font-extrabold text-ink-950">{section.heading}</h2>
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 24)} className="mt-3 text-[14px] leading-9 text-ink-600">
                          {paragraph}
                        </p>
                      ))}

                      {section.bullets && (
                        <ul className="mt-4 space-y-2.5">
                          {section.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2.5 text-[13.5px] leading-8 text-ink-600">
                              <Icon name="check" size={16} className="mt-2 shrink-0 text-flow-600" />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}

                      {section.table && (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100 thin-scrollbar">
                          <table className="w-full min-w-[520px] border-collapse text-start">
                            <caption className="sr-only">{section.heading}</caption>
                            <thead>
                              <tr className="bg-paper">
                                {section.table.columns.map((column) => (
                                  <th key={column} scope="col" className="border-b border-ink-100 p-3 text-start text-[12px] font-bold text-ink-600">
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {section.table.rows.map((row, rowIndex) => (
                                <tr key={`${section.id}-${rowIndex}`} className="odd:bg-surface even:bg-paper/60">
                                  {row.map((cell, cellIndex) =>
                                    cellIndex === 0 ? (
                                      <th
                                        key={cellIndex}
                                        scope="row"
                                        className="border-b border-ink-100 p-3 text-start text-[12.5px] font-semibold text-ink-800"
                                      >
                                        {cell}
                                      </th>
                                    ) : (
                                      <td key={cellIndex} className="border-b border-ink-100 p-3 text-[12.5px] text-ink-600">
                                        {cell}
                                      </td>
                                    )
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {section.callout && (
                        <aside
                          className={cn(
                            "mt-4 rounded-xl border p-4",
                            section.callout.tone === "warning" && "border-warning/25 bg-warning-soft/40",
                            section.callout.tone === "info" && "border-aqua-200 bg-aqua-50",
                            section.callout.tone === "success" && "border-flow-200 bg-flow-50"
                          )}
                        >
                          <p className="flex items-center gap-2 font-display text-[13px] font-bold text-ink-900">
                            <Icon
                              name={section.callout.tone === "warning" ? "alert" : section.callout.tone === "success" ? "checkCircle" : "info"}
                              size={15}
                              className={
                                section.callout.tone === "warning"
                                  ? "text-warning"
                                  : section.callout.tone === "success"
                                    ? "text-flow-600"
                                    : "text-aqua-600"
                              }
                            />
                            {section.callout.title}
                          </p>
                          <p className="mt-1.5 text-[12.5px] leading-7 text-ink-600">{section.callout.body}</p>
                        </aside>
                      )}
                    </section>
                  ))}
                </div>

                {/* Article FAQs */}
                {guide.data.faqs.length > 0 && (
                  <section className="mt-10">
                    <h2 className="font-display text-[18px] font-extrabold text-ink-950">أسئلة مرتبطة بالمقال</h2>
                    <Accordion
                      className="mt-3"
                      items={guide.data.faqs.map((faq, index) => ({
                        id: `${guide.data?.id}-faq-${index}`,
                        title: faq.q,
                        content: <p>{faq.a}</p>,
                      }))}
                    />
                  </section>
                )}

                {/* Tags */}
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-ink-500">وسوم:</span>
                  {guide.data.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/search?q=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-ink-50 px-3 py-1.5 text-[11.5px] font-semibold text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block">
                <div className="sticky top-[calc(var(--header-h)+16px)] space-y-4">
                  <nav aria-label="محتويات المقال" className="rounded-xl border border-ink-100 bg-surface p-4">
                    <h2 className="font-display text-[13px] font-extrabold text-ink-950">محتويات المقال</h2>
                    <ol className="mt-2.5 space-y-1.5">
                      {guide.data.sections.map((section, index) => (
                        <li key={section.id}>
                          <a
                            href={`#${section.id}`}
                            aria-current={activeSection === section.id ? "true" : undefined}
                            className={cn(
                              "flex items-start gap-2 rounded-md px-2 py-1.5 text-[12px] leading-5 transition",
                              activeSection === section.id
                                ? "bg-brand-50 font-bold text-brand-800"
                                : "text-ink-600 hover:bg-ink-50"
                            )}
                          >
                            <span className="mt-0.5 text-[10.5px] font-bold text-ink-400 tabular-nums">{index + 1}</span>
                            {section.heading}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>

                  {relatedService.data && (
                    <div className="rounded-xl border border-flow-200 bg-flow-50 p-4">
                      <Badge tone="success" icon="headset">
                        خدمة مرتبطة
                      </Badge>
                      <h2 className="mt-2.5 font-display text-[13.5px] font-extrabold text-flow-900">
                        {relatedService.data.name}
                      </h2>
                      <p className="mt-1.5 text-[12px] leading-6 text-flow-800">{relatedService.data.tagline}</p>
                      <Link
                        to={`/services/${relatedService.data.slug}`}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
                      >
                        تفاصيل الخدمة
                        <Icon name="arrowLeft" size={14} />
                      </Link>
                    </div>
                  )}

                  <div className="rounded-xl border border-ink-100 bg-paper p-4">
                    <h2 className="font-display text-[13px] font-extrabold text-ink-950">هل تحتاج مساعدة شخصية؟</h2>
                    <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                      أرسل وصف نظامك أو صورته وسنرد بتوصية مبنية على حالتك.
                    </p>
                    <Link
                      to="/help/contact"
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[12.5px] font-bold text-white transition hover:bg-ink-800"
                    >
                      <Icon name="message" size={15} />
                      راسل الفريق
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </article>

          {/* Related products */}
          {relatedProducts.data && relatedProducts.data.length > 0 && (
            <section className="container-x py-8">
              <h2 className="font-display text-[18px] font-extrabold text-ink-950">منتجات مرتبطة بالمقال</h2>
              <p className="mt-1.5 text-[13px] text-ink-500">الأصناف التي يشتريها القرّاء عادةً بعد هذا المقال.</p>
              <div className="mt-5">
                <ProductGrid items={relatedProducts.data} columns={4} />
              </div>
            </section>
          )}

          {/* Related guides */}
          {relatedGuides.length > 0 && (
            <section className="container-x py-8">
              <h2 className="font-display text-[18px] font-extrabold text-ink-950">اقرأ أيضًا</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {relatedGuides.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/guides/${item.slug}`}
                      className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-brand-200 hover:shadow-hair"
                    >
                      <h3 className="font-display text-[13.5px] font-bold leading-6 text-ink-950">{item.title}</h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-[12px] leading-6 text-ink-600">{item.excerpt}</p>
                      <span className="mt-3 flex items-center gap-1 text-[12px] font-bold text-brand-700">
                        اقرأ المقال
                        <Icon name="arrowLeft" size={13} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
