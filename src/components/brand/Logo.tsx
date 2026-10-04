import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

/**
 * Rewaa brand mark — rebuilt as pure SVG (no raster asset, no network request).
 *
 * Construction: the letter "R" is used as a clip path, and the three identity
 * colours are painted inside it as flowing water bands:
 *   cyan  #22A9E0  → the left stream
 *   teal  #22B573  → the mid ribbon
 *   navy  #16306B  → the letterform body
 * The gaps between the bands are transparent, so the mark sits correctly on
 * both light and dark surfaces exactly like the original logo.
 */

const NAVY = "#16306B";
const CYAN = "#22A9E0";
const TEAL = "#22B573";

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const id = "rewaa-mark";
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          {/* Letter "R": outer silhouette + counter. clip-rule punches the hole. */}
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M8 6 H62 C87 6 104 21 104 43 C104 60 94 72 78 77 L113 114 H77 L47 80 H36 V114 H8 Z
               M36 30 V56 H58 C69 56 76 51 76 43 C76 35 69 30 58 30 Z"
          />
        </clipPath>
        <linearGradient id={`${id}-flow`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={CYAN} />
          <stop offset="48%" stopColor={TEAL} />
          <stop offset="100%" stopColor="#199e67" />
        </linearGradient>
      </defs>

      {/* The letterform is navy; the two water bands flow through it, separated
          by white slivers exactly like the printed logo. */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="120" height="120" fill={NAVY} />
        <path
          d="M59 -8 C39 30 29 70 31 128 H48 C46 70 56 30 76 -8 Z"
          fill={`url(#${id}-flow)`}
          stroke="#ffffff"
          strokeWidth="5"
        />
        <path
          d="M-8 -8 H54 C34 30 24 70 26 128 H-8 Z"
          fill={CYAN}
          stroke="#ffffff"
          strokeWidth="5"
        />
      </g>
    </svg>
  );
}

interface LogoProps {
  /** "dark" renders the wordmark in white for dark surfaces */
  tone?: "light" | "dark";
  compact?: boolean;
  className?: string;
  href?: string;
}

export function Logo({ tone = "light", compact = false, className, href = "/" }: LogoProps) {
  return (
    <Link
      to={href}
      className={cn("group flex shrink-0 items-center gap-2.5", className)}
      aria-label="رواء – الصفحة الرئيسية"
    >
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[19px] font-extrabold tracking-tight",
              tone === "dark" ? "text-white" : "text-brand-700"
            )}
          >
            رواء
          </span>
          <span
            className={cn(
              "mt-[3px] text-[8.5px] font-bold tracking-[0.32em]",
              tone === "dark" ? "text-aqua-300" : "text-aqua-600"
            )}
          >
            REWAA
          </span>
        </span>
      )}
    </Link>
  );
}

/** Square avatar version used for seller cards, placeholders and the footer. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-white p-1.5 ring-1 ring-ink-100",
        className
      )}
    >
      <LogoMark className="size-full" />
    </span>
  );
}
