import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { contentApi } from "@/services/contentApi";
import { track } from "@/services/analytics";
import { useAsync } from "@/hooks/useAsync";
import type { Announcement } from "@/types/content";
import { cn } from "@/utils/cn";

const TONES: Record<Announcement["tone"], { card: string; icon: string; cta: string }> = {
  brand: { card: "border-brand-100 bg-brand-50/60", icon: "bg-brand-100 text-brand-800", cta: "text-brand-700" },
  aqua: { card: "border-aqua-100 bg-aqua-50/70", icon: "bg-aqua-100 text-aqua-800", cta: "text-aqua-800" },
  success: { card: "border-flow-200 bg-flow-50", icon: "bg-flow-100 text-flow-800", cta: "text-flow-800" },
  warning: { card: "border-warning/25 bg-warning-soft", icon: "bg-warning/15 text-warning", cta: "text-ink-800" },
};

/**
 * Homepage notices.
 *
 * Renders nothing at all when the service returns no live notice (or while the
 * first request is in flight), so the section can never leave an empty gap or a
 * permanent skeleton behind.
 */
export function Announcements() {
  const { data } = useAsync(() => contentApi.listAnnouncements(), []);
  const viewedRef = useRef<Set<string>>(new Set());
  const items = (data ?? []).slice(0, 3);

  useEffect(() => {
    items.forEach((item) => {
      if (viewedRef.current.has(item.id)) return;
      viewedRef.current.add(item.id);
      track("announcement_view", { announcement_id: item.id, kind: item.kind, featured: Boolean(item.featured) });
    });
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className="container-x pt-4" aria-label="تنبيهات المتجر">
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const tone = TONES[item.tone];
          const content = (
            <>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone.icon)}>
                <Icon name={item.icon as IconName} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-ink-950">{item.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-5 text-ink-600">{item.body}</span>
                {item.ctaLabel && item.href && (
                  <span className={cn("mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold", tone.cta)}>
                    {item.ctaLabel}
                    <Icon name="arrowLeft" size={12} />
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li key={item.id} className={cn(item.featured && "sm:col-span-2 lg:col-span-1")}>
              {item.href ? (
                <Link
                  to={item.href}
                  onClick={() =>
                    track("announcement_click", { announcement_id: item.id, kind: item.kind, target: item.href })
                  }
                  className={cn(
                    "flex h-full items-start gap-3 rounded-xl border p-3 transition hover:shadow-hair",
                    tone.card
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div className={cn("flex h-full items-start gap-3 rounded-xl border p-3", tone.card)}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
