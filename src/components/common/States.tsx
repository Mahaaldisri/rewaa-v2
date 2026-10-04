import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

/* ------------------------------ Empty state ------------------------------ */
interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href: string };
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon = "search",
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-surface/70 text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
        className
      )}
    >
      <span className="grid size-14 place-items-center rounded-xl bg-ink-50 text-ink-400 ring-1 ring-inset ring-ink-100">
        <Icon name={icon} size={26} />
      </span>
      <h2 className={cn("mt-4 font-display font-extrabold text-ink-950", compact ? "text-[15px]" : "text-lg")}>{title}</h2>
      {description && <p className="mt-2 max-w-md text-[13px] leading-6 text-ink-500">{description}</p>}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action &&
            (action.href ? (
              <Link
                to={action.href}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 font-display text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98]"
              >
                {action.label}
                <Icon name="arrowLeft" size={15} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 font-display text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98]"
              >
                {action.label}
              </button>
            ))}
          {secondaryAction && (
            <Link
              to={secondaryAction.href}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
}

/* ------------------------------ Error state ------------------------------ */
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "تعذّر تحميل البيانات",
  description = "حدث خطأ أثناء جلب المحتوى. تحقق من الاتصال وحاول مرة أخرى.",
  onRetry,
  retrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger-soft/40 text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
        className
      )}
    >
      <span className="grid size-14 place-items-center rounded-xl bg-surface text-danger ring-1 ring-inset ring-danger/20">
        <Icon name="alert" size={26} />
      </span>
      <h2 className={cn("mt-4 font-display font-extrabold text-ink-950", compact ? "text-[15px]" : "text-lg")}>{title}</h2>
      <p className="mt-2 max-w-md text-[13px] leading-6 text-ink-600">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[13px] font-bold text-white transition hover:bg-ink-800 disabled:opacity-60"
          >
            <Icon name="refresh" size={15} className={cn(retrying && "animate-spin")} />
            {retrying ? "جارٍ المحاولة…" : "إعادة المحاولة"}
          </button>
        )}
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

/* ----------------------------- Loading state ----------------------------- */
export function LoadingState({ label = "جارٍ التحميل…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-10 text-[13px] text-ink-500", className)} role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Skeleton grid used while a product listing loads. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-ink-100 bg-surface p-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-2/3" />
          <Skeleton className="mt-4 h-5 w-24" />
          <Skeleton className="mt-3 h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Generic content skeleton (guides, services, account sections). */
export function ContentSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={cn("h-4", index % 3 === 0 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
