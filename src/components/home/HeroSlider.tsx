import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { HeroSlide } from "@/data/content/hero";
import { track } from "@/services/analytics";
import { cn } from "@/utils/cn";

export interface HeroTrustItem {
  icon: IconName;
  label: string;
}

interface Props {
  slides: HeroSlide[];
  trust: HeroTrustItem[];
  /** Live offer shown as a ribbon with its countdown, when the data has one. */
  offer?: { title: string; href: string; countdownLabel?: string } | null;
  /** Brand tagline used when there is no live offer. */
  tagline: string;
  /** Shown while the slides load. */
  loading: boolean;
}

const AUTOPLAY_MS = 7000;

/**
 * Homepage hero slider.
 *
 * Keeps the original hero layout (headline, CTAs, trust row, side card) and
 * turns the background into a rotating set of slides served by
 * `contentApi.listHeroSlides()`.
 *
 * Accessibility: one `<h1>` is mounted at a time, inactive slides are removed
 * from the accessibility tree, controls are real buttons with labels, autoplay
 * pauses on hover/focus, when the tab is hidden and for `prefers-reduced-motion`.
 */
export function HeroSlider({ slides, trust, offer, tagline, loading }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const count = slides.length;
  const active = slides[index] ?? slides[0];

  /* ------------------------------ Autoplay ------------------------------ */
  useEffect(() => {
    if (count <= 1 || paused) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  /* Slide impressions — one event per slide per visit. */
  useEffect(() => {
    if (!active || viewedRef.current.has(active.id)) return;
    viewedRef.current.add(active.id);
    track("hero_slide_view", { slide_id: active.id, slide_title: active.title, index });
  }, [active, index]);

  /* ------------------------------- Swipe -------------------------------- */
  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 48) return;
    // RTL: swiping left moves forward in reading order.
    go(index + (delta < 0 ? 1 : -1));
  };

  if (!active) {
    return (
      <section className="container-x pt-6 sm:pt-10">
        <div className={cn("h-[420px] rounded-2xl bg-ink-950/90 sm:h-[460px]", loading && "animate-pulse")} />
      </section>
    );
  }

  const trackCta = (cta: "primary" | "secondary", target: string) =>
    track("hero_cta_click", { slide_id: active.id, cta, target });

  return (
    <section className="container-x pt-6 sm:pt-10">
      <div
        className="relative overflow-hidden rounded-2xl bg-ink-950 shadow-pop"
        role="group"
        aria-roledescription="carousel"
        aria-label="أبرز ما في متجر رواء"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") go(index + 1);
          if (event.key === "ArrowRight") go(index - 1);
        }}
      >
        {/* Backgrounds stay mounted so switching slides never flashes. */}
        {slides.map((slide, slideIndex) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={slideIndex === index ? slide.imageAlt : ""}
            aria-hidden={slideIndex === index ? undefined : true}
            className={cn(
              "absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-700",
              slideIndex === index && "opacity-60"
            )}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            fetchPriority={slideIndex === 0 ? "high" : "low"}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-l from-ink-950 via-ink-950/80 to-ink-950/20" />

        <div className="relative grid gap-8 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div className="flex flex-col justify-center">
            {offer ? (
              <Link
                to={offer.href}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-aqua-300 ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
              >
                <Icon name="ticket" size={13} />
                {offer.title}
                {offer.countdownLabel && <span className="tabular-nums text-white/80">· {offer.countdownLabel}</span>}
              </Link>
            ) : (
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-aqua-300 ring-1 ring-inset ring-white/15">
                <Icon name={active.eyebrowIcon} size={13} />
                {active.eyebrow || tagline}
              </span>
            )}

            <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight text-white text-balance sm:text-[38px]">
              {active.title}
            </h1>
            <p className="mt-3 max-w-lg text-[13.5px] leading-7 text-ink-300">{active.description}</p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to={active.primaryCta.href}
                onClick={() => trackCta("primary", active.primaryCta.href)}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-aqua-400 px-6 text-[13.5px] font-bold text-ink-950 transition hover:bg-aqua-300 active:scale-[0.98]"
              >
                <Icon name={active.primaryCta.icon} size={17} />
                {active.primaryCta.label}
              </Link>
              {active.secondaryCta && (
                <Link
                  to={active.secondaryCta.href}
                  onClick={() => trackCta("secondary", active.secondaryCta!.href)}
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-6 text-[13.5px] font-bold text-white transition hover:bg-white/10"
                >
                  <Icon name={active.secondaryCta.icon} size={17} />
                  {active.secondaryCta.label}
                </Link>
              )}
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trust.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-[11.5px] leading-5 text-ink-200">
                  <Icon name={item.icon} size={15} className="mt-0.5 shrink-0 text-aqua-300" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden lg:block">
            <img
              src={active.image}
              alt={active.imageAlt}
              className="absolute inset-0 size-full rounded-xl object-cover"
              loading="lazy"
            />
            {active.aside && (
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-ink-950/85 p-4 backdrop-blur">
                <p className="flex items-center gap-2 text-[12.5px] font-bold text-white">
                  <Icon name={active.aside.icon} size={15} className="text-aqua-300" />
                  {active.aside.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-5 text-ink-300">{active.aside.body}</p>
                <Link
                  to={active.aside.ctaHref}
                  onClick={() => trackCta("secondary", active.aside!.ctaHref)}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[12px] font-bold text-white transition hover:bg-white/20"
                >
                  {active.aside.ctaLabel}
                  <Icon name="arrowLeft" size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {count > 1 && (
          <div className="relative flex items-center justify-between gap-3 px-5 pb-5 sm:px-10">
            <div className="flex items-center gap-1.5" aria-label="شرائح الواجهة">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-current={slideIndex === index}
                  aria-label={`الشريحة ${slideIndex + 1}: ${slide.eyebrow}`}
                  onClick={() => go(slideIndex)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    slideIndex === index ? "w-7 bg-aqua-400" : "w-3 bg-white/35 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="الشريحة السابقة"
                onClick={() => go(index - 1)}
                className="grid size-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
              >
                <Icon name="chevronRight" size={16} />
              </button>
              <button
                type="button"
                aria-label="الشريحة التالية"
                onClick={() => go(index + 1)}
                className="grid size-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
              >
                <Icon name="chevronLeft" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
