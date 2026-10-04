import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/StoreProvider";
import type { RelatedProduct } from "@/types/product";
import { discountPercent, formatMoney, formatNumber } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Badge, Stars } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

interface Props {
  product: RelatedProduct;
  onAdd?: (product: RelatedProduct) => void;
  compact?: boolean;
  /** Fills the parent width — used inside grids instead of fixed-width rails. */
  fluid?: boolean;
}

/** Reusable catalogue card — used by every recommendation rail on the page. */
export function ProductCard({ product, onAdd, compact, fluid }: Props) {
  const { isWishlisted, toggleWishlist, isCompared, toggleCompare, pushToast } = useStore();
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);
  const [busy, setBusy] = useState(false);
  const discount = discountPercent(product.price, product.compareAtPrice);

  const onWishlist = async () => {
    setBusy(true);
    try {
      await toggleWishlist({ id: product.id, name: product.name, slug: product.slug });
    } finally {
      setBusy(false);
    }
  };

  const onCompare = async () => {
    if (compared) {
      pushToast({ tone: "info", title: "المنتج موجود في المقارنة مسبقًا", duration: 2000 });
      return;
    }
    await toggleCompare({ id: product.id, name: product.name, slug: product.slug });
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-hair transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift",
        fluid ? "w-full" : compact ? "w-[178px] sm:w-[210px]" : "w-[210px] sm:w-[248px]"
      )}
    >
      <Link to={`/p/${product.slug}`} className="relative block aspect-square overflow-hidden bg-paper-deep">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1">
          {discount > 0 && <Badge tone="danger" solid>-{discount}%</Badge>}
          {product.badge && <Badge tone={product.badge.tone} icon={product.inStock ? undefined : "clock"}>{product.badge.label}</Badge>}
          {!product.inStock && <Badge tone="neutral">نفد المخزون</Badge>}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            void onWishlist();
          }}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} إلى المفضلة`}
          className={cn(
            "absolute end-2.5 top-2.5 grid size-8 place-items-center rounded-md bg-surface/92 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur transition",
            wishlisted ? "text-danger" : "text-ink-500 hover:text-danger"
          )}
        >
          <Icon name="heart" size={15} filled={wishlisted} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            void onCompare();
          }}
          aria-pressed={compared}
          aria-label={compared ? `${product.name} في المقارنة` : `إضافة ${product.name} إلى المقارنة`}
          className={cn(
            "absolute end-2.5 top-12 grid size-8 place-items-center rounded-md bg-surface/92 shadow-hair ring-1 ring-inset ring-ink-100 backdrop-blur transition",
            compared ? "text-brand-700" : "text-ink-500 hover:text-brand-700"
          )}
        >
          <Icon name="compare" size={15} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10.5px] font-semibold tracking-wide text-aqua-700">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-5 text-ink-900">
          <Link to={`/p/${product.slug}`} className="transition-colors hover:text-brand-800">
            {product.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars value={product.rating} size={12} />
          <span className="text-[11px] text-ink-400">({formatNumber(product.reviewCount)})</span>
        </div>

        <div className="mt-auto pt-2.5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[17px] font-extrabold tabular-nums text-ink-950">
              {formatMoney(product.price)}
            </span>
            {product.compareAtPrice && (
              <s className="text-[11.5px] tabular-nums text-ink-400">{formatMoney(product.compareAtPrice)}</s>
            )}
          </div>

          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!product.inStock}
              className={cn(
                "mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[12px] font-bold transition active:scale-[0.98]",
                product.inStock
                  ? "bg-ink-950 text-aqua-200 hover:bg-brand-700 hover:text-white"
                  : "cursor-not-allowed bg-ink-100 text-ink-400"
              )}
            >
              <Icon name={product.inStock ? "cart" : "clock"} size={14} />
              {product.inStock ? "أضف إلى السلة" : "غير متوفر"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

interface RailProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  items: RelatedProduct[];
  onAdd?: (product: RelatedProduct) => void;
  id?: string;
}

/** Horizontally scrollable rail with desktop arrows and touch snap. */
export function ProductRail({ title, subtitle, eyebrow, items, onAdd, id }: RailProps) {
  if (items.length === 0) return null;

  const scrollBy = (delta: number) => {
    const el = document.getElementById(id ?? `rail-${title}`);
    el?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="scroll-mt-24" aria-label={title}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-aqua-600">
              <span className="h-px w-6 bg-aqua-400" />
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-xl font-extrabold text-ink-950 sm:text-[24px]">{title}</h2>
          {subtitle && <p className="mt-1 text-[12.5px] text-ink-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(280)}
              aria-label="السابق"
              className="grid size-9 place-items-center rounded-md border border-ink-200 bg-surface text-ink-600 transition hover:border-brand-300 hover:text-brand-700 active:scale-95"
            >
              <Icon name="chevronRight" size={17} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-280)}
              aria-label="التالي"
              className="grid size-9 place-items-center rounded-md border border-ink-200 bg-surface text-ink-600 transition hover:border-brand-300 hover:text-brand-700 active:scale-95"
            >
              <Icon name="chevronLeft" size={17} />
            </button>
          </div>
          <Link
            to="/c/water-filters"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 transition hover:text-brand-900"
          >
            عرض الكل
            <Icon name="arrowLeft" size={14} />
          </Link>
        </div>
      </div>

      <div
        id={id ?? `rail-${title}`}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 no-scrollbar"
      >
        {items.map((item) => (
          <div key={item.id} className="shrink-0 snap-start">
            <ProductCard product={item} onAdd={onAdd} />
          </div>
        ))}
      </div>
    </section>
  );
}
