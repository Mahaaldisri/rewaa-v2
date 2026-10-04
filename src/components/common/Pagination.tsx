import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
  /** Compact variant used on mobile. */
  compact?: boolean;
}

/** Numbered pagination with ellipsis, 44px tap targets and RTL-safe arrows. */
export function Pagination({ page, totalPages, onChange, className, compact = false }: PaginationProps) {
  if (totalPages <= 1) return null;

  const windowSize = compact ? 1 : 2;
  const pages: (number | "gap")[] = [];
  for (let index = 1; index <= totalPages; index += 1) {
    if (index === 1 || index === totalPages || Math.abs(index - page) <= windowSize) {
      pages.push(index);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }

  const buttonBase =
    "grid size-10 place-items-center rounded-md border text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav className={cn("flex items-center justify-center gap-1.5", className)} aria-label="التنقل بين الصفحات">
      <button
        type="button"
        className={cn(buttonBase, "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50")}
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="الصفحة السابقة"
      >
        <Icon name="chevronRight" size={16} />
      </button>

      {pages.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="grid size-10 place-items-center text-ink-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              buttonBase,
              item === page
                ? "border-brand-700 bg-brand-700 text-white shadow-brand"
                : "border-ink-200 bg-surface text-ink-700 hover:bg-ink-50"
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className={cn(buttonBase, "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50")}
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="الصفحة التالية"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
    </nav>
  );
}

interface LoadMoreProps {
  onClick: () => void;
  loading?: boolean;
  remaining: number;
  className?: string;
}

/** "Load more" alternative used when the visitor prefers a continuous list. */
export function LoadMore({ onClick, loading = false, remaining, className }: LoadMoreProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-6 text-[13px] font-bold text-ink-800 transition hover:border-brand-300 hover:bg-ink-50 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" aria-hidden="true" />
            جارٍ التحميل…
          </>
        ) : (
          <>
            <Icon name="grid" size={15} />
            عرض المزيد من المنتجات
          </>
        )}
      </button>
      <p className="text-[11.5px] text-ink-500">يتبقى {remaining} منتجًا</p>
    </div>
  );
}
