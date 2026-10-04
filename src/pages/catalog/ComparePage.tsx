import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, Stars } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/common/States";
import { catalogApi } from "@/services/catalogApi";
import { productApi } from "@/services/api";
import { useStore } from "@/store/StoreProvider";
import { useAsync } from "@/hooks/useAsync";
import { formatMoney } from "@/lib/format";
import { attributeLabels, formatAttribute } from "@/lib/product-view";
import { usePageSeo } from "@/lib/seo";
import { features } from "@/config/site";
import { cn } from "@/utils/cn";
import type { ProductSummary } from "@/types/catalog";

/** Comparison table with difference highlighting — `/compare`. */
export function ComparePage() {
  const { compare, removeFromCompare, clearCompare, addToCart } = useStore();
  const hydrated = useAsync(() => catalogApi.listByIds(compare), [compare.join(",")]);

  usePageSeo({
    title: "مقارنة المنتجات | رواء",
    description: "قارن بين أنظمة تنقية المياه والقطع بجانب بعضها: السعر، المراحل، السعة، الضمان والتوفر.",
    canonical: "/compare",
    robots: "noindex, follow",
  });

  const items = hydrated.data ?? [];

  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    items.forEach((item) => {
      Object.entries(item.attributes).forEach(([key, value]) => {
        if (!attributeLabels[key]) return;
        if (value === undefined || value === null || value === "") return;
        keys.add(key);
      });
    });
    return Array.from(keys);
  }, [items]);

  /** Rows where the values are not identical get highlighted. */
  const differing = useMemo(() => {
    const map = new Set<string>();
    attributeKeys.forEach((key) => {
      const values = items.map((item) => formatAttribute(key, item.attributes[key]) ?? "—");
      if (new Set(values).size > 1) map.add(key);
    });
    if (new Set(items.map((item) => item.price)).size > 1) map.add("__price");
    if (new Set(items.map((item) => item.rating)).size > 1) map.add("__rating");
    if (new Set(items.map((item) => item.inStock)).size > 1) map.add("__stock");
    return map;
  }, [attributeKeys, items]);

  const quickAdd = async (item: ProductSummary) => {
    const full = await productApi.getBySlug(item.slug);
    const variant = full.variants.find((v) => v.id === full.defaultVariantId) ?? full.variants[0];
    if (!variant) return;
    await addToCart({
      productId: full.id,
      variantId: variant.id,
      sku: variant.sku,
      name: full.name,
      selectionLabel: Object.values(variant.selection).join(" · ") || "الخيار الافتراضي",
      unitPrice: variant.price,
      quantity: 1,
      image: full.images[0]?.thumb,
    });
  };

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "المقارنة", href: "/compare" }]} />
        </div>
      </div>

      <div className="container-x py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-950">مقارنة المنتجات</h1>
            <p className="mt-1.5 text-[13px] text-ink-500">
              يمكنك مقارنة {features.compareLimit} منتجات في الوقت نفسه، وتُظلَّل الفروق تلقائيًا.
            </p>
          </div>
          {items.length > 1 && (
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 px-4 text-[12.5px] font-bold text-ink-600 transition hover:border-danger/40 hover:text-danger"
            >
              <Icon name="trash" size={15} />
              إفراغ المقارنة
            </button>
          )}
        </div>

        <div className="mt-7">
          {hydrated.loading && !hydrated.data ? (
            <div className="space-y-3" aria-hidden>
              <div className="skeleton h-40 rounded-xl" />
              <div className="skeleton h-64 rounded-xl" />
            </div>
          ) : hydrated.error && !hydrated.loading ? (
            <ErrorState onRetry={hydrated.retry} retrying={hydrated.loading} />
          ) : items.length === 0 ? (
            <EmptyState
              icon="compare"
              title="لم تُضف أي منتج للمقارنة بعد"
              description="اضغط على أيقونة المقارنة في بطاقة المنتج أو صفحة المنتج لإضافته هنا، ثم قارن المواصفات جنبًا إلى جنب."
              action={{ label: "تصفّح الأنظمة", href: "/c/water-filters" }}
              secondaryAction={{ label: "الشمعات والقطع", href: "/c/cartridges" }}
            />
          ) : items.length === 1 ? (
            <div className="rounded-xl border border-warning/25 bg-warning-soft/40 p-4 text-[12.5px] text-ink-700">
              أضفت منتجًا واحدًا فقط. أضف منتجًا آخر على الأقل لتظهر المقارنة الكاملة — ويمكنك إضافة حتى{" "}
              {features.compareLimit} منتجات.
            </div>
          ) : null}

          {items.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-xl border border-ink-100 bg-surface thin-scrollbar">
              <table className="w-full min-w-[720px] border-collapse text-start">
                <caption className="sr-only">جدول مقارنة المنتجات</caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky start-0 z-10 w-[168px] border-b border-ink-100 bg-paper p-3 text-start text-[12px] font-bold text-ink-500"
                    >
                      المواصفة
                    </th>
                    {items.map((item) => (
                      <th key={item.id} scope="col" className="min-w-[220px] border-b border-ink-100 p-3 align-top">
                        <div className="flex flex-col gap-2 text-start">
                          <div className="relative">
                            <Link to={`/p/${item.slug}`} className="block">
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                className="h-28 w-full rounded-lg object-cover"
                              />
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeFromCompare(item.id)}
                              aria-label={`إزالة ${item.name} من المقارنة`}
                              className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-ink-600 shadow-hair transition hover:text-danger"
                            >
                              <Icon name="close" size={14} strokeWidth={2.2} />
                            </button>
                          </div>
                          <Link
                            to={`/p/${item.slug}`}
                            className="line-clamp-2 font-display text-[13px] font-bold text-ink-950 hover:text-brand-700"
                          >
                            {item.name}
                          </Link>
                          <span className="text-[11.5px] text-ink-500">{item.brand}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="السعر" highlight={differing.has("__price")}>
                    {items.map((item) => (
                      <td key={item.id} className="border-b border-ink-100 p-3 align-top">
                        <span className="font-display text-[15px] font-extrabold text-ink-950 tabular-nums">
                          {formatMoney(item.price)}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="ms-2 text-[11.5px] text-ink-400 line-through tabular-nums">
                            {formatMoney(item.compareAtPrice)}
                          </span>
                        )}
                      </td>
                    ))}
                  </Row>

                  <Row label="التوفر" highlight={differing.has("__stock")}>
                    {items.map((item) => (
                      <td key={item.id} className="border-b border-ink-100 p-3 align-top">
                        {item.inStock ? (
                          <Badge tone="success" icon="check">
                            متوفر
                          </Badge>
                        ) : (
                          <Badge tone="neutral" icon="clock">
                            غير متوفر حاليًا
                          </Badge>
                        )}
                      </td>
                    ))}
                  </Row>

                  <Row label="التقييم" highlight={differing.has("__rating")}>
                    {items.map((item) => (
                      <td key={item.id} className="border-b border-ink-100 p-3 align-top">
                        <Stars value={item.rating} />
                        <span className="ms-2 text-[11.5px] text-ink-500 tabular-nums">
                          {item.rating.toFixed(1)} ({item.reviewCount})
                        </span>
                      </td>
                    ))}
                  </Row>

                  {attributeKeys.map((key) => (
                    <Row key={key} label={attributeLabels[key]} highlight={differing.has(key)}>
                      {items.map((item) => (
                        <td key={item.id} className="border-b border-ink-100 p-3 align-top text-[12.5px] text-ink-700">
                          {formatAttribute(key, item.attributes[key]) ?? "—"}
                        </td>
                      ))}
                    </Row>
                  ))}

                  <tr>
                    <th scope="row" className="sticky start-0 z-10 bg-paper p-3 text-start text-[12px] font-bold text-ink-500">
                      إجراء
                    </th>
                    {items.map((item) => (
                      <td key={item.id} className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void quickAdd(item)}
                            disabled={!item.inStock}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-700 px-3 text-[12px] font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Icon name="cart" size={14} />
                            أضف للسلة
                          </button>
                          <Link
                            to={`/p/${item.slug}`}
                            className="inline-flex h-9 items-center rounded-md border border-ink-200 px-3 text-[12px] font-bold text-ink-700 transition hover:bg-ink-50"
                          >
                            التفاصيل
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {items.length > 1 && (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-ink-100 bg-surface p-4">
                  <h2 className="line-clamp-1 font-display text-[13px] font-bold text-ink-950">{item.name}</h2>
                  <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                    {item.shortDescription}
                  </p>
                  <Link
                    to={`/p/${item.slug}`}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700"
                  >
                    اقرأ التفاصيل الكاملة
                    <Icon name="arrowLeft" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className={cn(highlight && "bg-aqua-50/40")}>
      <th
        scope="row"
        className={cn(
          "sticky start-0 z-10 border-b border-ink-100 bg-paper p-3 text-start text-[12px] font-bold",
          highlight ? "text-brand-800" : "text-ink-500"
        )}
      >
        {label}
        {highlight && <span className="ms-1.5 text-[10px] font-bold text-aqua-700">فرق</span>}
      </th>
      {children}
    </tr>
  );
}
