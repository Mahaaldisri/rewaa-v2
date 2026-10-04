import { useCallback, useEffect, useRef, useState } from "react";

/** Reactive media query (SSR-safe: starts false, resolves on mount). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Locks body scroll while a modal/lightbox is open and restores it on unmount. */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    const previous = body.dataset.scrollLocked;
    const previousOverflow = body.style.overflow;
    body.dataset.scrollLocked = "true";
    body.style.overflow = "hidden";
    return () => {
      if (previous === undefined) delete body.dataset.scrollLocked;
      else body.dataset.scrollLocked = previous;
      body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

/** True once the referenced element has scrolled out of the viewport. */
export function useScrolledPast<T extends Element>(rootMargin = "-40% 0px 0px 0px") {
  const ref = useRef<T | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin, threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, past };
}

/** Adds `data-visible="true"` when the element enters the viewport (scroll reveal). */
export function useReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      node?.setAttribute("data-visible", "true");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.setAttribute("data-visible", "true");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08, ...options }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return ref;
}

/** Trailing-edge throttle for pointer/scroll driven work (zoom, sticky bars). */
export function useThrottle<A extends unknown[]>(fn: (...args: A) => void, wait = 16) {
  const last = useRef(0);
  const timer = useRef<number | null>(null);
  const saved = useRef(fn);
  saved.current = fn;

  return useCallback(
    (...args: A) => {
      const now = Date.now();
      const remaining = wait - (now - last.current);
      if (remaining <= 0) {
        last.current = now;
        saved.current(...args);
      } else if (timer.current === null) {
        timer.current = window.setTimeout(() => {
          last.current = Date.now();
          timer.current = null;
          saved.current(...args);
        }, remaining);
      }
    },
    [wait]
  );
}

/** Debounced value — used by the review search field. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Keeps a boolean in state and auto-resets it — for button micro-interactions. */
export function usePulse(duration = 600) {
  const [active, setActive] = useState(false);
  const timer = useRef<number | null>(null);

  const trigger = useCallback(() => {
    setActive(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), duration);
  }, [duration]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return [active, trigger] as const;
}
