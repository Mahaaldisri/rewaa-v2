import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { Icon, type IconName } from "./Icon";
import type { BadgeTone } from "@/types/product";

/* ------------------------------- Badge -------------------------------- */

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  aqua: "bg-aqua-50 text-aqua-800 ring-aqua-200",
  danger: "bg-danger-soft text-danger ring-danger/20",
  success: "bg-success-soft text-success ring-success/20",
  neutral: "bg-ink-50 text-ink-700 ring-ink-200",
  info: "bg-info-soft text-info ring-info/20",
};

const BADGE_SOLID: Record<BadgeTone, string> = {
  brand: "bg-brand-700 text-white ring-brand-800",
  aqua: "bg-aqua-500 text-ink-950 ring-aqua-600",
  danger: "bg-danger text-white ring-danger",
  success: "bg-success text-white ring-success",
  neutral: "bg-ink-900 text-white ring-ink-900",
  info: "bg-info text-white ring-info",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  solid?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ tone = "neutral", icon, children, solid = false, size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold ring-1 ring-inset whitespace-nowrap",
        size === "sm" ? "px-2 py-[3px] text-[11px]" : "px-2.5 py-1 text-xs",
        solid ? BADGE_SOLID[tone] : BADGE_TONES[tone],
        className
      )}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 12 : 14} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* -------------------------------- Stars -------------------------------- */

interface StarsProps {
  value: number;
  size?: number;
  className?: string;
}

/** Fractional star rating rendered with an RTL-safe clipped overlay. */
export function Stars({ value, size = 15, className }: StarsProps) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const gap = 2;
  const totalWidth = size * 5 + gap * 4;

  const row = (filled: boolean) => (
    <span className="flex items-center" style={{ gap, width: totalWidth }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          name="star"
          filled={filled}
          size={size}
          className={filled ? "text-aqua-500" : "text-ink-200"}
          strokeWidth={filled ? 0 : 1.4}
        />
      ))}
    </span>
  );

  return (
    <span
      className={cn("relative inline-block align-middle", className)}
      style={{ width: totalWidth, height: size }}
      role="img"
      aria-label={`التقييم ${value} من 5`}
    >
      {row(false)}
      <span
        className="absolute inset-y-0 start-0 overflow-hidden"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        <span style={{ width: totalWidth }} className="block">
          {row(true)}
        </span>
      </span>
    </span>
  );
}

interface InteractiveStarsProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  name?: string;
}

export function InteractiveStars({ value, onChange, size = 26, name = "rating" }: InteractiveStarsProps) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="تقييمك">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} من 5`}
          name={name}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(star)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(star)}
          className="grid place-items-center rounded-md p-0.5 transition-transform hover:scale-110 active:scale-95"
        >
          <Icon
            name="star"
            filled={star <= active}
            size={size}
            className={star <= active ? "text-aqua-500" : "text-ink-200"}
            strokeWidth={star <= active ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Skeletons ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden="true" />;
}

/* --------------------------- Section heading --------------------------- */

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Either a custom node or a ready-made link descriptor. */
  action?: ReactNode | { label: string; href: string };
  id?: string;
}

export function SectionHeading({ eyebrow, title, description, action, id }: SectionHeadingProps) {
  const renderedAction =
    action && typeof action === "object" && "href" in (action as Record<string, unknown>) ? (
      <Link
        to={(action as { label: string; href: string }).href}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
      >
        {(action as { label: string; href: string }).label}
        <Icon name="arrowLeft" size={14} />
      </Link>
    ) : (
      (action as ReactNode)
    );

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-aqua-600">
            <span className="h-px w-6 bg-aqua-400" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="text-xl font-extrabold text-ink-950 sm:text-[26px]">
          {title}
        </h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">{description}</p>}
      </div>
      {renderedAction}
    </div>
  );
}

/* ------------------------------ Disclosure ----------------------------- */

interface DisclosureProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: IconName;
  meta?: ReactNode;
  className?: string;
  id?: string;
}

/** Accessible accordion row used by mobile tabs, description and policies. */
export function Disclosure({ title, children, defaultOpen = false, icon, meta, className, id }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id ?? "panel"}-body`;
  const buttonId = `${id ?? "panel"}-button`;

  return (
    <div className={cn("border-b border-ink-100 last:border-b-0", className)}>
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-3 py-4 text-start transition-colors hover:text-brand-700"
        >
          {icon && (
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
                open ? "bg-brand-700 text-white" : "bg-ink-50 text-ink-500 group-hover:bg-brand-50 group-hover:text-brand-700"
              )}
            >
              <Icon name={icon} size={16} />
            </span>
          )}
          <span className="flex-1 font-display text-[15px] font-bold text-ink-900 group-hover:text-brand-800">
            {title}
          </span>
          {meta && <span className="text-xs text-ink-400">{meta}</span>}
          <Icon
            name="chevronDown"
            size={18}
            className={cn("shrink-0 text-ink-400 transition-transform duration-300", open && "rotate-180 text-brand-700")}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="overflow-hidden pb-5 text-sm leading-7 text-ink-600 animate-fade"
      >
        {children}
      </div>
    </div>
  );
}
