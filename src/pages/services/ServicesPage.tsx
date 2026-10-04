import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { ServiceAvailabilityPanel } from "@/components/services/ServiceAvailabilityPanel";
import { serviceOfferings, maintenancePlans, commercialContractNotes } from "@/data/content/services";
import { formatMoney } from "@/lib/format";
import { usePageSeo, breadcrumbSchema, serviceSchema } from "@/lib/seo";

/**
 * Services hub — `/services`.
 * Lists every bookable service with its published price note, coverage note and
 * the availability panel; each card links to the service detail page.
 */
export function ServicesPage() {
  usePageSeo({
    title: "خدمات التركيب والصيانة وفحص المياه | رواء",
    description:
      "تركيب أنظمة تنقية المياه، الصيانة الدورية، فحص جودة المياه، وعقود المنشآت التجارية — مع الأسعار المنشورة، مدة الزيارة، ونطاق الخدمة المعلن.",
    canonical: "/services",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "الخدمات", href: "/services" },
      ]),
      ...serviceOfferings.map((service) =>
        serviceSchema({
          name: service.name,
          summary: service.summary,
          slug: `/services/${service.slug}`,
          startingPrice: service.startingPrice,
        })
      ),
    ],
  });

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "الخدمات", href: "/services" }]} />
        </div>
      </div>

      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x grid gap-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <Badge tone="aqua" icon="wrench">
              خدمات رواء
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
              خدمات مياه بمواعيد واضحة وتسعير معلن
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-7 text-ink-600">
              من تركيب النظام في أول يوم، إلى الصيانة الدورية واستبدال الشمعات، وفحص المياه عند الحاجة — كل خدمة موضّح فيها
              ما تشمله، ومدتها، والسعر المنشور، ونطاق المدن الذي تصل إليه الفرق.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/services/book"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
              >
                <Icon name="calendar" size={16} />
                احجز موعد فني
              </Link>
              <Link
                to="/help/track"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-paper px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
              >
                <Icon name="truck" size={16} />
                تتبّع طلب خدمة
              </Link>
            </div>
          </div>
          <ServiceAvailabilityPanel context="service" />
        </div>
      </section>

      <section className="container-x py-9">
        <SectionHeading
          eyebrow="الخدمات المتاحة"
          title="كل خدمة بتفاصيلها قبل الحجز"
          description="الأسعار المنشورة مبدئية وتُؤكَّد عند الحجز حسب المسافة وحجم العمل — ولا تُضاف رسوم غير معلنة."
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {serviceOfferings.map((service) => (
            <li key={service.id}>
              <Link
                to={`/services/${service.slug}`}
                className="group flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-flow-300 hover:shadow-hair"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-flow-50 text-flow-700">
                  <Icon name={service.icon as IconName} size={20} />
                </span>
                <h3 className="mt-3 font-display text-[14.5px] font-bold text-ink-950">{service.name}</h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-6 text-ink-600">{service.summary}</p>
                <dl className="mt-3 space-y-1 text-[11.5px] text-ink-500">
                  <div className="flex items-center justify-between gap-2">
                    <dt>المدة</dt>
                    <dd className="font-semibold text-ink-700">{service.durationLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>السعر</dt>
                    <dd className="font-semibold text-ink-700">
                      {service.startingPrice !== undefined ? `من ${formatMoney(service.startingPrice)}` : service.priceNote}
                    </dd>
                  </div>
                </dl>
                <span className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-flow-700">
                  {service.ctaLabel}
                  <Icon name="arrowLeft" size={13} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {maintenancePlans.length > 0 && (
        <section className="container-x pb-9">
          <SectionHeading
            eyebrow="عقود الصيانة"
            title="باقات صيانة سنوية بخيارات معلنة"
            description="كل باقة توضّح عدد الزيارات وما تشمله من قطع — بدون وعود غير محددة."
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {maintenancePlans.map((plan) => (
              <li key={plan.id} className="rounded-xl border border-ink-100 bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-[14px] font-bold text-ink-950">{plan.name}</h3>
                  {plan.badge && <Badge tone="brand">{plan.badge}</Badge>}
                </div>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                  {plan.visits} زيارات سنوية · استجابة خلال {plan.responseHours} ساعة
                  {plan.cartridgesIncluded ? ` · تشمل ${plan.cartridgeSets} طقم شمعات` : " · بدون قطع"}
                </p>
                <ul className="mt-2.5 space-y-1">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[11.5px] leading-5 text-ink-600">
                      <Icon name="check" size={12} className="mt-1 shrink-0 text-flow-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-display text-[15px] font-extrabold text-ink-950">
                  {formatMoney(plan.pricePerYear)}
                  <span className="text-[11px] font-medium text-ink-500"> / سنويًا</span>
                  {plan.compareAtPrice && (
                    <span className="ms-2 text-[11px] font-medium text-ink-400 line-through">
                      {formatMoney(plan.compareAtPrice)}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pb-4">
        <div className="rounded-xl border border-ink-100 bg-paper p-5">
          <h2 className="font-display text-[15px] font-extrabold text-ink-950">{commercialContractNotes.title}</h2>
          <p className="mt-2 text-[12.5px] leading-6 text-ink-600">{commercialContractNotes.summary}</p>
          <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
            {commercialContractNotes.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-1.5 text-[11.5px] leading-5 text-ink-600">
                <Icon name="check" size={12} className="mt-1 shrink-0 text-flow-600" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/business"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
            >
              <Icon name="building" size={15} />
              حلول المنشآت
            </Link>
            <Link
              to="/help/contact"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700"
            >
              <Icon name="message" size={15} />
              تواصل مع الفريق
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
