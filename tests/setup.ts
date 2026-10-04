import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom is missing a few browser APIs the storefront relies on. They are stubbed
 * here rather than in the app, so production code stays free of test branches.
 */

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "";
  thresholds = [];
}

if (!("IntersectionObserver" in window)) {
  Object.defineProperty(window, "IntersectionObserver", { writable: true, value: MockObserver });
}
if (!("ResizeObserver" in window)) {
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: MockObserver });
}
if (!("PerformanceObserver" in window)) {
  Object.defineProperty(window, "PerformanceObserver", { writable: true, value: MockObserver });
}

if (!window.scrollTo) window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16)) as typeof requestAnimationFrame;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
