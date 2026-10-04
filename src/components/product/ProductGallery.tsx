import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import type { ProductBadge, ProductImage } from "@/types/product";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/primitives";
import { useMediaQuery, useThrottle } from "@/hooks/useUi";
import { clamp } from "@/lib/format";
import { cn } from "@/utils/cn";

interface Props {
  images: ProductImage[];
  productName: string;
  badges: ProductBadge[];
  wishlisted: boolean;
  onToggleWishlist: () => void;
  onShare: () => void;
  onOpenLightbox: (index: number) => void;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  discountBadge?: string;
}

/** Placeholder shown when the API returns no imagery. */
function GalleryPlaceholder({ label }: { label: string }) {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden bg-paper-deep">
      <div className="absolute inset-0 bg-grid-fine opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.9),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <span className="grid size-16 place-items-center rounded-xl bg-surface p-2.5 shadow-lift ring-1 ring-ink-100">
          <LogoMark className="size-full" />
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-surface text-ink-300 shadow-hair">
          <Icon name="camera" size={20} />
        </span>
        <div>
          <p className="font-display text-[14px] font-bold text-ink-700">لا تتوفر صور لهذا المنتج حاليًا</p>
          <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-ink-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductGallery({
  images,
  productName,
  badges,
  wishlisted,
  onToggleWishlist,
  onShare,
  onOpenLightbox,
  activeIndex,
  onIndexChange,
  discountBadge,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");

  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const hasImages = images.length > 0;
  const current = images[activeIndex];

  useEffect(() => {
    const value = document.documentElement.dir === "ltr" ? "ltr" : "rtl";
    setDir(value);
  }, []);

  const shift = useCallback(
    (delta: number) => {
      if (!hasImages) return;
      onIndexChange((activeIndex + delta + images.length) % images.length);
    },
    [activeIndex, hasImages, images.length, onIndexChange]
  );

  /* Touch swipe on the main frame (mobile) */
  const touch = useRef({ startX: 0, startY: 0, active: false });
  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touch.current = { startX: t.clientX, startY: t.clientY, active: true };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    if (!touch.current.active || zooming) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.startX;
    const dy = t.clientY - touch.current.startY;
    touch.current.active = false;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      shift(dx > 0 ? 1 : -1); // RTL: swipe right → next
    }
  };

  /* Cursor-driven zoom (desktop, fine pointer) — throttled to ~60fps worth of
     state updates so panning never blocks the main thread. */
  const applyOrigin = useThrottle((x: number, y: number) => setOrigin({ x, y }), 16);

  const handleMove = (e: ReactMouseEvent) => {
    if (!canHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    applyOrigin(clamp(x, 0, 100), clamp(y, 0, 100));
  };

  const trackTransform = dir === "rtl" ? `translateX(${activeIndex * 100}%)` : `translateX(-${activeIndex * 100}%)`;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      {/* ------------------------------ Main frame ------------------------------ */}
      <div className="min-w-0 flex-1">
        <div
          ref={frameRef}
          role="group"
          tabIndex={0}
          aria-label={`صور ${productName}`}
          aria-roledescription="carousel"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              shift(dir === "rtl" ? 1 : -1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              shift(dir === "rtl" ? -1 : 1);
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenLightbox(activeIndex);
            }
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseMove={handleMove}
          onMouseEnter={() => canHover && setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          className={cn(
            "group relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-xl border border-ink-100 bg-paper-deep shadow-card sm:aspect-square lg:aspect-[4/5]",
            canHover && "zoom-cursor",
            !hasImages && "cursor-default"
          )}
        >
          {hasImages ? (
            <div
              className="flex size-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
              style={{ transform: trackTransform }}
            >
              {images.map((image, i) => (
                <div key={image.id} className="relative size-full shrink-0">
                  {!loaded[image.id] && <div className="skeleton absolute inset-0 rounded-xl" />}
                  <img
                    src={image.medium}
                    srcSet={`${image.thumb} 200w, ${image.medium} 800w, ${image.large} 1400w`}
                    sizes="(min-width: 1024px) 620px, 92vw"
                    alt={image.alt}
                    width={1200}
                    height={1500}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    draggable={false}
                    onLoad={() => setLoaded((prev) => ({ ...prev, [image.id]: true }))}
                    onClick={() => onOpenLightbox(i)}
                    className={cn(
                      "size-full select-none object-cover transition-[opacity,transform] duration-300 ease-out",
                      loaded[image.id] ? "opacity-100" : "opacity-0",
                      canHover && zooming && i === activeIndex ? "scale-[2.1]" : "scale-100"
                    )}
                    style={
                      canHover && zooming && i === activeIndex
                        ? { transformOrigin: `${origin.x}% ${origin.y}%` }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <GalleryPlaceholder label="سيتم تحديث المعرض فور رفع الصور من فريق المحتوى." />
          )}

          {/* Badges */}
          {(badges.length > 0 || discountBadge) && (
            <div className="pointer-events-none absolute start-3 top-3 z-10 flex max-w-[70%] flex-wrap gap-1.5">
              {discountBadge && (
                <span className="rounded-md bg-danger px-2 py-1 font-display text-[12px] font-extrabold text-white shadow-hair">
                  {discountBadge}
                </span>
              )}
              {badges.slice(0, isDesktop ? 3 : 2).map((badge) => (
                <Badge
                  key={badge.id}
                  tone={badge.tone}
                  icon={badge.icon as IconName}
                  solid={badge.tone === "aqua"}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="absolute end-3 top-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onToggleWishlist}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              className={cn(
                "grid size-9 place-items-center rounded-md bg-surface/92 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur transition hover:scale-105 active:scale-95",
                wishlisted ? "text-danger" : "text-ink-600 hover:text-danger"
              )}
            >
              <Icon name="heart" size={17} filled={wishlisted} />
            </button>
            <button
              type="button"
              onClick={onShare}
              aria-label="مشاركة المنتج"
              className="grid size-9 place-items-center rounded-md bg-surface/92 text-ink-600 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur transition hover:scale-105 hover:text-brand-700 active:scale-95"
            >
              <Icon name="share" size={16} />
            </button>
            {hasImages && (
              <button
                type="button"
                onClick={() => onOpenLightbox(activeIndex)}
                aria-label="فتح الصورة بالحجم الكامل"
                className="grid size-9 place-items-center rounded-md bg-surface/92 text-ink-600 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur transition hover:scale-105 hover:text-brand-700 active:scale-95"
              >
                <Icon name="zoomIn" size={16} />
              </button>
            )}
          </div>

          {/* Hover-zoom hint (desktop) */}
          {canHover && hasImages && (
            <div
              className={cn(
                "pointer-events-none absolute bottom-3 start-3 z-10 flex items-center gap-1.5 rounded-md bg-ink-950/80 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur transition-opacity duration-300",
                zooming ? "opacity-0" : "opacity-100"
              )}
            >
              <Icon name="zoomIn" size={13} />
              مرّر للتكبير · اضغط للعرض الكامل
            </div>
          )}

          {/* Counter */}
          {hasImages && images.length > 1 && (
            <span className="pointer-events-none absolute bottom-3 end-3 z-10 rounded-md bg-surface/92 px-2 py-1 font-display text-[11.5px] font-bold tabular-nums text-ink-700 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur">
              {activeIndex + 1} / {images.length}
            </span>
          )}

          {/* Edge arrows (desktop) */}
          {canHover && hasImages && images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="الصورة السابقة"
                className="absolute start-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-surface/90 p-2 text-ink-700 opacity-0 shadow-card ring-1 ring-inset ring-ink-100 transition-all duration-300 hover:bg-surface group-hover:opacity-100 lg:grid"
              >
                <Icon name="chevronRight" size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                aria-label="الصورة التالية"
                className="absolute end-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-surface/90 p-2 text-ink-700 opacity-0 shadow-card ring-1 ring-inset ring-ink-100 transition-all duration-300 hover:bg-surface group-hover:opacity-100 lg:grid"
              >
                <Icon name="chevronLeft" size={18} strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        {/* Dots (mobile) */}
        {hasImages && images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                tabIndex={-1}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeIndex ? "w-6 bg-brand-700" : "w-1.5 bg-ink-200"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------ Thumbnails ------------------------------ */}
      {hasImages && (
        <div
          className="order-first lg:order-none lg:w-[86px] lg:shrink-0"
          role="tablist"
          aria-label="صور المنتج المصغّرة"
        >
          <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:max-h-[560px] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 thin-scrollbar">
            {images.map((image, i) => (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`الصورة ${i + 1}: ${image.alt}`}
                  onClick={() => onIndexChange(i)}
                  className={cn(
                    "relative block size-[62px] overflow-hidden rounded-lg ring-2 transition-all duration-200 lg:size-[82px]",
                    i === activeIndex
                      ? "ring-brand-700 shadow-hair"
                      : "ring-transparent opacity-70 hover:opacity-100 hover:ring-ink-200"
                  )}
                >
                  <img
                    src={image.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  {i === activeIndex && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-aqua-400" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <p className="mt-2 hidden text-[10.5px] leading-4 text-ink-400 lg:block">{current.alt}</p>
          )}
        </div>
      )}
    </div>
  );
}
