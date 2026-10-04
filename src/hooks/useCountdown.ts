import { useEffect, useMemo, useRef, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  isRunning: boolean;
}

function diff(target: number, now: number): CountdownParts {
  const totalMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    isExpired: totalMs <= 0,
    isRunning: totalMs > 0,
  };
}

/**
 * Real, self-cleaning countdown.
 * - never renders negative values
 * - stops its own interval once expired (no memory leak / no idle timers)
 * - resyncs when the target changes and when the tab becomes visible again
 */
export function useCountdown(endsAt?: string | null, enabled = true): CountdownParts {
  const target = useMemo(() => {
    if (!endsAt) return null;
    const time = new Date(endsAt).getTime();
    return Number.isNaN(time) ? null : time;
  }, [endsAt]);

  const [parts, setParts] = useState<CountdownParts>(() =>
    diff(target ?? Date.now(), Date.now())
  );
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === null) {
      setParts({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true, isRunning: false });
      return;
    }

    const tick = () => {
      const next = diff(target, Date.now());
      setParts(next);
      if (next.isExpired && frame.current !== null) {
        window.clearInterval(frame.current);
        frame.current = null;
      }
    };

    tick();
    frame.current = window.setInterval(tick, 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (frame.current !== null) window.clearInterval(frame.current);
      frame.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [target, enabled]);

  return parts;
}
