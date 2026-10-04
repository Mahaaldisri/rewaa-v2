import { Skeleton } from "@/components/ui/primitives";

/** Full-page skeleton — mirrors the real layout so nothing jumps on load. */
export function ProductPageSkeleton() {
  return (
    <div className="container-x py-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-3.5 w-2/3 max-w-md" />

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-8">
        {/* Gallery */}
        <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
          <Skeleton className="aspect-[4/5] w-full flex-1 rounded-xl" />
          <div className="flex gap-2 lg:flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-[62px] shrink-0 rounded-lg lg:size-[82px]" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>

          <Skeleton className="h-12 w-56" />

          <div className="space-y-2 rounded-lg border border-ink-100 bg-surface p-4">
            <Skeleton className="h-9 w-full rounded-md bg-danger-soft" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-20 w-full rounded-md" />
            <div className="flex gap-2 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-16 rounded-md" />
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-ink-100 bg-surface p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-11 w-12 rounded-md" />
              <Skeleton className="h-11 flex-1 rounded-lg" />
            </div>
          </div>

          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <div className="mt-10 space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Friendly failure state for load errors / 404s. */
export function ProductErrorState({
  title,
  description,
  onRetry,
  retrying,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="container-x py-16 sm:py-24">
      <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-ink-100 bg-surface p-8 text-center shadow-lift">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_200px_at_50%_0%,rgba(179,38,30,0.08),transparent_70%)]" />
        <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-ink-950 text-aqua-300 shadow-lift">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 8.5v4.2M12 16.2h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <h1 className="relative mt-5 font-display text-xl font-extrabold text-ink-950">{title}</h1>
        <p className="relative mt-2 text-[13.5px] leading-6 text-ink-500">{description}</p>

        <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 font-display text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:opacity-70"
          >
            {retrying && (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            إعادة المحاولة
          </button>
          <a
            href="/c/water-filters"
            className="inline-flex h-11 items-center rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50"
          >
            تصفّح فلاتر المياه
          </a>
        </div>

        <p className="relative mt-5 text-[11.5px] text-ink-400">
          تحتاج مساعدة؟ اتصل على <a href="tel:920001234" className="font-semibold text-brand-700">920001234</a> من 8 ص إلى 10 م
        </p>
      </div>
    </div>
  );
}
