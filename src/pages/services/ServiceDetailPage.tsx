import { Navigate, useParams, Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { ServicePlanCard } from "@/components/content/ServicePlanCard";
import { contentApi } from "@/services/contentApi";
import { catalogApi } from "@/services/catalogApi";
import { useAsync } from "@/hooks/useAsync";
import { ServiceAvailabilityPanel } from "@/components/services/ServiceAvailabilityPanel";
import { usePageSeo, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { maintenancePlans, serviceOfferings } from "@/data/content/services";
import { branches } from "@/data/content/branches";
import { contact, serviceAreas, whatsappLink } from "@/config/site";

/** One page per service — `/services/:slug` (install, maintenance, contracts, water-test). */
export function ServiceDetailPage() {
  const { slug = "" } = useParams();
  const known = serviceOfferings.some((service) => service.slug === slug);
  const service = useAsync(() => contentApi.getService(slug), [slug]);

  const relatedProducts = useAsync(async () => {
    if (!service.data?.relatedCategorySlug) return [];
    const list = await catalogApi.listProducts({ sort: "best_selling", pageSize: 8 }, service.data.relatedCategorySlug);
    return list.items;
  }, [service.data?.relatedCategorySlug]);

  const crumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "الخدمات", href: "/services/maintenance" },
    { label: service.data?.name ?? "خدمة", href: `/services/${slug}` },
  ];

  usePageSeo({
    title: service.data ? `${service.data.name} | خدمات رواء` : "خدمة | رواء",
    description: service.data?.summary,
    canonical: `/services/${slug}`,
    image: service.data?.heroImage,
    jsonLd: service.data
      ? [
          breadcrumbSchema(crumbs),
          serviceSchema({
            name: service.data.name,
            summary: service.data.summary,
            slug: service.data.slug,
            startingPrice: service.data.startingPrice,
          }),
          ...(service.data.faqs && service.data.faqs.length > 0
            ? [faqSchema(service.data.faqs.map((faq) => ({ question: faq.q, answer: faq.a })))]
            : []),
        ]
      : [],
  });

  if (!known) return <Navigate to="/404" replace />;

  const plans = slug === "contracts" ? maintenancePlans : slug === "install" ? maintenancePlans.slice(0, 2) : [];

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      {service.loading && !service.data ? (
        <div className="container-x space-y-4 py-10">
          <div className="skeleton h-8 w-72 rounded-md" />
          <div className="skeleton h-4 w-full max-w-2xl rounded-md" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      ) : service.data ? (
        <>
          {/* Hero */}
          <section className="border-b border-ink-100 bg-surface">
            <div className="container-x grid gap-8 py-9 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <Badge tone="success" icon="badgeCheck">
                  خدمة من فرق رواء الفنية
                </Badge>
                <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
                  {service.data.name}
                </h1>
                <p className="mt-2 text-[13.5px] font-semibold text-brand-700">{service.data.tagline}</p>
                <p className="mt-3 max-w-2xl text-[13.5px] leading-7 text-ink-600">{service.data.summary}</p>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {service.data.startingPrice !== undefined && (
                    <span className="rounded-lg border border-ink-150 bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink-800">
                      تبدأ من {service.data.startingPrice} ر.س
                    </span>
                  )}
                  <span className="rounded-lg border border-ink-150 bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink-600">
                    {service.data.durationLabel}
                  </span>
                  <span className="rounded-lg border border-ink-150 bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink-600">
                    {service.data.coverageNote}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link
                    to={`/services/book?type=${slug === "install" ? "installation" : slug === "water-test" ? "water-test" : "maintenance"}`}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    <Icon name="calendar" size={16} />
                    {service.data.ctaLabel}
                  </Link>
                  <a
                    href={whatsappLink(`مرحبًا، أريد الاستفسار عن خدمة ${service.data.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-flow-200 bg-flow-50 px-5 text-[13px] font-bold text-flow-700 transition hover:bg-flow-100"
                  >
                    <Icon name="whatsapp" size={16} />
                    استفسار سريع
                  </a>
                </div>
              </div>

              {service.data.heroImage && (
                <img
                  src={service.data.heroImage}
                  alt={service.data.name}
                  className="aspect-[4/3] w-full rounded-xl object-cover shadow-hair"
                  loading="lazy"
                />
              )}
            </div>
          </section>

          {/* Includes + signals */}
          <section className="container-x py-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
              <div>
                <SectionHeading eyebrow="ماذا تشمل الخدمة" title="التفاصيل الكاملة" />
                <ul className="grid gap-3 sm:grid-cols-2">
                  {service.data.includes.map((item) => (
                    <li key={item.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                      <span className="grid size-8 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                        <Icon name="check" size={16} />
                      </span>
                      <h3 className="mt-2.5 font-display text-[13.5px] font-bold text-ink-950">{item.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-6 text-ink-600">{item.body}</p>
                    </li>
                  ))}
                </ul>

                {service.data.requirements && service.data.requirements.length > 0 && (
                  <div className="mt-6 rounded-xl border border-ink-100 bg-paper p-5">
                    <h3 className="flex items-center gap-2 font-display text-[14px] font-extrabold text-ink-950">
                      <Icon name="info" size={16} className="text-aqua-600" />
                      قبل وصول الفني
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {service.data.requirements.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                          <Icon name="check" size={14} className="mt-1 shrink-0 text-flow-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <ServiceAvailabilityPanel context="service" />
                {service.data.signals && service.data.signals.length > 0 && (
                  <article className="rounded-xl border border-ink-100 bg-surface p-5">
                    <h3 className="font-display text-[14px] font-extrabold text-ink-950">متى تحتاج هذه الخدمة؟</h3>
                    <ul className="mt-3 space-y-3">
                      {service.data.signals.map((signal) => (
                        <li key={signal.title} className="flex items-start gap-2.5">
                          <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-warning" />
                          <span>
                            <span className="block text-[12.5px] font-bold text-ink-900">{signal.title}</span>
                            <span className="mt-0.5 block text-[12px] leading-6 text-ink-600">{signal.body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )}

                <article className="rounded-xl border border-ink-100 bg-paper p-5">
                  <h3 className="font-display text-[14px] font-extrabold text-ink-950">نطاق الخدمة</h3>
                  <p className="mt-2 text-[12px] leading-6 text-ink-600">{serviceAreas.note}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {serviceAreas.cities.slice(0, 12).map((city) => (
                      <li key={city} className="rounded-full bg-surface px-2.5 py-1 text-[11.5px] text-ink-600 ring-1 ring-ink-150">
                        {city}
                      </li>
                    ))}
                  </ul>
                  <Link to="/stores" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                    عرض المعارض
                    <Icon name="arrowLeft" size={13} />
                  </Link>
                </article>

                <article className="rounded-xl border border-ink-100 bg-surface p-5">
                  <h3 className="font-display text-[14px] font-extrabold text-ink-950">تواصل مباشر</h3>
                  <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                    للحالات العاجلة (تسريب نشط) اتصل بنا مباشرة أو راسلنا على واتساب وسنتعامل معها كأولوية.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink-950 text-[12.5px] font-bold text-white transition hover:bg-ink-800"
                    >
                      <Icon name="phone" size={15} />
                      {contact.phoneDisplay}
                    </a>
                    <a
                      href={whatsappLink(`حالة عاجلة: أحتاج ${service.data.name}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-flow-200 bg-flow-50 text-[12.5px] font-bold text-flow-700"
                    >
                      <Icon name="whatsapp" size={15} />
                      واتساب الدعم الفني
                    </a>
                  </div>
                </article>
              </aside>
            </div>
          </section>

          {/* Process */}
          <section className="border-y border-ink-100 bg-paper py-10">
            <div className="container-x">
              <SectionHeading
                eyebrow="كيف تسير الخدمة"
                title="خطوات الزيارة من البداية للنهاية"
                description="نوضّح كل خطوة حتى تعرف ما يحدث ومتى، وما المتوقع منك في كل مرحلة."
              />
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {service.data.process.map((step, index) => (
                  <li key={step.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand-700 font-display text-[13px] font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[11px] font-bold tracking-wide text-aqua-600">{step.step}</p>
                    <h3 className="mt-1 font-display text-[13.5px] font-bold text-ink-950">{step.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Plans */}
          {plans.length > 0 && (
            <section className="container-x py-10">
              <SectionHeading
                eyebrow="باقات"
                title={slug === "contracts" ? "باقات الصيانة السنوية" : "باقات العناية المتاحة"}
                description="الأسعار المعروضة قيم تجريبية قابلة للتعديل، وتُحدَّد الباقة النهائية بعد معرفة نوع النظام وعدد المرات المطلوبة."
              />
              <div className="grid gap-4 lg:grid-cols-3">
                {plans.map((plan) => (
                  <ServicePlanCard key={plan.id} plan={plan} serviceSlug={slug} />
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {service.data.faqs && service.data.faqs.length > 0 && (
            <section className="container-x py-4">
              <SectionHeading eyebrow="أسئلة شائعة" title={`أسئلة عن ${service.data.shortName}`} />
              <Accordion
                items={service.data.faqs.map((faq, index) => ({
                  id: `service-faq-${index}`,
                  title: faq.q,
                  content: <p>{faq.a}</p>,
                }))}
              />
            </section>
          )}

          {/* Related products */}
          {relatedProducts.data && relatedProducts.data.length > 0 && (
            <section className="container-x py-10">
              <SectionHeading
                eyebrow="مع هذه الخدمة"
                title="منتجات يطلبها العملاء عادةً"
                action={{ label: "تصفّح القسم", href: `/c/${service.data.relatedCategorySlug}` }}
              />
              <ProductGrid items={relatedProducts.data} columns={4} />
            </section>
          )}

          {/* Branches strip */}
          <section className="container-x pb-4">
            <div className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[15px] font-extrabold text-ink-950">أقرب فرع يخدم منطقتك</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {branches.slice(0, 3).map((branch) => (
                  <li key={branch.id} className="rounded-lg border border-ink-150 bg-paper p-3.5">
                    <p className="text-[12.5px] font-bold text-ink-900">{branch.city} — {branch.district}</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-ink-500">{branch.address}</p>
                    <p className="mt-1 text-[11.5px] text-ink-500">{branch.hours}</p>
                  </li>
                ))}
              </ul>
              <Link to="/stores" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-700">
                كل المعارض وأرقام التواصل
                <Icon name="arrowLeft" size={14} />
              </Link>
            </div>
          </section>
        </>
      ) : (
        <div className="container-x py-16 text-center text-[13px] text-ink-500">لم نعثر على هذه الخدمة.</div>
      )}
    </div>
  );
}
