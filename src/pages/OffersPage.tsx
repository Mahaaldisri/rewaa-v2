import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/common/States";
import { ProductRail } from "@/components/product/ProductCard";
import { contentApi } from "@/services/contentApi";
import { catalogApi } from "@/services/catalogApi";
import { useAsync } from "@/hooks/useAsync";
import { useCountdown } from "@/hooks/useCountdown";
import { summariesToRelated } from "@/lib/product-view";
import { offersSchema, usePageSeo } from "@/lib/seo";
import { useStore } from "@/store/StoreProvider";
import { cn } from "@/utils/cn";
import type { Offer, OfferType } from "@/types/content";

const TYPE_LABELS: Record<OfferType, string> = {
  product: "خصم منتج",
  bundle: "باقة",
  installation: "تركيب",
  maintenance: "صيانة",
  coupon: "كوبون",
  seasonal: "موسمي",
};

const TYPE_TONES: Record<Offer["tone"], string> = {
  danger: "from-danger-soft/70 to-surface border-danger/20",
  aqua: "from-aqua-50 to-surface border-aqua-200",
  brand: "from-brand-50 to-surface border-brand-200",
  flow: "from-flow-50 to-surface border-flow-200",
};

const TYPE_BADGE: Record<Offer["tone"], "danger" | "aqua" | "brand" | "success"> = {
  danger: "danger",
  aqua: "aqua",
  brand: "brand",
  flow: "success",
};

export function OffersPage() {
  const [filter, setFilter] = useState<OfferType | "all">("all");
  const { pushToast } = useStore();

  const offers = useAsync(() => contentApi.listOffers(), []);
  const discounted = useAsync(() => catalogApi.collections(), []);

  const live = offers.data?.live ?? [];
  const expired = offers.data?.expired ?? [];

  usePageSeo({
    title: "عروض رواء | خصومات على أنظمة التنقية والخدمات",
    description:
      "أحدث عروض رواء على أنظمة تنقية المياه، أطقم الشمعات، خدمات التركيب وباقات الصيانة — مع شروط كل عرض ومدته.",
    canonical: "/offers",
    image: discounted.data?.discounted[0]?.image,
    jsonLd: live.length > 0 ? [offersSchema(live)] : [],
  });

  const visibleLive = useMemo(
    () => (filter === "all" ? live : live.filter((offer) => offer.type === filter)),
    [live, filter]
  );
  const visibleExpired = useMemo(
    () => (filter === "all" ? expired : expired.filter((offer) => offer.type === filter)),
    [expired, filter]
  );

  const copyCode = async (offer: Offer) => {
    if (!offer.code) return;
    try {
      await navigator.clipboard.writeText(offer.code);
      pushToast({ tone: "success", title: "تم نسخ الكوبون", description: `استخدم ${offer.code} عند إتمام الطلب.` });
    } catch {
      pushToast({ tone: "info", title: `كوبون العرض: ${offer.code}`, description: "انسخه يدويًا واستخدمه في السلة." });
    }
  };

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "العروض", href: "/offers" }]} />
        </div>
      </div>

      {/* Hero */}
      <section className="bg-ink-950 text-white">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_80%_-20%,rgba(34,169,224,0.28),transparent_70%)]" />
          <div className="container-x relative py-10">
            <Badge tone="danger" solid icon="ticket">
              عروض سارية
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-[34px]">
              عروض رواء على الأنظمة والخدمات
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-7 text-ink-200">
              كل عرض هنا مرتبط بتاريخ انتهاء واضح، وتظهر شروطه كاملة قبل الشراء. تُطبَّق خصومات الكوبونات في
              السلة تلقائيًا بعد إدخال الرمز.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/c/water-filters"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-aqua-400 px-5 text-[13px] font-bold text-ink-950 transition hover:bg-aqua-300"
              >
                تسوّق الأنظمة
                <Icon name="arrowLeft" size={15} />
              </Link>
              <Link
                to="/services/contracts"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-5 text-[13px] font-bold text-white transition hover:bg-white/10"
              >
                باقات الصيانة السنوية
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "product", "bundle", "installation", "maintenance", "coupon"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition",
                filter === key
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-ink-200 bg-surface text-ink-600 hover:border-brand-200 hover:text-brand-700"
              )}
            >
              {key === "all" ? "كل العروض" : TYPE_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Live offers */}
        <div className="mt-6 space-y-6">
          {offers.loading && !offers.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : offers.error && !offers.loading ? (
            <ErrorState onRetry={offers.retry} retrying={offers.loading} />
          ) : visibleLive.length === 0 ? (
            <EmptyState
              icon="ticket"
              title="لا توجد عروض سارية في هذا التصنيف حاليًا"
              description="جرّب تصنيفًا آخر، أو تصفّح المنتجات المخفّضة — الخصومات المباشرة على المنتجات متاحة دائمًا."
              action={{ label: "المنتجات المخفّضة", href: "/c/water-filters" }}
            />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {visibleLive.map((offer) => (
                <li key={offer.id}>
                  <OfferCard offer={offer} onCopyCode={() => void copyCode(offer)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Discounted products */}
        {discounted.data && discounted.data.discounted.length > 0 && (
          <div className="mt-12">
            <SectionHeading
              eyebrow="خصومات مباشرة"
              title="منتجات بسعر مخفّض"
              description="أسعار مخفّضة مطبّقة في صفحة المنتج مباشرة، بدون الحاجة لكوبون."
              action={{ label: "كل العروض", href: "/offers" }}
            />
            <ProductRail
              id="offers-discounted"
              title="منتجات بسعر مخفّض"
              items={summariesToRelated(discounted.data.discounted)}
            />
          </div>
        )}

        {/* Expired offers */}
        {visibleExpired.length > 0 && (
          <section className="mt-12">
            <SectionHeading
              eyebrow="انتهت مدتها"
              title="عروض منتهية"
              description="نحفظها هنا للشفافية — لا يمكن تطبيق هذه الأسعار أو الكوبونات بعد تاريخ الانتهاء."
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleExpired.map((offer) => (
                <li
                  key={offer.id}
                  className="rounded-xl border border-ink-100 bg-paper p-4 opacity-80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[13.5px] font-bold text-ink-700 line-through decoration-ink-300">
                      {offer.title}
                    </span>
                    <Badge tone="neutral" icon="clock">
                      منتهي
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-ink-500">
                    انتهى العرض بتاريخ{" "}
                    {offer.endsAt
                      ? new Date(offer.endsAt).toLocaleDateString("ar-SA-u-nu-latn", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                    .
                  </p>
                  <Link
                    to={offer.href ?? "/c/water-filters"}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700"
                  >
                    تصفّح البدائل المتاحة حاليًا
                    <Icon name="arrowLeft" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Offer terms */}
        <section className="mt-12 rounded-xl border border-ink-100 bg-surface p-6">
          <h2 className="font-display text-[16px] font-extrabold text-ink-950">شروط عامة لكل العروض</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {[
              "لا يمكن الجمع بين كوبونين على الطلب نفسه إلا إذا ذُكر خلاف ذلك في شروط العرض.",
              "الأسعار معروضة شامل الضريبة، ويُحسب الخصم قبل ضريبة القيمة المضافة.",
              "عروض التركيب تشمل النطاق المخدوم فقط، وتُحتسب رسوم تنقّل خارج النطاق.",
              "الكميات محدودة بحسب المخزون، وقد ينتهي العرض قبل تاريخه عند نفاد الكمية.",
            ].map((term) => (
              <li key={term} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                <Icon name="info" size={14} className="mt-1 shrink-0 text-aqua-600" />
                {term}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-ink-500">
            لأي استفسار عن عرض أو كوبون، تواصل مع خدمة العملاء على واتساب وسنتحقق من حالة العرض في طلبك.
          </p>
        </section>
      </div>
    </div>
  );
}

function OfferCard({ offer, onCopyCode }: { offer: Offer; onCopyCode: () => void }) {
  const countdown = useCountdown(offer.endsAt ?? "");

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border bg-gradient-to-bl p-5 shadow-hair",
        TYPE_TONES[offer.tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone={TYPE_BADGE[offer.tone]}>{TYPE_LABELS[offer.type]}</Badge>
          <h2 className="mt-2.5 font-display text-[16px] font-extrabold leading-7 text-ink-950">{offer.title}</h2>
          <p className="mt-1 text-[12.5px] font-semibold text-ink-600">{offer.subtitle}</p>
        </div>
        {offer.savingsLabel && (
          <span className="shrink-0 rounded-lg bg-ink-950 px-3 py-2 text-center font-display text-[12px] font-bold text-aqua-300">
            {offer.savingsLabel}
          </span>
        )}
      </div>

      <p className="mt-3 text-[12.5px] leading-6 text-ink-600">{offer.description}</p>

      {offer.endsAt && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-lg border border-ink-150 bg-surface/80 px-3.5 py-2.5">
          <Icon name="clock" size={15} className="text-danger" />
          {countdown.isExpired ? (
            <span className="text-[12px] font-bold text-danger">انتهى العرض</span>
          ) : (
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink-800 tabular-nums">
              <span>ينتهي بعد</span>
              {[
                { value: countdown.days, label: "يوم" },
                { value: countdown.hours, label: "ساعة" },
                { value: countdown.minutes, label: "دقيقة" },
                { value: countdown.seconds, label: "ثانية" },
              ].map((unit) => (
                <span key={unit.label} className="rounded-md bg-ink-950 px-2 py-1 text-white">
                  {String(unit.value).padStart(2, "0")}
                  <span className="ms-1 text-[10px] font-medium text-ink-300">{unit.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {offer.bundleItems && offer.bundleItems.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {offer.bundleItems.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-[12px] text-ink-600">
              <Icon name="check" size={13} className="text-flow-600" />
              {item.slug ? (
                <Link to={`/p/${item.slug}`} className="font-semibold text-ink-700 underline decoration-dotted">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      )}

      {offer.code && (
        <button
          type="button"
          onClick={onCopyCode}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-brand-300 bg-brand-50/60 px-3.5 py-2.5 text-start transition hover:bg-brand-100/70"
        >
          <span className="text-[12px] font-semibold text-brand-900">
            كوبون الخصم: <span className="font-mono font-extrabold tracking-wider">{offer.code}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-700">
            <Icon name="copy" size={14} />
            نسخ
          </span>
        </button>
      )}

      <details className="mt-3 text-[12px] text-ink-600">
        <summary className="cursor-pointer font-bold text-ink-700">شروط العرض</summary>
        <ul className="mt-2 space-y-1.5">
          {offer.terms.map((term) => (
            <li key={term} className="flex items-start gap-1.5">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" />
              {term}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-auto pt-4">
        <Link
          to={offer.href ?? "/c/water-filters"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
        >
          {offer.ctaLabel}
          <Icon name="arrowLeft" size={15} />
        </Link>
      </div>
    </article>
  );
}
