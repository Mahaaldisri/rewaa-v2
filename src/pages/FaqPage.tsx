import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { EmptyState, ContentSkeleton } from "@/components/common/States";
import { contentApi } from "@/services/contentApi";
import { FAQ_GROUP_LABELS, type FaqGroupId } from "@/types/content";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, faqSchema, usePageSeo } from "@/lib/seo";
import { cn } from "@/utils/cn";
import { whatsappLink } from "@/config/site";

const GROUP_ORDER: FaqGroupId[] = [
  "products",
  "installation",
  "maintenance",
  "water-quality",
  "shipping",
  "payment",
  "warranty",
  "returns",
  "commercial",
];

const QUICK_LINKS = [
  { label: "تتبّع طلبك", href: "/help/track", icon: "truck" as const },
  { label: "طلب ضمان", href: "/help/warranty-claim", icon: "shield" as const },
  { label: "الإرجاع", href: "/help/returns", icon: "rotate" as const },
  { label: "حجز فني", href: "/services/book", icon: "calendar" as const },
];

/** Central FAQ hub — `/faq`. */
export function FaqPage() {
  const faqs = useAsync(() => contentApi.listFaqs(), []);
  const [group, setGroup] = useState<FaqGroupId | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = faqs.data ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter(
      (faq) =>
        (group === "all" || faq.group === group) &&
        (!needle || `${faq.question} ${faq.answer}`.toLowerCase().includes(needle))
    );
  }, [faqs.data, group, query]);

  usePageSeo({
    title: "الأسئلة الشائعة | رواء",
    description:
      "إجابات مباشرة عن اختيار الأنظمة، التركيب، الصيانة، الشمعات، الشحن، الدفع، الضمان والإرجاع — بلا وعود مبالغ فيها.",
    canonical: "/faq",
    jsonLd:
      faqs.data && faqs.data.length > 0
        ? [
            breadcrumbSchema([
              { label: "الرئيسية", href: "/" },
              { label: "الأسئلة الشائعة", href: "/faq" },
            ]),
            faqSchema(
              (group === "all" ? (faqs.data ?? []) : filtered).slice(0, 12).map((faq) => ({
                question: faq.question,
                answer: faq.answer,
              }))
            ),
          ]
        : [],
  });

  const groups = useMemo(() => {
    const counts = new Map<FaqGroupId, number>();
    (faqs.data ?? []).forEach((faq) => counts.set(faq.group, (counts.get(faq.group) ?? 0) + 1));
    return GROUP_ORDER.filter((id) => (counts.get(id) ?? 0) > 0).map((id) => ({
      id,
      label: FAQ_GROUP_LABELS[id],
      count: counts.get(id) ?? 0,
    }));
  }, [faqs.data]);

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "الأسئلة الشائعة", href: "/faq" }]} />
        </div>
      </div>

      <section className="border-b border-ink-100 bg-surface">
        <div className="container-x py-9">
          <Badge tone="aqua" icon="info">
            مركز المساعدة
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">الأسئلة الشائعة</h1>
          <p className="mt-2.5 max-w-3xl text-[13.5px] leading-7 text-ink-600">
            جمعنا أكثر ما يسأل عنه العملاء في الخدمة والتركيب والصيانة. إن لم تجد سؤالك، اسألنا مباشرة وسنضيف الإجابة
            إن كانت تفيد غيرك.
          </p>

          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Icon name="search" size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في الأسئلة… مثال: تركيب، شمعات، شحن"
                aria-label="ابحث في الأسئلة الشائعة"
                className="h-11 w-full rounded-lg border border-ink-200 bg-surface ps-10 pe-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGroup("all")}
              aria-pressed={group === "all"}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[12px] font-bold transition",
                group === "all" ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
              )}
            >
              كل الأسئلة ({(faqs.data ?? []).length})
            </button>
            {groups.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGroup(item.id)}
                aria-pressed={group === item.id}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-[12px] font-bold transition",
                  group === item.id ? "border-brand-700 bg-brand-700 text-white" : "border-ink-200 bg-surface text-ink-600"
                )}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="min-w-0">
            {faqs.loading && !faqs.data ? (
              <ContentSkeleton rows={6} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="search"
                title="لا يوجد سؤال مطابق"
                description="جرّب كلمة أخرى، أو اسأل الفريق مباشرة وسنرد عليك وسنضيف السؤال إن كان مفيدًا للجميع."
                action={{ label: "اسأل الفريق", href: "/help/contact" }}
              />
            ) : (
              <Accordion
                allowMultiple={false}
                items={filtered.map((faq) => ({
                  id: faq.id,
                  title: faq.question,
                  meta: `${FAQ_GROUP_LABELS[faq.group]}${faq.relatedGuideSlug ? " · مقال مرتبط" : ""}`,
                  content: (
                    <div>
                      <p>{faq.answer}</p>
                      {faq.relatedGuideSlug && (
                        <Link
                          to={`/guides/${faq.relatedGuideSlug}`}
                          className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700 underline decoration-dotted"
                        >
                          اقرأ الدليل التفصيلي
                          <Icon name="arrowLeft" size={13} />
                        </Link>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <div className="rounded-xl border border-flow-200 bg-flow-50 p-5">
              <h2 className="font-display text-[14px] font-extrabold text-flow-900">لم تجد إجابتك؟</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-flow-800">
                اكتب سؤالك على واتساب وسيجيبك أحد الفنيين أو فريق الخدمة، وإن كان السؤال متكررًا سنضيفه هنا.
              </p>
              <a
                href={whatsappLink("لدي سؤال غير موجود في صفحة الأسئلة الشائعة:")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
              >
                <Icon name="whatsapp" size={15} />
                اسأل على واتساب
              </a>
            </div>

            <div className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">روابط سريعة</h2>
              <ul className="mt-3 space-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="flex items-center justify-between rounded-lg border border-ink-150 bg-paper px-3 py-2.5 text-[12.5px] font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-ink-50"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name={link.icon} size={15} className="text-brand-600" />
                        {link.label}
                      </span>
                      <Icon name="chevronLeft" size={15} className="text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-ink-100 bg-paper p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">السياسات الرسمية</h2>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {[
                  { label: "سياسة الخصوصية", href: "/legal/privacy" },
                  { label: "الشروط والأحكام", href: "/legal/terms" },
                  { label: "سياسة الشحن", href: "/legal/shipping" },
                  { label: "سياسة الإرجاع", href: "/legal/returns" },
                  { label: "سياسة الضمان", href: "/legal/warranty" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link to={item.href} className="text-ink-600 transition hover:text-brand-700">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
