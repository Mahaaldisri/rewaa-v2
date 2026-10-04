import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type TouchList as ReactTouchList,
} from "react";
import type { ProductImage } from "@/types/product";
import { useLockBodyScroll } from "@/hooks/useUi";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

interface Props {
  images: ProductImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  alt: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Fullscreen image viewer.
 * - prev/next, thumbnails, counter, close
 * - zoom in / out / reset + drag-to-pan (mouse & touch)
 * - swipe between images on touch devices
 * - Escape to close, arrow keys to navigate, focus kept inside the dialog
 * - body scroll locked while open
 */
export function Lightbox({ images, index, open, onClose, onIndexChange, alt }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ id: -1, startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false, pinchStart: 0 });
  const pinch = useRef({ active: false, startDistance: 0, startZoom: 1 });

  useLockBodyScroll(open);

  const image = images[index];

  const go = useCallback(
    (delta: number) => {
      if (images.length === 0) return;
      const next = (index + delta + images.length) % images.length;
      onIndexChange(next);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    },
    [images.length, index, onIndexChange]
  );

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const setZoomAt = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(clamped);
    if (clamped === 1) setOffset({ x: 0, y: 0 });
  }, []);

  /* --------------------------- Keyboard --------------------------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          go(1); // RTL: left arrow moves forward through the set
          break;
        case "ArrowRight":
          go(-1);
          break;
        case "+":
        case "=":
          e.preventDefault();
          setZoomAt(zoom + 0.5);
          break;
        case "-":
          e.preventDefault();
          setZoomAt(zoom - 0.5);
          break;
        case "0":
          resetZoom();
          break;
        case "Tab": {
          const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables?.length) return;
          const list = Array.from(focusables);
          const first = list[0];
          const last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
          break;
        }
        default:
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go, onClose, setZoomAt, zoom, resetZoom]);

  /* Focus the dialog when it opens */
  useEffect(() => {
    if (open) {
      resetZoom();
      setChromeVisible(true);
      window.requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [open, resetZoom]);

  /* Mouse drag-to-pan while zoomed (kept above the early return so the hook
     order stays stable between renders) */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setOffset({
        x: pointer.current.baseX + (e.clientX - pointer.current.startX),
        y: pointer.current.baseY + (e.clientY - pointer.current.startY),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  if (!open || !image) return null;

  /* --------------------------- Pointer --------------------------- */
  const distance = (touches: ReactTouchList) => {
    const a = touches[0];
    const b = touches[1];
    if (!a || !b) return 0;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      pinch.current = { active: true, startDistance: distance(e.touches), startZoom: zoom };
      return;
    }
    const touch = e.touches[0];
    pointer.current = {
      id: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
      pinchStart: 0,
    };
    if (zoom > 1) setDragging(true);
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (pinch.current.active && e.touches.length === 2) {
      const scale = distance(e.touches) / pinch.current.startDistance;
      setZoomAt(pinch.current.startZoom * scale);
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - pointer.current.startX;
    const dy = touch.clientY - pointer.current.startY;
    pointer.current.moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
    if (zoom > 1) {
      e.preventDefault();
      setOffset({ x: pointer.current.baseX + dx, y: pointer.current.baseY + dy });
    }
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (pinch.current.active && e.touches.length < 2) {
      pinch.current.active = false;
      return;
    }
    setDragging(false);
    if (zoom > 1) return;
    const touch = e.changedTouches[0];
    if (!touch || !pointer.current.moved) return;
    const dx = touch.clientX - pointer.current.startX;
    if (Math.abs(dx) > 48) go(dx > 0 ? 1 : -1); // RTL: swipe right → next
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    pointer.current = {
      id: 0,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
      pinchStart: 0,
    };
  };

  const toolButton =
    "grid size-10 place-items-center rounded-md bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-35 disabled:hover:bg-white/10";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`معرض صور ${alt}`}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-ink-950/97 animate-fade focus:outline-none"
    >
      {/* Top bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-3 transition-opacity duration-300 sm:px-5",
          chromeVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-white/10 px-2.5 py-1 font-display text-[13px] font-bold tabular-nums text-white ring-1 ring-inset ring-white/15">
            {index + 1} / {images.length}
          </span>
          <span className="hidden max-w-[46vw] truncate text-[12.5px] text-ink-300 sm:block">{image.alt}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className={toolButton} onClick={() => setZoomAt(zoom - 0.5)} disabled={zoom <= MIN_ZOOM} aria-label="تصغير">
            <Icon name="zoomOut" size={18} />
          </button>
          <span className="min-w-[52px] text-center font-display text-[12.5px] font-bold tabular-nums text-aqua-300">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className={toolButton} onClick={() => setZoomAt(zoom + 0.5)} disabled={zoom >= MAX_ZOOM} aria-label="تكبير">
            <Icon name="zoomIn" size={18} />
          </button>
          <button type="button" className={toolButton} onClick={resetZoom} disabled={zoom === 1} aria-label="إعادة ضبط التكبير">
            <Icon name="zoomReset" size={18} />
          </button>
          <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" />
          <button type="button" className={cn(toolButton, "hover:bg-danger/80")} onClick={onClose} aria-label="إغلاق المعرض (Esc)">
            <Icon name="close" size={19} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-14"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={() => setChromeVisible((v) => !v)}
      >
        <img
          key={image.id}
          src={zoom > 1 ? image.zoom : image.large}
          alt={image.alt}
          draggable={false}
          className={cn(
            "max-h-full max-w-full select-none object-contain shadow-pop animate-fade",
            dragging ? "grabbing-cursor" : zoom > 1 ? "grab-cursor" : "zoom-cursor"
          )}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
            transition: dragging ? "none" : "transform 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
          onDoubleClick={() => (zoom > 1 ? resetZoom() : setZoomAt(2.2))}
        />

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="الصورة السابقة"
              className="absolute start-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 p-3 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:grid"
            >
              <Icon name="chevronRight" size={22} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="الصورة التالية"
              className="absolute end-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 p-3 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:grid"
            >
              <Icon name="chevronLeft" size={22} strokeWidth={2} />
            </button>
          </>
        )}

        <p className="pointer-events-none absolute bottom-2 start-1/2 hidden -translate-x-1/2 text-[11px] text-ink-300 sm:block">
          اسحب للتحريك عند التكبير · استخدم ← → للتنقل · 0 لإعادة الضبط · Esc للإغلاق
        </p>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className={cn(
            "flex items-center justify-center gap-2 overflow-x-auto px-3 py-3 transition-opacity duration-300 sm:py-4",
            chromeVisible ? "opacity-100" : "opacity-0"
          )}
        >
          {images.map((thumb, i) => (
            <button
              key={thumb.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange(i);
                resetZoom();
              }}
              aria-label={`عرض الصورة ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-md ring-2 transition-all duration-200 sm:size-16",
                i === index ? "ring-aqua-400 scale-105" : "ring-white/15 opacity-60 hover:opacity-100"
              )}
            >
              <img src={thumb.thumb} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
