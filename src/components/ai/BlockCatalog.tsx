/**
 * كتل الكتالوج داخل المحادثة: بطاقة منتج، شريط منتجات، صورة، مقارنة.
 *
 * القاعدة الحاكمة: لا تُعرض أي بيانات لم تُحلّ من الكتالوج الحقيقي. لو لم
 * يوجد المنتج ⇒ لا بطاقة إطلاقًا (ولا سعر مخترع).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Stars } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/lib/format";
import { resolveProduct, resolveSummary, productImageUrls } from "@/services/ai/catalog-resolver";
import type { BadgeTone } from "@/types/product";
import type { AiComparisonBlock, AiImageBlock, AiProductCardBlock, AiProductCarouselBlock } from "@/types/ai";

export interface ProductBlockHandlers {
  onAction: (action: "view" | "add_to_cart" | "compare" | "fit", productId: string, position: number) => void;
}

function stockTone(status: string): { tone: BadgeTone; label: string } {
  switch (status) {
    case "in_stock":
      return { tone: "success", label: "متوفر" };
    case "low_stock":
      return { tone: "info", label: "كمية محدودة" };
    case "backorder":
      return { tone: "neutral", label: "حسب الطلب" };
    case "out_of_stock":
      return { tone: "danger", label: "غير متوفر" };
    default:
      return { tone: "neutral", label: "يُتحقق عند الطلب" };
  }
}

function ProductTile({
  productId,
  reasons,
  position,
  compact,
  handlers,
}: {
  productId: string;
  reasons?: string[];
  position: number;
  compact?: boolean;
  handlers: ProductBlockHandlers;
}) {
  const summary = resolveSummary(productId);
  const product = resolveProduct(productId);
  if (!summary) return null;

  const stock = stockTone(summary.stockStatus);
  const hasDiscount = typeof summary.compareAtPrice === "number" && summary.compareAtPrice > summary.price;
  const purchasable = Boolean(product) && summary.inStock;

  return (
    <article
      className={cn(
        "flex gap-3 rounded-lg border border-ink-100 bg-surface p-2.5 shadow-hair",
        compact ? "w-[248px] shrink-0 snap-start" : "w-full",
      )}
    >
      <Link
        to={`/p/${summary.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-md bg-paper-deep ring-1 ring-ink-100"
        onClick={() => handlers.onAction("view", summary.id, position)}
      >
        <img src={summary.image} alt={summary.name} className="size-full object-cover" loading="lazy" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/p/${summary.slug}`}
            className="line-clamp-2 text-[12.5px] font-bold leading-5 text-ink-900 hover:text-brand-700"
            onClick={() => handlers.onAction("view", summary.id, position)}
          >
            {summary.name}
          </Link>
          {summary.badge && <Badge tone={summary.badge.tone}>{summary.badge.label}</Badge>}
        </div>

        <p className="mt-0.5 text-[11px] text-ink-500">{summary.brand}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-[13.5px] font-bold text-ink-900">
            {formatMoney(summary.price)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-ink-400 line-through">
              {formatMoney(summary.compareAtPrice as number)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-500">
            <Stars value={summary.rating} size={11} />
            <span className="ms-0.5">({summary.reviewCount})</span>
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <Badge tone={stock.tone}>{stock.label}</Badge>
          {reasons?.slice(0, 1).map((reason) => (
            <span key={reason} className="line-clamp-1 text-[11px] text-aqua-800">
              {reason}
            </span>
          ))}
        </div>

        {reasons && reasons.length > 1 && (
          <ul className="mt-1.5 space-y-0.5">
            {reasons.slice(1, 3).map((reason) => (
              <li key={reason} className="flex gap-1 text-[11px] leading-5 text-ink-600">
                <Icon name="check" size={11} className="mt-1 shrink-0 text-flow-600" strokeWidth={3} />
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            to={`/p/${summary.slug}`}
            className="inline-flex items-center gap-1 rounded-md bg-ink-950 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-ink-800"
            onClick={() => handlers.onAction("view", summary.id, position)}
          >
            عرض المنتج
            <Icon name="arrowLeft" size={11} />
          </Link>
          {purchasable ? (
            <button
              type="button"
              onClick={() => handlers.onAction("add_to_cart", summary.id, position)}
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-[11px] font-bold text-ink-800 transition hover:border-brand-300 hover:text-brand-700"
            >
              <Icon name="cart" size={11} />
              أضف للسلة
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-500">
              <Icon name="info" size={11} />
              غير متوفر الآن
            </span>
          )}
          <button
            type="button"
            onClick={() => handlers.onAction("compare", summary.id, position)}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-[11px] font-bold text-ink-800 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="compare" size={11} />
            قارن
          </button>
          <button
            type="button"
            onClick={() => handlers.onAction("fit", summary.id, position)}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-[11px] font-bold text-ink-800 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="target" size={11} />
            هل يناسبني؟
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardBlock({ block, handlers }: { block: AiProductCardBlock; handlers: ProductBlockHandlers }) {
  return <ProductTile productId={block.productId} reasons={block.reasons} position={0} handlers={handlers} />;
}

export function ProductCarouselBlock({ block, handlers }: { block: AiProductCarouselBlock; handlers: ProductBlockHandlers }) {
  const [index, setIndex] = useState(0);
  const items = block.items.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className="space-y-1.5" aria-label={block.title ?? "منتجات مقترحة"}>
      {block.title && <p className="text-[12px] font-bold text-ink-800">{block.title}</p>}
      <div
        className="flex snap-x gap-2 overflow-x-auto pb-1 thin-scrollbar"
        onScroll={(event) => {
          const target = event.currentTarget;
          const position = Math.round(target.scrollLeft / Math.max(1, target.clientWidth * 0.8));
          if (position !== index) {
            setIndex(position);
            handlers.onAction("view", items[Math.min(position, items.length - 1)].productId, position);
          }
        }}
      >
        {items.map((item, position) => (
          <ProductTile
            key={item.productId}
            productId={item.productId}
            reasons={item.reasons}
            position={position}
            compact
            handlers={handlers}
          />
        ))}
      </div>
    </section>
  );
}

export function ImageBlock({ block }: { block: AiImageBlock }) {
  const url = useMemo(() => {
    if (block.productId) {
      const allowed = productImageUrls(block.productId);
      return [block.imageUrl, ...allowed].find((candidate) => candidate && allowed.has(candidate));
    }
    // بلا منتج: الصور المحلية المسموح بها فقط (نفس قائمة المُتحقِّق).
    return block.imageUrl && (block.imageUrl.startsWith("/images/") ? block.imageUrl : undefined);
  }, [block.imageUrl, block.productId]);

  if (!url) return null;

  return (
    <figure className="overflow-hidden rounded-lg border border-ink-100 bg-paper-deep">
      <img src={url} alt={block.alt} className="max-h-64 w-full object-cover" loading="lazy" />
      {block.caption && <figcaption className="bg-surface px-3 py-2 text-[11px] text-ink-600">{block.caption}</figcaption>}
    </figure>
  );
}

export function ComparisonBlock({ block, handlers }: { block: AiComparisonBlock; handlers: ProductBlockHandlers }) {
  const products = block.productIds
    .map((id) => resolveSummary(id))
    .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))
    .slice(0, 4);

  if (products.length < 2) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-ink-100" aria-label="مقارنة منتجات">
      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full min-w-[420px] border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-paper-deep">
              <th scope="col" className="w-28 px-2.5 py-2 text-start font-semibold text-ink-500">
                المقارنة
              </th>
              {products.map((product, position) => (
                <th key={product.id} scope="col" className="px-2.5 py-2 text-start">
                  <button
                    type="button"
                    onClick={() => handlers.onAction("view", product.id, position)}
                    className="text-start font-bold text-ink-900 hover:text-brand-700"
                  >
                    <span className="line-clamp-2 leading-5">{product.name}</span>
                  </button>
                  <span className="mt-0.5 block text-[11px] font-normal text-ink-500">
                    {formatMoney(product.price)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.slice(0, 12).map((row) => (
              <tr key={row.label} className={cn("border-t border-ink-100", row.emphasis && "bg-aqua-50/40")}>
                <th scope="row" className="px-2.5 py-2 text-start align-top font-semibold text-ink-600">
                  {row.label}
                </th>
                {products.map((product, index) => (
                  <td key={product.id} className="px-2.5 py-2 align-top text-ink-800">
                    {row.values[index] ?? "غير معلن"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && <p className="border-t border-ink-100 bg-paper px-3 py-2 text-[11px] text-ink-500">{block.note}</p>}
    </section>
  );
}
