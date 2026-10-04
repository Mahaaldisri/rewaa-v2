import { describe, expect, it } from "vitest";
import { isIndexable, NOINDEX_PATHS, prerenderRoutes, sitemapEntries } from "@/lib/seo-routes";
import { collectConfigIssues, inspectOfficialData } from "@/config/config-checks";
import { env } from "@/config/env";

describe("SEO route model", () => {
  it("never exposes private routes to crawlers", () => {
    ["/cart", "/checkout", "/account", "/login", "/register", "/search", "/wishlist", "/compare"].forEach((path) => {
      expect(isIndexable(path)).toBe(false);
    });
    expect(isIndexable("/account/orders/RWA-1")).toBe(false);
  });

  it("keeps the public catalog indexable", () => {
    ["/", "/c/water-filters", "/p/cartridges/carbon-block-cto", "/services", "/guides", "/faq"].forEach((path) => {
      expect(isIndexable(path)).toBe(true);
    });
  });

  it("generates a prerenderable page per public route with metadata", () => {
    const routes = prerenderRoutes();
    expect(routes.length).toBeGreaterThan(50);
    const duplicates = routes.map((route) => route.path).filter((path, index, all) => all.indexOf(path) !== index);
    expect(duplicates).toEqual([]);
    routes.forEach((route) => {
      expect(route.title.length).toBeGreaterThan(3);
      expect(route.description.length).toBeGreaterThan(10);
      expect(route.heading.length).toBeGreaterThan(1);
      expect(route.path.startsWith("/")).toBe(true);
    });
  });

  it("excludes private routes from the sitemap", () => {
    const paths = sitemapEntries().map((entry) => entry.path);
    NOINDEX_PATHS.forEach((entry) => expect(paths).not.toContain(entry.path));
    expect(paths).toContain("/");
  });
});

describe("configuration checks", () => {
  it("never treats placeholder business data as real", () => {
    const placeholders = inspectOfficialData();
    // The repository ships with placeholder contact/registry data on purpose.
    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((entry) => expect(entry.reason.length).toBeGreaterThan(3));
  });

  it("can report issues without throwing in any environment", () => {
    const issues = collectConfigIssues();
    expect(Array.isArray(issues)).toBe(true);
    issues.forEach((issue) => {
      expect(["error", "warning"]).toContain(issue.level);
      expect(issue.title.length).toBeGreaterThan(2);
    });
  });

  it("keeps the resolved env self-consistent", () => {
    if (!env.mock.enabled && !env.api.configured) {
      // Without a backend and without mock data the build must not pretend to work.
      expect(collectConfigIssues().some((issue) => issue.level === "error")).toBe(true);
    } else {
      expect(env.api.configured || env.mock.enabled).toBe(true);
    }
  });
});
