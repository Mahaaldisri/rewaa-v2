import type { ProductSummary, SearchResponse, SearchSuggestion } from "@/types/catalog";
import { productSummaries } from "@/data/catalog";
import { allCategories } from "@/data/catalog/categories";
import { brands } from "@/data/catalog/brands";
import { guides } from "@/data/content/guides";
import { readJSON, writeJSON } from "@/lib/localStore";
import { features } from "@/config/site";

/**
 * Search API — products, categories, brands and guides with suggestions.
 * Recent searches live in localStorage through the shared storage helper.
 */

const HISTORY_KEY = "rewaa_search_history";

export const POPULAR_SEARCHES = [
  "فلتر 7 مراحل",
  "طقم شمعات",
  "ممبرين RO",
  "فلتر مركزي",
  "جهاز TDS",
  "مضخة تعزيز",
  "تحلية منزلية",
  "فلتر تحت المغسلة",
];

function delay(ms = 260): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms * (0.6 + Math.random() * 0.7)));
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function score(haystack: string, needle: string): number {
  const text = normalize(haystack);
  const query = normalize(needle);
  if (!query) return 0;
  if (text === query) return 100;
  if (text.startsWith(query)) return 70;
  if (text.includes(` ${query}`)) return 50;
  if (text.includes(query)) return 30;
  // token match: every word present in any order
  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => text.includes(token))) return 20;
  return 0;
}

function productSuggestions(query: string, limit = 6): SearchSuggestion[] {
  return productSummaries
    .map((summary) => ({
      summary,
      score: Math.max(
        score(summary.name, query),
        score(summary.brand, query) * 0.8,
        score(summary.sku, query) * 0.9,
        score(summary.tags.join(" "), query) * 0.7,
        score(summary.categoryName, query) * 0.5
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ summary }) => ({
      id: summary.id,
      kind: "product" as const,
      label: summary.name,
      href: `/p/${summary.slug}`,
      meta: `${summary.brand} · ${summary.categoryName}`,
      image: summary.image,
    }));
}

export const searchApi = {
  /** GET /v1/search/suggest?q= */
  async suggest(query: string, limit = 7): Promise<SearchSuggestion[]> {
    if (!query.trim()) return [];
    await delay(120);
    const suggestions: SearchSuggestion[] = [...productSuggestions(query, limit - 3)];

    allCategories
      .map((category) => ({ category, score: score(`${category.name} ${category.nameEn}`, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .forEach(({ category }) => {
        suggestions.push({
          id: category.id,
          kind: "category",
          label: category.name,
          href: `/c/${category.slug}`,
          meta: `${category.productCount ?? 0} منتج`,
        });
      });

    brands
      .map((brand) => ({ brand, score: score(`${brand.name} ${brand.nameEn}`, query) }))
      .filter((entry) => entry.score > 0)
      .slice(0, 1)
      .forEach(({ brand }) => {
        suggestions.push({
          id: brand.id,
          kind: "brand",
          label: brand.name,
          href: `/b/${brand.slug}`,
          meta: "علامة تجارية",
        });
      });

    guides
      .map((guide) => ({ guide, score: score(`${guide.title} ${guide.tags.join(" ")}`, query) }))
      .filter((entry) => entry.score > 0)
      .slice(0, 1)
      .forEach(({ guide }) => {
        suggestions.push({
          id: guide.id,
          kind: "guide",
          label: guide.title,
          href: `/guides/${guide.slug}`,
          meta: `دليل · ${guide.readingMinutes} دقائق قراءة`,
        });
      });

    return suggestions.slice(0, limit);
  },

  /** GET /v1/search?q= */
  async search(query: string, pageSize = 12): Promise<SearchResponse> {
    const term = query.trim();
    if (!term) {
      return {
        query: term,
        products: [],
        categories: [],
        brands: [],
        guides: [],
        suggestions: [],
        total: 0,
        fallbackTerms: POPULAR_SEARCHES.slice(0, 4),
      };
    }

    await delay(360);

    const products = productSummaries
      .map((summary) => ({
        summary,
        score: Math.max(
          score(summary.name, term) * 1.4,
          score(summary.sku, term) * 1.5,
          score(summary.brand, term),
          score(summary.tags.join(" "), term) * 0.8,
          score(`${summary.categoryName} ${summary.subcategoryName}`, term) * 0.7,
          score(summary.shortDescription, term) * 0.4
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, pageSize)
      .map((entry) => entry.summary);

    const categories = allCategories
      .map((category) => ({ category, score: score(`${category.name} ${category.nameEn} ${category.shortDescription}`, term) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ category }) => ({
        name: category.name,
        slug: category.slug,
        productCount: category.productCount ?? 0,
      }));

    const matchedBrands = brands
      .map((brand) => ({ brand, score: score(`${brand.name} ${brand.nameEn} ${brand.tagline}`, term) }))
      .filter((entry) => entry.score > 0)
      .slice(0, 3)
      .map(({ brand }) => ({ name: brand.name, slug: brand.slug, productCount: 0 }));

    const matchedGuides = guides
      .map((guide) => ({ guide, score: score(`${guide.title} ${guide.tags.join(" ")} ${guide.excerpt}`, term) }))
      .filter((entry) => entry.score > 0)
      .slice(0, 3)
      .map(({ guide }) => ({ title: guide.title, slug: guide.slug }));

    const total = products.length + categories.length + matchedBrands.length + matchedGuides.length;

    // Nearest-match hints when nothing was found: reuse the strongest token.
    const fallbackTerms =
      total === 0
        ? POPULAR_SEARCHES.filter((popular) => {
            const tokens = term.split(" ").filter((token) => token.length > 3);
            return tokens.some((token) => normalize(popular).includes(normalize(token)));
          }).slice(0, 3)
        : [];

    const suggestions = await this.suggest(term);
    return {
      query: term,
      products,
      categories,
      brands: matchedBrands,
      guides: matchedGuides,
      suggestions,
      total,
      fallbackTerms: fallbackTerms.length > 0 ? fallbackTerms : total === 0 ? POPULAR_SEARCHES.slice(0, 4) : [],
    };
  },

  /** Product page cross-reference: "search by model" used by the spares category. */
  async findByModel(model: string): Promise<ProductSummary[]> {
    await delay(220);
    const needle = normalize(model);
    if (!needle) return [];
    return productSummaries.filter((summary) => {
      const models = (summary.attributes.compatibleModels ?? []) as string[];
      return (
        normalize(models.join(" ")).includes(needle) ||
        normalize(summary.sku).includes(needle) ||
        normalize(summary.name).includes(needle)
      );
    }).slice(0, 8);
  },
};

/* --------------------------- Recent searches --------------------------- */
export const searchHistory = {
  read(): string[] {
    return readJSON<string[]>(HISTORY_KEY, []).slice(0, features.searchHistoryLimit);
  },
  push(term: string): string[] {
    const clean = term.trim();
    if (clean.length < 2) return this.read();
    const next = [clean, ...this.read().filter((item) => normalize(item) !== normalize(clean))].slice(
      0,
      features.searchHistoryLimit
    );
    writeJSON(HISTORY_KEY, next);
    return next;
  },
  clear(): void {
    writeJSON(HISTORY_KEY, []);
  },
};
