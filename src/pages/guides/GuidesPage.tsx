import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/common/States";
import { contentApi } from "@/services/contentApi";
import { guideCategories } from "@/data/content/guides";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, itemListSchema, usePageSeo } from "@/lib/seo";
import { cn } from "@/utils/cn";
import type { Article } from "@/types/content";

/** Knowledge centre hub — `/guides`. */
export function GuidesPage() {
  const guides = useAsync(() => contentApi.listGuides(), []);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  usePageSeo({
    title: "مركز المعرفة | مقالات عن أنظمة تنقية المياه",
    description:
      "مقالات عملية عن اختيار فلاتر المياه، مواعيد تغيير الشمعات، معنى قراءة TDS، وأسباب ضعف التدفق — مكتوبة بلغة واضحة بلا مبالغات.",
    canonical: "/guides",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "مركز المعرفة", href: "/guides" },
      ]),
      ...(guides.data && guides.data.length > 0 ? [itemListSchema([], "مقالات مركز المعرفة")] : []),
    ],
  });

  const filtered = useMemo(() => {
    const list = guides.data ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((guide) => {
      const inCategory = category === "all" || guide.categoryLabel === category;
      const inQuery =
        !needle ||
        [guide.title, guide.excerpt, guide.tags.join(" ")].join(" ").toLowerCase().includes(needle);
      return inCategory && inQuery;
    });
  }, [guides.data, category, query]);

  const featured = filtered.find((guide) => guide.featured) ?? filtered[0];

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "مركز المعرفة", href: "/guides" }]} />
        </div>
      </div>

      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x py-9">
          <Badge tone="aqua" icon="info">
            محتوى عملي
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
            مركز المعرفة: افهم نظامك قبل أن تشتري
          </h1>
          <p className="mt-2.5 max-w-3xl text-[13.5px] leading-7 text-ink-600">
            مقالات مستندة إلى الحالات التي نراها في الزيارات الفنية: أخطاء شائعة في الاختيار، مواعيد الاستبدال
            الواقعية، وشرح واضح لمعنى القراءات بدل الوعود المطلقة.
          </p>

          <div className="mt-5 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Icon name="search" size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في المقالات… مثال: شمعات، TDS، تدفق"
                aria-label="ابحث في المقالات"
                className="h-11 w-full rounded-lg border border-ink-200 bg-surface ps-10 pe-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[12px] font-bold transition",
                category === "all" ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
              )}
            >
              كل الأقسام
            </button>
            {guideCategories.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setCategory(label)}
                aria-pressed={category === label}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-[12px] font-bold transition",
                  category === label ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        {guides.loading && !guides.data ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : guides.error && !guides.loading ? (
          <ErrorState onRetry={guides.retry} retrying={guides.loading} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد مقالات مطابقة"
            description="جرّب كلمة أخرى أو تصفّح الأقسام. يمكنك أيضًا سؤال الفريق عن حالتك تحديدًا."
            action={{ label: "اسأل الفريق", href: "/help/contact" }}
            secondaryAction={{ label: "الأسئلة الشائعة", href: "/faq" }}
          />
        ) : (
          <>
            {featured && (
              <article className="overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-hair">
                <div className="grid lg:grid-cols-[1.1fr_1fr]">
                  <img
                    src={featured.heroImage}
                    alt={featured.title}
                    className="h-56 w-full object-cover lg:h-full"
                    loading="lazy"
                  />
                  <div className="p-6">
                    <Badge tone="brand">مقال مميز</Badge>
                    <h2 className="mt-3 font-display text-xl font-extrabold leading-8 text-ink-950">{featured.title}</h2>
                    <p className="mt-2.5 text-[13px] leading-7 text-ink-600">{featured.excerpt}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-500">
                      <span className="flex items-center gap-1.5">
                        <Icon name="clock" size={13} />
                        {featured.readingMinutes} دقائق قراءة
                      </span>
                      <span>{featured.categoryLabel}</span>
                      <span>
                        آخر تحديث{" "}
                        {new Date(featured.updatedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <Link
                      to={`/guides/${featured.slug}`}
                      className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                    >
                      اقرأ المقال
                      <Icon name="arrowLeft" size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            )}

            <div className="mt-10">
              <SectionHeading eyebrow="كل المقالات" title="اختر ما يهمّك" />
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered
                .filter((guide) => guide.id !== featured?.id)
                .map((guide: Article) => (
                  <li key={guide.id}>
                    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-surface transition hover:border-brand-200 hover:shadow-hair">
                      <Link to={`/guides/${guide.slug}`} className="block overflow-hidden">
                        <img
                          src={guide.heroImage}
                          alt={guide.title}
                          className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col p-4">
                        <Badge tone="neutral">{guide.categoryLabel}</Badge>
                        <h3 className="mt-2.5 font-display text-[14.5px] font-bold leading-6 text-ink-950">
                          <Link to={`/guides/${guide.slug}`} className="hover:text-brand-700">
                            {guide.title}
                          </Link>
                        </h3>
                        <p className="mt-2 line-clamp-3 flex-1 text-[12.5px] leading-6 text-ink-600">{guide.excerpt}</p>
                        <div className="mt-3 flex items-center justify-between text-[11.5px] text-ink-500">
                          <span className="flex items-center gap-1.5">
                            <Icon name="clock" size={13} />
                            {guide.readingMinutes} دقائق
                          </span>
                          <span className="flex items-center gap-1 font-bold text-brand-700">
                            اقرأ
                            <Icon name="arrowLeft" size={13} />
                          </span>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
            </ul>
          </>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl border border-ink-100 bg-paper p-5">
          <Icon name="headset" size={20} className="text-brand-700" />
          <p className="text-[12.5px] leading-6 text-ink-600">
            لم تجد إجابة لحالتك؟ أرسل وصف النظام وصورة الملصق وسنرشدك للخطوة الصحيحة.
          </p>
          <Link
            to="/help/contact"
            className="ms-auto inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[12.5px] font-bold text-white transition hover:bg-ink-800"
          >
            راسل الفريق الفني
          </Link>
        </div>
      </div>
    </div>
  );
}
