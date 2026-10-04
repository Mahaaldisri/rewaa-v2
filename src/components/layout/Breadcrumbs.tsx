import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Crumb {
  label: string;
  href: string;
}

/**
 * RTL breadcrumb trail. Uses logical `start/end` utilities so the same markup
 * renders correctly for a future English (LTR) locale.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="مسار التنقل" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12.5px] text-ink-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.href}-${index}`} className="flex min-w-0 items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="truncate font-semibold text-ink-800">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="rounded-xs transition-colors hover:text-brand-700 hover:underline decoration-brand-300 underline-offset-4"
                >
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <Icon
                  name="chevronLeft"
                  size={13}
                  className="shrink-0 text-ink-300 rtl:rotate-0 ltr:rotate-180"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
