import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { contentApi } from "@/services/contentApi";
import { branchCities, branches as branchList, directionsUrl } from "@/data/content/branches";
import { businessHours, contact, telLink, whatsappLink } from "@/config/site";
import { useAsync } from "@/hooks/useAsync";
import { branchSchema, breadcrumbSchema, usePageSeo } from "@/lib/seo";
import { ContentSkeleton } from "@/components/common/States";
import { cn } from "@/utils/cn";
import type { Branch } from "@/types/content";

/** Branch directory — `/stores`. */
export function StoresPage() {
  const branches = useAsync(() => contentApi.listBranches(), []);
  const [city, setCity] = useState<string>("all");
  const [service, setService] = useState<string>("all");

  usePageSeo({
    title: "معارض رواء وعناوينها | رواء",
    description:
      "أرقام وعناوين معارض رواء، ساعات العمل، الخدمات المتوفرة في كل معرض، ورابط الاتجاهات ومحادثة واتساب لكل فرع.",
    canonical: "/stores",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "المعارض", href: "/stores" },
      ]),
      ...(branches.data?.map((branch) => branchSchema(branch)) ?? []),
    ],
  });

  const allServices = useMemo(() => {
    const set = new Set<string>();
    branches.data?.forEach((branch) => branch.services.forEach((item) => set.add(item)));
    return Array.from(set);
  }, [branches.data]);

  const filtered = useMemo(
    () =>
      (branches.data ?? []).filter(
        (branch) => (city === "all" || branch.cityId === city) && (service === "all" || branch.services.includes(service))
      ),
    [branches.data, city, service]
  );

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "المعارض", href: "/stores" }]} />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-950">معارض رواء</h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-ink-500">
              زُرنا لتجربة الأنظمة عمليًا، أو اتصل بالمعرض الأقرب لجدولة زيارة فني. كل فرع يعرض خدماته وأرقامه
              بنفس الصفحة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={telLink()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[12.5px] font-bold text-white transition hover:bg-ink-800"
            >
              <Icon name="phone" size={15} />
              {contact.phoneDisplay}
            </a>
            <a
              href={whatsappLink("أريد معرفة أقرب معرض لي")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-flow-200 bg-flow-50 px-4 text-[12.5px] font-bold text-flow-700"
            >
              <Icon name="whatsapp" size={15} />
              اسأل على واتساب
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-ink-500">المدينة:</span>
            <button
              type="button"
              onClick={() => setCity("all")}
              aria-pressed={city === "all"}
              className={cn(
                "h-8 rounded-full border px-3 text-[12px] font-bold transition",
                city === "all" ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
              )}
            >
              كل المدن
            </button>
            {branchCities.map((cityName) => {
              const cityId = branchList.find((branch) => branch.city === cityName)?.cityId ?? cityName;
              return (
                <button
                  key={cityName}
                  type="button"
                  onClick={() => setCity(cityId)}
                  aria-pressed={city === cityId}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12px] font-bold transition",
                    city === cityId ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
                  )}
                >
                  {cityName}
                </button>
              );
            })}
          </div>

          {allServices.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-ink-500">الخدمة:</span>
              <button
                type="button"
                onClick={() => setService("all")}
                aria-pressed={service === "all"}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12px] font-bold transition",
                  service === "all" ? "border-aqua-500 bg-aqua-500 text-white" : "border-ink-200 bg-surface text-ink-600"
                )}
              >
                كل الخدمات
              </button>
              {allServices.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setService(item)}
                  aria-pressed={service === item}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12px] font-bold transition",
                    service === item ? "border-aqua-500 bg-aqua-500 text-white" : "border-ink-200 bg-surface text-ink-600"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Branches */}
        <div className="mt-6">
          {branches.loading && !branches.data ? (
            <ContentSkeleton rows={5} />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-8 text-center">
              <Icon name="mapPin" size={26} className="mx-auto text-ink-300" />
              <h2 className="mt-3 font-display text-[15px] font-extrabold text-ink-950">لا يوجد معرض بهذه المواصفات</h2>
              <p className="mt-1.5 text-[12.5px] text-ink-500">
                جرّب تغيير المدينة أو الخدمة، أو تواصل معنا ونجد لك أقرب بديل يخدم منطقتك.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCity("all");
                  setService("all");
                }}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {filtered.map((branch: Branch) => (
                <li key={branch.id}>
                  <article className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-5 shadow-hair">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {branch.isFlagship && (
                          <Badge tone="brand" icon="star">
                            المعرض الرئيسي
                          </Badge>
                        )}
                        <h2 className="mt-2 font-display text-[16px] font-extrabold text-ink-950">{branch.name}</h2>
                        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                          <Icon name="mapPin" size={14} className="text-ink-400" />
                          {branch.city} · {branch.district}
                        </p>
                      </div>
                      {branch.isFlagship && (
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                          <Icon name="store" size={20} />
                        </span>
                      )}
                    </div>

                    <dl className="mt-3 space-y-2 text-[12.5px]">
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-bold text-ink-500">العنوان:</dt>
                        <dd className="text-ink-700">{branch.address}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-bold text-ink-500">العمل:</dt>
                        <dd className="text-ink-700">{branch.hours}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-bold text-ink-500">الجوال:</dt>
                        <dd dir="ltr" className="font-semibold text-ink-800">
                          {branch.phone}
                        </dd>
                      </div>
                    </dl>

                    {branch.hoursNote && (
                      <p className="mt-2 rounded-lg bg-warning-soft/50 px-3 py-2 text-[11.5px] leading-5 text-ink-700">
                        {branch.hoursNote}
                      </p>
                    )}

                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {branch.services.map((item) => (
                        <li key={item} className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-150">
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 grid grid-cols-3 gap-2 pt-2">
                      <a
                        href={`tel:${branch.phone.replace(/\s/g, "")}`}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink-950 text-[12px] font-bold text-white transition hover:bg-ink-800"
                      >
                        <Icon name="phone" size={14} />
                        اتصل
                      </a>
                      <a
                        href={whatsappLink(`مرحبًا، أريد الاستفسار من فرع ${branch.city} — ${branch.district}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-flow-200 bg-flow-50 text-[12px] font-bold text-flow-700 transition hover:bg-flow-100"
                      >
                        <Icon name="whatsapp" size={14} />
                        واتساب
                      </a>
                      <a
                        href={directionsUrl(branch)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-surface text-[12px] font-bold text-ink-700 transition hover:bg-ink-50"
                      >
                        <Icon name="navigation" size={14} />
                        الاتجاهات
                      </a>
                    </div>
                    <p className="mt-2 text-center text-[10.5px] text-ink-400">
                      رابط الاتجاهات يفتح الخرائط في تطبيق جهازك — بلا حسابات أو اشتراكات.
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contact strip */}
        <section className="mt-10">
          <SectionHeading eyebrow="قبل الزيارة" title="معلومات مفيدة" />
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-extrabold text-ink-950">
                <Icon name="clock" size={16} className="text-brand-600" />
                ساعات العمل العامة
              </h2>
              <ul className="mt-3 space-y-2">
                {businessHours.map((row) => (
                  <li key={row.day} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-600">{row.day}</span>
                    <span className="font-semibold text-ink-900">{row.hours}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-extrabold text-ink-950">
                <Icon name="package" size={16} className="text-brand-600" />
                استلام من المعرض
              </h2>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                يمكنك اختيار «استلام من المعرض» عند إتمام الطلب، وسيصلك إشعار جاهزية الطلب مع رقم المرجع. يرجى إحضار رقم
                الطلب والهوية عند الاستلام.
              </p>
            </article>

            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-extrabold text-ink-950">
                <Icon name="wrench" size={16} className="text-brand-600" />
                زيارة فني بدل الزيارة
              </h2>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                إن لم يكن لديك وقت للمعرض، احجز زيارة فني للتركيب أو الصيانة وسيصل إلى موقعك بالقطع اللازمة.
              </p>
              <Link
                to="/services/book"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
              >
                <Icon name="calendar" size={15} />
                احجز زيارة
              </Link>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
