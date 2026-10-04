import { describe, expect, it } from "vitest";
import { contentApi } from "@/services/contentApi";
import { heroSlides } from "@/data/content/hero";
import { announcements } from "@/data/content/announcements";
import { shipping } from "@/config/site";

/** Routes that exist in `src/router.tsx` — used to keep hero CTAs honest. */
const KNOWN_STATIC = new Set([
  "/",
  "/search",
  "/wishlist",
  "/compare",
  "/offers",
  "/product-finder",
  "/compatibility",
  "/calculator",
  "/brands",
  "/whole-house",
  "/cart",
  "/checkout",
  "/services",
  "/services/book",
  "/faq",
  "/about",
  "/stores",
  "/business",
  "/guides",
  "/login",
  "/register",
  "/account",
]);

function isRealRoute(href: string): boolean {
  const path = href.split("?")[0];
  return (
    KNOWN_STATIC.has(path) ||
    /^\/(p|c|b|services|guides|legal)\//.test(path)
  );
}

describe("hero slides", () => {
  it("has at least two slides with unique ids", async () => {
    const slides = await contentApi.listHeroSlides();
    expect(slides.length).toBeGreaterThanOrEqual(2);
    expect(new Set(slides.map((slide) => slide.id)).size).toBe(slides.length);
  });

  it("keeps the original storefront slide as the first one", async () => {
    const [first] = await contentApi.listHeroSlides();
    expect(first.id).toBe("storefront");
    expect(first.title).toContain("أنظمة تنقية وتحلية مياه");
    expect(first.primaryCta.href).toBe("/c/water-filters");
    expect(first.secondaryCta?.href).toBe("/product-finder");
    expect(first.aside?.ctaHref).toBe("/services/book");
  });

  it("gives every slide copy, imagery and working CTAs", async () => {
    const slides = await contentApi.listHeroSlides();
    slides.forEach((slide) => {
      expect(slide.title.length).toBeGreaterThan(10);
      expect(slide.description.length).toBeGreaterThan(20);
      expect(slide.image.startsWith("/images/")).toBe(true);
      expect(slide.imageAlt.length).toBeGreaterThan(5);
      expect(slide.eyebrow.length).toBeGreaterThan(0);
      expect(isRealRoute(slide.primaryCta.href)).toBe(true);
      if (slide.secondaryCta) expect(isRealRoute(slide.secondaryCta.href)).toBe(true);
      if (slide.aside) expect(isRealRoute(slide.aside.ctaHref)).toBe(true);
    });
  });

  it("never asserts a certification, partnership or coverage claim", () => {
    const banned = /(معتمد|اعتماد|ISO|NSF|FDA|SASO|شريك|شراكة|الأول في|الأكثر|100%|مضمون ١٠٠)/;
    heroSlides.forEach((slide) => {
      const copy = [slide.title, slide.description, slide.aside?.body ?? ""].join(" ");
      expect(copy).not.toMatch(banned);
    });
  });
});

describe("announcements", () => {
  it("returns only notices that are live now", async () => {
    const items = await contentApi.listAnnouncements();
    expect(items.length).toBeGreaterThan(0);
    const now = Date.now();
    items.forEach((item) => {
      if (item.startsAt) expect(Date.parse(item.startsAt)).toBeLessThanOrEqual(now);
      if (item.endsAt) expect(Date.parse(item.endsAt)).toBeGreaterThanOrEqual(now);
    });
  });

  it("keeps ids unique and links pointing at real routes", async () => {
    const items = await contentApi.listAnnouncements();
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    items.forEach((item) => {
      if (item.href) expect(isRealRoute(item.href)).toBe(true);
      expect(item.title.length).toBeGreaterThan(3);
      expect(item.body.length).toBeGreaterThan(10);
      expect(["brand", "aqua", "success", "warning"]).toContain(item.tone);
    });
  });

  it("restates the configured shipping threshold instead of hardcoding one", () => {
    const shippingNotice = announcements.find((item) => item.kind === "shipping");
    expect(shippingNotice).toBeTruthy();
    expect(shippingNotice!.title).toContain(String(shipping.freeShippingThreshold));
  });

  it("carries no invented deadlines", () => {
    announcements.forEach((item) => {
      expect(item.startsAt).toBeUndefined();
      expect(item.endsAt).toBeUndefined();
    });
  });
});
