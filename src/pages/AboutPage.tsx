import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { contentApi } from "@/services/contentApi";
import { branches, branchCities } from "@/data/content/branches";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, organizationSchema, usePageSeo } from "@/lib/seo";
import { ContentSkeleton } from "@/components/common/States";
import { companyStatNote } from "@/lib/placeholder-note";
import { brand } from "@/config/site";

/** About page — `/about`. */
export function AboutPage() {
  const profile = useAsync(() => contentApi.getCompanyProfile(), []);

  usePageSeo({
    title: "من نحن | رواء",
    description:
      "تعرّف على رواء: نشاطنا في تجهيز وتركيب وصيانة أنظمة تنقية وتحلية المياه في المملكة، وقيمنا في خدمة ما بعد البيع.",
    canonical: "/about",
    jsonLd: [
      organizationSchema(),
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "من نحن", href: "/about" },
      ]),
    ],
  });

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "من نحن", href: "/about" }]} />
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <Badge tone="brand" icon="droplet">
              {brand.tagline}
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950 sm:text-[34px]">
              رواء — حلول مياه نفكّر فيها معك خطوة بخطوة
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-8 text-ink-600">
              نبني تجربة متكاملة تبدأ من اختيار النظام المناسب، وتمر بالتركيب والتشغيل، ولا تنتهي عند البيع: قطع
              غيار متوفرة، تذكير بمواعيد الصيانة، وفرق فنية تصل إليك في المدن المخدومة.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/c/water-filters"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
              >
                تصفّح المنتجات
                <Icon name="arrowLeft" size={15} />
              </Link>
              <Link
                to="/stores"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
              >
                <Icon name="store" size={16} />
                زُر أقرب معرض
              </Link>
            </div>
          </div>

          {profile.data?.images?.[0] && (
            <img
              src={profile.data.images[0]}
              alt="فريق رواء أثناء تجهيز نظام تنقية"
              className="aspect-[4/3] w-full rounded-xl object-cover shadow-hair"
              loading="lazy"
            />
          )}
        </div>
      </section>

      {/* About paragraphs */}
      <section className="container-x py-10">
        {profile.loading && !profile.data ? (
          <ContentSkeleton rows={5} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div className="space-y-5">
              {profile.data?.about.map((block) => (
                <article key={block.title} className="rounded-xl border border-ink-100 bg-surface p-5">
                  <h2 className="font-display text-[16px] font-extrabold text-ink-950">{block.title}</h2>
                  <p className="mt-2 text-[13.5px] leading-8 text-ink-600">{block.body}</p>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <article className="rounded-xl border border-ink-100 bg-paper p-5">
                <h2 className="font-display text-[14px] font-extrabold text-ink-950">أرقام تشغيلية</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  {(profile.data?.stats ?? []).map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-ink-150 bg-surface p-3">
                      <dt className="text-[11px] font-bold text-ink-500">{stat.label}</dt>
                      <dd className="mt-1 font-display text-lg font-extrabold text-ink-950 tabular-nums">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-5 text-ink-400">{companyStatNote}</p>
              </article>

              <article className="rounded-xl border border-ink-100 bg-surface p-5">
                <h2 className="font-display text-[14px] font-extrabold text-ink-950">أين نخدم؟</h2>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  لدينا {branches.length} معارض في {branchCities.length} مدن، وفرق تركيب تصل إلى المدن المجاورة.
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {branchCities.map((city) => (
                    <li key={city} className="rounded-full bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-150">
                      {city}
                    </li>
                  ))}
                </ul>
                <Link to="/stores" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                  تفاصيل المعارض وأرقامها
                  <Icon name="arrowLeft" size={13} />
                </Link>
              </article>
            </aside>
          </div>
        )}
      </section>

      {/* Values */}
      {profile.data && (
        <section className="border-y border-ink-100 bg-paper py-10">
          <div className="container-x">
            <SectionHeading
              eyebrow="مبادئ العمل"
              title="قيم نبني عليها كل تعامل"
              description="ليست شعارات تسويقية، بل قواعد نلتزم بها في البيع والخدمة وما بعد البيع."
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {profile.data.values.map((value) => (
                <li key={value.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon name={value.icon as never} size={18} />
                  </span>
                  <h3 className="mt-3 font-display text-[13.5px] font-bold text-ink-950">{value.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{value.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Why rewAA */}
      {profile.data && (
        <section className="container-x py-10">
          <SectionHeading
            eyebrow="لماذا رواء"
            title="فروق تلمسها في التجربة اليومية"
            description="كل نقطة أدناه قابلة للتحقق من صفحات الموقع وسياساتنا المنشورة."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {profile.data.whyRewaa.map((item) => (
              <article key={item.title} className="flex gap-4 rounded-xl border border-ink-100 bg-surface p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                  <Icon name={item.icon as never} size={19} />
                </span>
                <div>
                  <h3 className="font-display text-[14px] font-bold text-ink-950">{item.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="container-x pb-4">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-950 p-8 text-white">
          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-extrabold">جاهز تبدأ؟ نبدأ بقياس احتياجك</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-7 text-ink-200">
                أرسل لنا عدد أفراد الأسرة أو طبيعة المنشأة، ونرشّح لك الأنظمة المناسبة مع مقارنة صريحة بين خيارين أو ثلاثة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/product-finder"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-aqua-400 px-5 text-[13px] font-bold text-ink-950 transition hover:bg-aqua-300"
              >
                <Icon name="target" size={16} />
                أداة اختيار المنتج
              </Link>
              <Link
                to="/help/contact"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 px-5 text-[13px] font-bold text-white transition hover:bg-white/10"
              >
                تحدّث مع الفريق
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
