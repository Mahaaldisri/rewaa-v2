import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ProductRail } from "@/components/product/ProductCard";
import { PaymentGlyphs } from "@/components/product/PaymentMethods";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { RecentlyViewedRail } from "@/components/common/RecentlyViewedRail";
import { CalculatorTeaser } from "@/components/home/CalculatorTeaser";
import { HeroSlider } from "@/components/home/HeroSlider";
import { Announcements } from "@/components/home/Announcements";
import { catalogApi } from "@/services/catalogApi";
import { contentApi } from "@/services/contentApi";
import { topLevelCategories } from "@/data/catalog/categories";
import { needs } from "@/data/content/needs";
import { serviceOfferings } from "@/data/content/services";
import { guides } from "@/data/content/guides";
import { whyRewaa } from "@/data/content/business";
import { branches } from "@/data/content/branches";
import { summariesToRelated } from "@/lib/product-view";
import { useAsync } from "@/hooks/useAsync";
import { useCountdown } from "@/hooks/useCountdown";
import { useStore } from "@/store/StoreProvider";
import { itemListSchema, organizationSchema, usePageSeo, websiteSchema } from "@/lib/seo";
import { brand, shipping, whatsappLink } from "@/config/site";
import { formatMoney } from "@/lib/format";
import { cn } from "@/utils/cn";

const STEPS: { icon: "search" | "calendar" | "droplet" | "rotate"; title: string; body: string }[] = [
  { icon: "search", title: "اختر النظام", body: "قارن المراحل والسعة والضمان، أو استخدم أداة الاختيار لتصل للأنسب." },
  { icon: "calendar", title: "احجز التركيب", body: "فني من رواء يركّب النظام ويشرح طريقة الاستخدام والصيانة." },
  { icon: "droplet", title: "قِس النتيجة", body: "قياس TDS قبل وبعد التركيب يوضح أثر النظام بالأرقام." },
  { icon: "rotate", title: "صيانة في وقتها", body: "تذكير بموعد تغيير الشمعات وباقات صيانة بأولوية للبلاغات." },
];

export function HomePage() {
  const { recentlyViewed } = useStore();
  const collections = useAsync(() => catalogApi.collections(), []);
  const plans = useAsync(() => contentApi.listMaintenancePlans(), []);
  const hero = useAsync(() => contentApi.listHeroSlides(), []);
  const offers = useAsync(() => contentApi.listOffers(), []);
  const featuredOffer = offers.data?.live.find((offer) => offer.endsAt) ?? null;
  const countdown = useCountdown(featuredOffer?.endsAt ?? "");

  usePageSeo({
    title: `${brand.name} | أجهزة تنقية وتحلية المياه في السعودية`,
    description: brand.description,
    canonical: "/",
    image: "/images/hero-kitchen.jpg",
    jsonLd: [
      organizationSchema(),
      websiteSchema(),
      ...(collections.data && collections.data.bestSellers.length > 0
        ? [itemListSchema(collections.data.bestSellers, "الأكثر مبيعًا في رواء")]
        : []),
    ],
  });

  return (
    <div className="bg-ambient">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-fine opacity-[0.3]" aria-hidden="true" />

      {/* ---------------------------------- Hero ---------------------------------- */}
      <HeroSlider
        slides={hero.data ?? []}
        loading={hero.loading}
        tagline={brand.tagline}
        offer={
          featuredOffer
            ? {
                title: featuredOffer.title,
                href: featuredOffer.href ?? "/offers",
                countdownLabel:
                  featuredOffer.endsAt && !countdown.isExpired
                    ? `${String(countdown.days).padStart(2, "0")}ي ${String(countdown.hours).padStart(2, "0")}س`
                    : undefined,
              }
            : null
        }
        trust={[
          { icon: "truck", label: `توصيل مجاني فوق ${formatMoney(shipping.freeShippingThreshold)}` },
          { icon: "store", label: `${branches.length} معارض للاستلام والزيارة` },
          { icon: "shield", label: "ضمان معلن لكل منتج" },
          { icon: "headset", label: "دعم فني على واتساب" },
        ]}
      />

      {/* ------------------------------- Announcements ----------------------------- */}
      <Announcements />

      {/* -------------------------------- Categories ------------------------------- */}
      <section className="container-x pt-12">
        <SectionHeading
          eyebrow="تسوّق حسب القسم"
          title="كل ما يخص مياه منزلك ومنشأتك"
          description="أقسام مبنية على طريقة الاستخدام، وليس على ترتيب المخزون — لتصل لما تحتاجه بسرعة."
          action={{ label: "كل الأقسام", href: "/c/water-filters" }}
        />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {topLevelCategories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/c/${category.slug}`}
                className="group flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-hair"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl",
                    category.accent === "aqua" && "bg-aqua-50 text-aqua-700",
                    category.accent === "brand" && "bg-brand-50 text-brand-700",
                    category.accent === "flow" && "bg-flow-50 text-flow-700",
                    category.accent === "ink" && "bg-ink-100 text-ink-700"
                  )}
                >
                  <Icon name={category.icon} size={21} />
                </span>
                <h3 className="mt-3 font-display text-[14px] font-bold text-ink-950">{category.name}</h3>
                <p className="mt-1 flex-1 text-[12px] leading-6 text-ink-500">{category.shortDescription}</p>
                <span className="mt-3 flex items-center justify-between text-[11.5px] font-bold text-brand-700">
                  {category.productCount ?? 0} منتج
                  <Icon name="arrowLeft" size={14} className="transition group-hover:-translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------- By need -------------------------------- */}
      <section className="container-x pt-12">
        <SectionHeading
          eyebrow="تسوّق حسب الحاجة"
          title="ما المشكلة التي تواجهها؟"
          description="لا تحتاج أن تعرف مواصفات النظام — اختر ما تصفه مياهك ونحن نرشّح الحل."
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {needs.slice(0, 8).map((need) => (
            <li key={need.id}>
              <Link
                to={`/c/${need.categorySlug}?need=${need.slug}`}
                className="group flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-aqua-300 hover:shadow-hair"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                  <Icon name={need.icon as never} size={18} />
                </span>
                <h3 className="mt-3 font-display text-[13.5px] font-bold text-ink-950">{need.title}</h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-6 text-ink-600">{need.guidance}</p>
                <span className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-aqua-700">
                  اعرض الحلول
                  <Icon name="arrowLeft" size={13} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------- Savings calculator --------------------------- */}
      <CalculatorTeaser />

      {/* ------------------------------- Best sellers ------------------------------ */}
      <section className="container-x pt-12">
        {collections.loading && !collections.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : (
          collections.data && (
            <ProductRail
              id="home-best-sellers"
              eyebrow="اختيارات العملاء"
              title="الأكثر مبيعًا هذا الشهر"
              items={summariesToRelated(collections.data.bestSellers)}
            />
          )
        )}
      </section>

      {/* --------------------------------- Services -------------------------------- */}
      <section className="container-x pt-12">
        <SectionHeading
          eyebrow="خدمات رواء"
          title="من التركيب إلى عقود الصيانة"
          description="خدمات بمواعيد محددة، وتقرير بعد كل زيارة يوضح ما تم تنفيذه والقراءات المسجلة."
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {serviceOfferings.map((service) => (
            <li key={service.id}>
              <Link
                to={`/services/${service.slug}`}
                className="group flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-flow-300 hover:shadow-hair"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-flow-50 text-flow-700">
                  <Icon name={service.icon as never} size={20} />
                </span>
                <h3 className="mt-3 font-display text-[14px] font-bold text-ink-950">{service.shortName}</h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-6 text-ink-600">{service.tagline}</p>
                <span className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-flow-700">
                  {service.ctaLabel}
                  <Icon name="arrowLeft" size={13} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------- Offers --------------------------------- */}
      {offers.data && offers.data.live.length > 0 && (
        <section className="container-x pt-12">
          <SectionHeading
            eyebrow="عروض سارية"
            title="وفّر على الأنظمة والخدمات"
            description="عروض مرتبطة بتاريخ انتهاء واضح وشروط معلنة — بلا عدّاد وهمي متكرر."
            action={{ label: "كل العروض", href: "/offers" }}
          />
          <ul className="grid gap-4 lg:grid-cols-2">
            {offers.data.live.slice(0, 2).map((offer) => (
              <li key={offer.id}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-xl border p-5",
                    offer.tone === "danger" ? "border-danger/20 bg-danger-soft/40" : "border-brand-200 bg-brand-50/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {offer.badge && <Badge tone={offer.tone === "danger" ? "danger" : "brand"}>{offer.badge}</Badge>}
                      <h3 className="mt-2 font-display text-[15.5px] font-extrabold leading-7 text-ink-950">{offer.title}</h3>
                      <p className="mt-1 text-[12.5px] text-ink-600">{offer.subtitle}</p>
                    </div>
                    {offer.savingsLabel && (
                      <span className="shrink-0 rounded-lg bg-ink-950 px-3 py-2 font-display text-[12px] font-bold text-aqua-300">
                        {offer.savingsLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 flex-1 text-[12.5px] leading-6 text-ink-600">{offer.description}</p>
                  <Link
                    to={offer.href ?? "/offers"}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    {offer.ctaLabel}
                    <Icon name="arrowLeft" size={15} />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------ How it works ------------------------------ */}
      <section className="container-x pt-12">
        <SectionHeading eyebrow="كيف تعمل التجربة" title="أربع خطوات واضحة" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-ink-100 bg-surface p-4">
              <span className="grid size-9 place-items-center rounded-lg bg-brand-700 font-display text-[13px] font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink-950">
                <Icon name={step.icon} size={16} className="text-brand-600" />
                {step.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------ Why + care plans ---------------------------- */}
      <section className="container-x grid gap-6 pt-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="rounded-xl border border-ink-100 bg-surface p-5">
          <h2 className="font-display text-[17px] font-extrabold text-ink-950">لماذا يختار العملاء رواء</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {whyRewaa.map((item) => (
              <li key={item.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                  <Icon name={item.icon as never} size={16} />
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold text-ink-900">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-6 text-ink-600">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-flow-200 bg-flow-50/60 p-5">
          <Badge tone="success" icon="shield">
            العناية الدورية
          </Badge>
          <h2 className="mt-2.5 font-display text-[17px] font-extrabold text-ink-950">باقات صيانة سنوية</h2>
          <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
            الزيارات وقطع الاستبدال بمواعيد محددة، وأولوية في البلاغات حسب الباقة. تُحدَّد الباقة الأنسب بعد معرفة
            النظام وعدد نقاط الاستخدام.
          </p>

          {plans.loading && !plans.data ? (
            <div className="mt-4 space-y-2.5">
              {[0, 1].map((key) => (
                <Skeleton key={key} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {(plans.data ?? []).slice(0, 3).map((plan) => (
                <li key={plan.id} className="rounded-lg border border-flow-200 bg-surface p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="text-[12.5px] font-bold text-ink-900">{plan.name}</span>
                      {plan.recommended && <Badge tone="success">الأنسب للأغلب</Badge>}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-extrabold text-flow-700">
                      {formatMoney(plan.pricePerYear)}
                      <span className="text-[10.5px] font-semibold text-ink-500"> /سنة</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-5 text-ink-500">{plan.bestFor}</p>
                  <p className="mt-1.5 text-[11.5px] text-ink-600">
                    {plan.visits} زيارات · استجابة {plan.responseHours} ساعة · أولوية {plan.priority}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/services/maintenance"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-5 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
          >
            تفاصيل الباقات
            <Icon name="arrowLeft" size={14} />
          </Link>
        </div>
      </section>

      {/* --------------------------------- Guides --------------------------------- */}
      <section className="container-x pt-12">
        <SectionHeading
          eyebrow="مركز المعرفة"
          title="اقرأ قبل أن تقرّر"
          description="مقالات مبنية على حالات حقيقية من الزيارات الفنية، بلا وعود مبالغ فيها."
          action={{ label: "كل المقالات", href: "/guides" }}
        />
        <ul className="grid gap-3 sm:grid-cols-3">
          {guides
            .filter((guide) => guide.featured)
            .slice(0, 3)
            .map((guide) => (
              <li key={guide.id}>
                <Link
                  to={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-surface transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-hair"
                >
                  <img
                    src={guide.heroImage}
                    alt={guide.title}
                    loading="lazy"
                    className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <Badge tone="neutral">{guide.categoryLabel}</Badge>
                    <h3 className="mt-2 font-display text-[13.5px] font-bold leading-6 text-ink-950">{guide.title}</h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-[12px] leading-6 text-ink-600">{guide.excerpt}</p>
                    <span className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                      <Icon name="clock" size={13} />
                      {guide.readingMinutes} دقائق قراءة
                    </span>
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* -------------------------------- Branches -------------------------------- */}
      <section className="container-x pt-12">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="زيارتنا أو نزورك"
                title="معارض رواء وخدمة الميدان"
                description="جرّب الأنظمة في المعرض، أو احجز زيارة فني تصلك بالقطع اللازمة. وبالنسبة للمنشآت، فريق المشاريع يبدأ بزيارة قياس."
              />
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/stores"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                >
                  <Icon name="store" size={16} />
                  عناوين المعارض
                </Link>
                <Link
                  to="/business"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
                >
                  <Icon name="building" size={16} />
                  حلول المنشآت
                </Link>
              </div>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              {branches.slice(0, 3).map((branch) => (
                <li key={branch.id} className="rounded-lg border border-ink-150 bg-paper p-3.5">
                  <p className="text-[12.5px] font-bold text-ink-900">
                    {branch.city} — {branch.district}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-5 text-ink-500">{branch.hours}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------- Newsletter ------------------------------- */}
      <section className="container-x pt-12">
        <div className="grid gap-6 rounded-xl border border-ink-100 bg-paper p-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink-950">تذكير مواعيد الشمعات وأحدث العروض</h2>
            <p className="mt-2 text-[13px] leading-7 text-ink-600">
              رسالة واحدة عند اقتراب موعد الاستبدال، وعروض مختارة للأنظمة والخدمات. لا رسائل متكررة، ويمكنك إلغاء
              الاشتراك في أي وقت.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PaymentGlyphs />
              <span className="text-[11.5px] text-ink-500">طرق دفع متعددة تشمل الدفع عند الاستلام</span>
            </div>
          </div>
          <div>
            <NewsletterForm />
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-flow-200 bg-flow-50 px-4 text-[12.5px] font-bold text-flow-700"
              >
                <Icon name="whatsapp" size={15} />
                واتساب الدعم الفني
              </a>
              <Link
                to="/faq"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700"
              >
                <Icon name="info" size={15} />
                الأسئلة الشائعة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {recentlyViewed.length > 0 && <RecentlyViewedRail />}
    </div>
  );
}
