import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Product, ProductImage, Review } from "@/types/product";
import { reviewsApi, type ReviewQuery } from "@/services/api";
import { formatNumber, formatRelativeDate } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useUi";
import { useStore } from "@/store/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { InteractiveStars, SectionHeading, Skeleton, Stars } from "@/components/ui/primitives";
import { Lightbox } from "@/components/product/Lightbox";
import { cn } from "@/utils/cn";

const SORTS: { id: NonNullable<ReviewQuery["sort"]>; label: string }[] = [
  { id: "recent", label: "الأحدث" },
  { id: "helpful", label: "الأكثر فائدة" },
  { id: "highest", label: "الأعلى تقييمًا" },
  { id: "lowest", label: "الأقل تقييمًا" },
];

const PAGE_SIZE = 3;

/** Converts a plain review photo URL into the shared ProductImage shape. */
function toImage(url: string, i: number): ProductImage {
  return { id: `rev-img-${i}-${url.slice(-8)}`, alt: `صورة من تقييم عميل ${i + 1}`, thumb: url, medium: url, large: url, zoom: url, ratio: "square" };
}

function ReviewSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-ink-100 bg-surface p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

export function ReviewsSection({ product }: { product: Product }) {
  const { pushToast } = useStore();
  const [items, setItems] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<NonNullable<ReviewQuery["sort"]>>("recent");
  const [rating, setRating] = useState<number | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withImagesOnly, setWithImagesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 320);

  const [helpfulIds, setHelpfulIds] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{ images: ProductImage[]; index: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ rating: 0, title: "", body: "", author: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const res = await reviewsApi.list({
          productId: product.id,
          sort,
          rating,
          verifiedOnly,
          withImagesOnly,
          search: debouncedSearch,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setTotal(res.total);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      } catch {
        setError("تعذّر تحميل التقييمات في الوقت الحالي.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [product.id, sort, rating, verifiedOnly, withImagesOnly, debouncedSearch]
  );

  useEffect(() => {
    setPage(1);
    void load(1, false);
  }, [load]);

  const breakdown = useMemo(() => {
    const entries = [5, 4, 3, 2, 1] as const;
    const sum = entries.reduce((acc, star) => acc + product.ratingBreakdown[star], 0) || 1;
    return entries.map((star) => ({
      star,
      count: product.ratingBreakdown[star],
      percent: Math.round((product.ratingBreakdown[star] / sum) * 100),
    }));
  }, [product.ratingBreakdown]);

  const markHelpful = async (review: Review) => {
    const localKey = review.id;
    if (helpfulIds[localKey] !== undefined) {
      pushToast({ tone: "info", title: "صوتّ على هذه المراجعة مسبقًا", duration: 2000 });
      return;
    }
    setHelpfulIds((prev) => ({ ...prev, [localKey]: review.helpfulCount + 1 }));
    try {
      await reviewsApi.markHelpful(review.id);
      setItems((prev) =>
        prev.map((item) => (item.id === review.id ? { ...item, helpfulCount: item.helpfulCount + 1 } : item))
      );
      pushToast({ tone: "success", title: "شكرًا! تم تسجيل صوتك", duration: 2000 });
    } catch {
      setHelpfulIds((prev) => {
        const next = { ...prev };
        delete next[localKey];
        return next;
      });
      pushToast({ tone: "error", title: "تعذّر تسجيل الصوت", description: "حاول مرة أخرى." });
    }
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.rating === 0) {
      pushToast({ tone: "warning", title: "اختر عدد النجوم أولًا" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await reviewsApi.submit(product.id, draft);
      setItems((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setDraft({ rating: 0, title: "", body: "", author: "" });
      setFormOpen(false);
      pushToast({
        tone: "success",
        title: "شكرًا لك! تم إرسال تقييمك",
        description: "سيظهر للجمهور بعد المراجعة خلال 24 ساعة.",
      });
    } catch {
      pushToast({ tone: "error", title: "تعذّر إرسال التقييم", description: "تحقق من اتصالك وحاول مجددًا." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="scroll-mt-24">
      <SectionHeading
        eyebrow="آراء العملاء"
        title="تقييمات المنتج"
        description="تقييمات موثّقة من عملاء اشتروا النظام وركّبوه فعليًا عبر رواء."
        action={
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            aria-expanded={formOpen}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
          >
            <Icon name="star" size={15} className="text-aqua-500" />
            شاركنا رأيك
          </button>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="relative overflow-hidden rounded-xl bg-ink-950 p-5 text-white shadow-lift">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_200px_at_80%_0%,rgba(192,145,47,0.28),transparent_70%)]" />
          <div className="relative">
            <p className="font-display text-[52px] font-extrabold leading-none tabular-nums text-aqua-300">
              {product.rating.toFixed(1)}
            </p>
            <div className="mt-2">
              <Stars value={product.rating} size={17} />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-300">
              مبني على {formatNumber(product.reviewCount)} تقييم موثّق
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-center">
              <div>
                <dt className="text-[11px] text-ink-300">ينصحون به</dt>
                <dd className="font-display text-[18px] font-bold text-white">94%</dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-300">جودة التركيب</dt>
                <dd className="font-display text-[18px] font-bold text-white">4.9</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-surface p-5 shadow-hair">
          <ul className="space-y-2">
            {breakdown.map((row) => {
              const isActive = rating === row.star;
              return (
                <li key={row.star}>
                  <button
                    type="button"
                    onClick={() => {
                      setRating(isActive ? "all" : row.star);
                      setPage(1);
                    }}
                    aria-pressed={isActive}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 transition",
                      isActive ? "bg-brand-50 ring-1 ring-inset ring-brand-200" : "hover:bg-ink-50"
                    )}
                  >
                    <span className="flex w-11 shrink-0 items-center gap-1 text-[12.5px] font-semibold text-ink-700">
                      {row.star}
                      <Icon name="star" size={12} filled className="text-aqua-500" />
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-700 ease-out",
                          isActive ? "bg-brand-600" : "bg-aqua-400"
                        )}
                        style={{ width: `${Math.max(2, row.percent)}%` }}
                      />
                    </span>
                    <span className="w-14 shrink-0 text-end text-[11.5px] tabular-nums text-ink-500">
                      {formatNumber(row.count)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Write a review */}
      {formOpen && (
        <form
          onSubmit={submitReview}
          className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-5 animate-slide-up"
        >
          <h3 className="mb-3 font-display text-[15px] font-bold text-ink-950">اكتب تقييمك</h3>
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <InteractiveStars value={draft.rating} onChange={(v) => setDraft((d) => ({ ...d, rating: v }))} />
            <span className="text-[12.5px] text-ink-500">
              {draft.rating === 0 ? "اختر تقييمك من 5 نجوم" : `تقييمك: ${draft.rating} من 5`}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">الاسم</span>
              <input
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                placeholder="اسمك (اختياري)"
                className="h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">عنوان التقييم</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                required
                placeholder="مثال: تركيب سريع وفرق واضح في جودة المياه"
                className="h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">تفاصيل تجربتك</span>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              required
              rows={4}
              placeholder="حدّثنا عن جودة المياه بعد التركيب، وسرعة الفني، وقراءة TDS قبل وبعد…"
              className="w-full resize-y rounded-md border border-ink-200 bg-surface p-3 text-[13px] leading-6 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-700 px-5 font-display text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:opacity-70"
            >
              {submitting && <Icon name="refresh" size={16} className="animate-spin-slow" />}
              {submitting ? "جارٍ الإرسال…" : "إرسال التقييم"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex h-11 items-center rounded-md border border-ink-200 bg-surface px-4 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 bg-surface p-3 shadow-hair">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="تصفية حسب التقييم">
          {(["all", 5, 4, 3, 2, 1] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => {
                setRating(value as number | "all");
                setPage(1);
              }}
              aria-pressed={rating === value}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition",
                rating === value
                  ? "bg-ink-950 text-aqua-300"
                  : "bg-ink-50 text-ink-600 hover:bg-ink-100"
              )}
            >
              {value === "all" ? "الكل" : `${value} ★`}
            </button>
          ))}
        </div>

        <label className="relative ms-auto w-full sm:w-52">
          <Icon name="search" size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في التقييمات…"
            aria-label="بحث في التقييمات"
            className="h-9 w-full rounded-md border border-ink-200 bg-surface pe-3 ps-9 text-[12.5px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<ReviewQuery["sort"]>)}
            aria-label="ترتيب التقييمات"
            className="h-9 appearance-none rounded-md border border-ink-200 bg-surface pe-7 ps-3 text-[12.5px] font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={14} className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>

        <button
          type="button"
          onClick={() => {
            setVerifiedOnly((v) => !v);
            setPage(1);
          }}
          aria-pressed={verifiedOnly}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition",
            verifiedOnly ? "border-success/40 bg-success-soft text-success" : "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
          )}
        >
          <Icon name="badgeCheck" size={14} />
          مشتريات موثّقة
        </button>
        <button
          type="button"
          onClick={() => {
            setWithImagesOnly((v) => !v);
            setPage(1);
          }}
          aria-pressed={withImagesOnly}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition",
            withImagesOnly ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
          )}
        >
          <Icon name="camera" size={14} />
          مع صور
        </button>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {loading &&
          Array.from({ length: 2 }).map((_, i) => <ReviewSkeleton key={i} />)}

        {!loading && error && (
          <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-6 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface text-danger shadow-hair">
              <Icon name="alert" size={20} />
            </span>
            <p className="mt-3 font-display text-[14.5px] font-bold text-ink-900">{error}</p>
            <p className="mt-1 text-[12.5px] text-ink-500">قد يكون السبب انقطاع الاتصال أو ضغط على الخادم.</p>
            <button
              type="button"
              onClick={() => void load(1, false)}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-ink-950 px-4 py-2 text-[12.5px] font-semibold text-aqua-200 transition hover:bg-ink-900"
            >
              <Icon name="refresh" size={14} />
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink-50 text-ink-300">
              <Icon name="star" size={22} />
            </span>
            <p className="mt-3 font-display text-[15px] font-bold text-ink-900">لا توجد تقييمات مطابقة</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-5 text-ink-500">
              جرّب إزالة عوامل التصفية، أو كن أول من يشارك تجربته مع هذا المنتج.
            </p>
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRating("all");
                  setVerifiedOnly(false);
                  setWithImagesOnly(false);
                  setSearch("");
                }}
                className="rounded-md border border-ink-200 bg-surface px-4 py-2 text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                مسح عوامل التصفية
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="rounded-md bg-brand-700 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
              >
                أضف تقييمًا
              </button>
            </div>
          </div>
        )}

        {!loading &&
          items.map((review) => {
            const localHelpful = helpfulIds[review.id] ?? review.helpfulCount;
            return (
              <article
                key={review.id}
                className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair transition hover:shadow-card sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full font-display text-[15px] font-bold text-white"
                    style={{ background: `hsl(${review.avatarHue} 42% 34%)` }}
                    aria-hidden="true"
                  >
                    {review.author.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13px] font-bold text-ink-900">{review.author}</span>
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-success-soft px-1.5 py-0.5 text-[10.5px] font-bold text-success ring-1 ring-inset ring-success/20">
                          <Icon name="badgeCheck" size={11} strokeWidth={2.4} />
                          شراء موثّق
                        </span>
                      )}
                      <span className="text-[11px] text-ink-400">
                        {review.city} · {formatRelativeDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Stars value={review.rating} size={14} />
                      {review.variantLabel && (
                        <span className="rounded-xs bg-ink-50 px-1.5 py-0.5 text-[10.5px] text-ink-500">
                          {review.variantLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h4 className="mt-3 font-display text-[14px] font-bold text-ink-950">{review.title}</h4>
                <p className="mt-1.5 text-[13px] leading-7 text-ink-600 text-pretty">{review.body}</p>

                {review.images && review.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.images.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() =>
                          setLightbox({ images: review.images!.map(toImage), index: i })
                        }
                        className="size-20 overflow-hidden rounded-md ring-1 ring-ink-100 transition hover:ring-brand-300 hover:opacity-90"
                        aria-label={`تكبير صورة التقييم ${i + 1}`}
                      >
                        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {review.sellerReply && (
                  <div className="mt-3.5 rounded-lg border-s-2 border-brand-300 bg-ink-50/70 p-3">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-800">
                      <Icon name="store" size={13} />
                      رد {product.seller.name} · {formatRelativeDate(review.sellerReply.createdAt)}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-6 text-ink-600">{review.sellerReply.body}</p>
                  </div>
                )}

                <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                  <button
                    type="button"
                    onClick={() => void markHelpful(review)}
                    aria-pressed={helpfulIds[review.id] !== undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition active:scale-95",
                      helpfulIds[review.id] !== undefined
                        ? "border-brand-300 bg-brand-50 text-brand-800"
                        : "border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-800"
                    )}
                  >
                    <Icon name="thumbUp" size={13} filled={helpfulIds[review.id] !== undefined} />
                    مفيد ({formatNumber(localHelpful)})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      pushToast({
                        tone: "info",
                        title: "تم فتح نموذج الإبلاغ",
                        description: "يراجع فريق الجودة البلاغ خلال 24 ساعة.",
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-ink-400 transition hover:text-danger"
                  >
                    <Icon name="alert" size={13} />
                    إبلاغ
                  </button>
                </div>
              </article>
            );
          })}
      </div>

      {/* Load more */}
      {!loading && !error && items.length < total && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={async () => {
              const next = page + 1;
              setPage(next);
              await load(next, true);
            }}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-800 disabled:opacity-60"
          >
            {loadingMore ? (
              <Icon name="refresh" size={15} className="animate-spin-slow" />
            ) : (
              <Icon name="chevronDown" size={15} />
            )}
            {loadingMore ? "جارٍ التحميل…" : `عرض المزيد (${total - items.length} تقييمًا)`}
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <p className="mt-3 text-center text-[11.5px] text-ink-400">
          عرض {items.length} من {formatNumber(total)} تقييم مطابق للتصفية · إجمالي تقييمات المنتج{" "}
          {formatNumber(product.reviewCount)}
        </p>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          open
          alt="صور تقييمات العملاء"
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      )}
    </section>
  );
}
