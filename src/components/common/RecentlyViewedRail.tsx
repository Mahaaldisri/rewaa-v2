import { useStore } from "@/store/StoreProvider";
import { catalogApi } from "@/services/catalogApi";
import { useAsync } from "@/hooks/useAsync";
import { ProductRail } from "@/components/product/ProductCard";
import { summariesToRelated } from "@/lib/product-view";

/**
 * Recently viewed products, stored as slugs in localStorage and hydrated from
 * the catalogue API. Rendered as a rail; hidden when there is nothing to show.
 */
export function RecentlyViewedRail({ excludeSlug }: { excludeSlug?: string }) {
  const { recentlyViewed } = useStore();
  const slugs = recentlyViewed.filter((slug) => slug !== excludeSlug).slice(0, 8);
  const hydrated = useAsync(() => catalogApi.listBySlugs(slugs), [slugs.join(",")]);

  if (!hydrated.data || hydrated.data.length === 0) return null;

  return (
    <section className="container-x py-10">
      <ProductRail
        id="recently-viewed-rail"
        eyebrow="متابعة التصفح"
        title="شاهدتها مؤخرًا"
        items={summariesToRelated(hydrated.data, "recently_viewed")}
      />
    </section>
  );
}
