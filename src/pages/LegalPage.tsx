import { Link, Navigate, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { contentApi } from "@/services/contentApi";
import { legalDocuments } from "@/data/content/legal";
import { contact, legal, whatsappLink } from "@/config/site";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, usePageSeo } from "@/lib/seo";
import { ErrorState } from "@/components/common/States";

/** Legal pages — `/legal/:slug` (privacy, terms, shipping, returns, warranty). */
export function LegalPage() {
  const { slug = "" } = useParams();
  const known = legalDocuments.some((document) => document.slug === slug);
  const document_ = useAsync(() => contentApi.getLegalDocument(slug), [slug]);

  const crumbs = [
    { label: "الرئيسية", href: "/" },
    { label: document_.data?.title ?? "سياسات", href: `/legal/${slug}` },
  ];

  usePageSeo({
    title: document_.data ? `${document_.data.title} | رواء` : "السياسات | رواء",
    description: document_.data?.summary,
    canonical: `/legal/${slug}`,
    jsonLd: document_.data ? [breadcrumbSchema(crumbs)] : [],
  });

  if (!known) return <Navigate to="/404" replace />;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
          {/* Side nav */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <h2 className="mb-3 font-display text-[13px] font-extrabold text-ink-950">السياسات والوثائق</h2>
            <ul className="space-y-1.5">
              {legalDocuments.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/legal/${item.slug}`}
                    aria-current={item.slug === slug ? "page" : undefined}
                    className={
                      "flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12.5px] font-semibold transition " +
                      (item.slug === slug
                        ? "border-brand-300 bg-brand-50 text-brand-900"
                        : "border-ink-150 bg-surface text-ink-700 hover:border-brand-200 hover:bg-ink-50")
                    }
                  >
                    {item.title}
                    <Icon name="chevronLeft" size={14} className="text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-ink-100 bg-surface p-4">
              <h3 className="font-display text-[12.5px] font-extrabold text-ink-950">بيانات المنشأة</h3>
              <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-5 text-ink-600">
                <li>السجل التجاري: <span className="font-mono">{legal.crNumber}</span></li>
                <li>الرقم الضريبي: <span className="font-mono">{legal.vatNumber}</span></li>
                <li>{contact.city} — {contact.country}</li>
              </ul>
              <p className="mt-2 text-[10.5px] leading-4 text-ink-400">
                القيم التجريبية مُعلَّمة بوضوح وتُستبدل بالبيانات الرسمية قبل الإطلاق.
              </p>
            </div>
          </aside>

          {/* Document */}
          <article className="min-w-0">
            {document_.loading && !document_.data ? (
              <div className="space-y-4" aria-hidden>
                <div className="skeleton h-8 w-64 rounded-md" />
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-40 w-full rounded-xl" />
              </div>
            ) : document_.error && !document_.loading ? (
              <ErrorState onRetry={document_.retry} retrying={document_.loading} />
            ) : document_.data ? (
              <>
                <header>
                  <h1 className="font-display text-2xl font-extrabold text-ink-950">{document_.data.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    <Badge tone="neutral" icon="clock">
                      آخر تحديث:{" "}
                      {new Date(document_.data.updatedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Badge>
                    <Badge tone="info" icon="info">
                      {document_.data.sections.length} بنود
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-3xl text-[13.5px] leading-7 text-ink-600">{document_.data.summary}</p>
                  {document_.data.disclaimer && (
                    <p className="mt-3 rounded-lg border border-warning/25 bg-warning-soft/40 p-3.5 text-[12px] leading-6 text-ink-700">
                      <Icon name="alert" size={14} className="me-1.5 inline text-warning" />
                      {document_.data.disclaimer}
                    </p>
                  )}
                </header>

                {/* Table of contents */}
                <nav aria-label="محتويات الصفحة" className="mt-6 rounded-xl border border-ink-100 bg-paper p-4">
                  <h2 className="font-display text-[12.5px] font-extrabold text-ink-950">محتويات الصفحة</h2>
                  <ol className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                    {document_.data.sections.map((section, index) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className="flex items-center gap-2 text-[12.5px] text-ink-600 transition hover:text-brand-700"
                        >
                          <span className="text-[11px] font-bold text-ink-400 tabular-nums">{index + 1}.</span>
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <div className="mt-6 space-y-6">
                  {document_.data.sections.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-28">
                      <h2 className="font-display text-[17px] font-extrabold text-ink-950">{section.title}</h2>
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 24)} className="mt-2.5 text-[13.5px] leading-8 text-ink-600">
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="mt-3 space-y-2">
                          {section.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2 text-[13px] leading-7 text-ink-600">
                              <Icon name="check" size={15} className="mt-1.5 shrink-0 text-flow-600" />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>

                <footer className="mt-10 rounded-xl border border-ink-100 bg-surface p-5">
                  <h2 className="font-display text-[14px] font-extrabold text-ink-950">لديك سؤال عن هذه السياسة؟</h2>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">
                    فريق خدمة العملاء يوضح لك أي بند بشكل مباشر، ويمكنك طلب نسخة PDF من الوثيقة عبر البريد.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <Link
                      to="/help/contact"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                    >
                      <Icon name="message" size={15} />
                      راسل خدمة العملاء
                    </Link>
                    <a
                      href={whatsappLink(`استفسار عن ${document_.data.title}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-flow-200 bg-flow-50 px-4 text-[12.5px] font-bold text-flow-700"
                    >
                      <Icon name="whatsapp" size={15} />
                      اسأل على واتساب
                    </a>
                  </div>
                </footer>
              </>
            ) : null}
          </article>
        </div>
      </div>
    </div>
  );
}
