import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { RecentlyViewedRail } from "@/components/common/RecentlyViewedRail";
import { catalogApi } from "@/services/catalogApi";
import { useStore } from "@/store/StoreProvider";
import { useAsync } from "@/hooks/useAsync";
import { formatMoney, discountPercent } from "@/lib/format";
import { summaryToRelated } from "@/lib/product-view";
import { usePageSeo } from "@/lib/seo";
import { productApi } from "@/services/api";
import type { RelatedProduct } from "@/types/product";

export function WishlistPage() {
  const { wishlist, clearWishlist, addToCart } = useStore();
  const hydrated = useAsync(() => catalogApi.listByIds(wishlist), [wishlist.join(",")]);

  usePageSeo({
    title: "قائمة المفضلة | رواء",
    description: "المنتجات التي حفظتها لمتابعتها لاحقًا — الأسعار والتوفر محدّثان تلقائيًا.",
    canonical: "/wishlist",
    robots: "noindex, follow",
  });

  const summary = useMemo(() => {
    if (!hydrated.data) return { total: 0, savings: 0, outOfStock: 0 };
    const total = hydrated.data.reduce((sum, item) => sum + item.price, 0);
    const savings = hydrated.data.reduce(
      (sum, item) => sum + (item.compareAtPrice ? Math.max(0, item.compareAtPrice - item.price) : 0),
      0
    );
    return { total, savings, outOfStock: hydrated.data.filter((item) => !item.inStock).length };
  }, [hydrated.data]);

  const quickAdd = async (item: RelatedProduct) => {
    const product = await productApi.getBySlug(item.slug);
    const variant = product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0];
    if (!variant) return;
    await addToCart({
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      name: product.name,
      selectionLabel: Object.values(variant.selection).join(" · ") || "الخيار الافتراضي",
      unitPrice: variant.price,
      quantity: 1,
      image: product.images[0]?.thumb,
    });
  };

  const missing = wishlist.length > 0 && hydrated.data !== null && hydrated.data.length === 0;

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "المفضلة", href: "/wishlist" }]} />
        </div>
      </div>

      <div className="container-x py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-950">قائمة المفضلة</h1>
            <p className="mt-1.5 text-[13px] text-ink-500">
              نحفظ القائمة على جهازك، وتبقى كما هي عند العودة للمتجر.
            </p>
          </div>
          {wishlist.length > 0 && (
            <button
              type="button"
              onClick={clearWishlist}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 px-4 text-[12.5px] font-bold text-ink-600 transition hover:border-danger/40 hover:text-danger"
            >
              <Icon name="trash" size={15} />
              إفراغ القائمة
            </button>
          )}
        </div>

        {wishlist.length > 0 && hydrated.data && hydrated.data.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <p className="text-[11.5px] font-bold text-ink-500">عدد المنتجات</p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink-950 tabular-nums">{wishlist.length}</p>
            </div>
            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <p className="text-[11.5px] font-bold text-ink-500">إجمالي القيمة الحالية</p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink-950 tabular-nums">
                {formatMoney(summary.total)}
              </p>
            </div>
            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <p className="text-[11.5px] font-bold text-ink-500">قيمة الخصومات المتاحة</p>
              <p className="mt-1 font-display text-xl font-extrabold text-flow-700 tabular-nums">
                {summary.savings > 0 ? formatMoney(summary.savings) : "—"}
              </p>
            </div>
          </div>
        )}

        {summary.outOfStock > 0 && hydrated.data && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-soft/50 p-4">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-[12.5px] leading-6 text-ink-700">
              {summary.outOfStock === 1
                ? "أحد المنتجات في قائمتك نفد مخزونه حاليًا."
                : `${summary.outOfStock} من المنتجات في قائمتك نفد مخزونها حاليًا.`}{" "}
              يمكنك تركه في المفضلة وسيظهر عند توفره، أو سؤال الفريق عن موعد التوريد.
            </p>
          </div>
        )}

        <div className="mt-7">
          {hydrated.loading && !hydrated.data ? (
            <ProductGridSkeleton count={4} />
          ) : hydrated.error && !hydrated.loading ? (
            <ErrorState onRetry={hydrated.retry} retrying={hydrated.loading} />
          ) : missing || wishlist.length === 0 ? (
            <EmptyState
              icon="heart"
              title="قائمتك فارغة حتى الآن"
              description="اضغط على أيقونة القلب في أي منتج لحفظه هنا ومتابعة سعره وتوفره."
              action={{ label: "تصفّح فلاتر المياه", href: "/c/water-filters" }}
              secondaryAction={{ label: "أحدث العروض", href: "/offers" }}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {hydrated.data?.map((item) => (
                <li key={item.id} className="[&>article]:w-full">
                  <div className="relative">
                    <ProductCard product={summaryToRelated(item)} onAdd={quickAdd} />
                    {!item.inStock && (
                      <span className="pointer-events-none absolute end-2.5 top-2.5">
                        <Badge tone="neutral">نفد المخزون</Badge>
                      </span>
                    )}
                    {item.compareAtPrice && discountPercent(item.price, item.compareAtPrice) > 0 && (
                      <span className="sr-only">
                        خصم {discountPercent(item.price, item.compareAtPrice)} بالمئة
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-paper p-5">
          <Icon name="bell" size={18} className="text-brand-700" />
          <p className="text-[12.5px] text-ink-600">
            هل تريد تذكيرًا عند تغيّر السعر؟ اشترك في النشرة البريدية وسيصلك تذكير مواعيد تغيير الشمعات والعروض.
          </p>
          <Link
            to="/faq"
            className="ms-auto text-[12.5px] font-bold text-brand-700 underline decoration-dotted underline-offset-2"
          >
            كيف نحسب الأسعار؟ اعرف أكثر
          </Link>
        </div>
      </div>

      <RecentlyViewedRail />
    </div>
  );
}
