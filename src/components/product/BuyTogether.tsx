import { useMemo, useState } from "react";
import type { Product, RelatedProduct } from "@/types/product";
import { discountPercent, formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

interface Props {
  product: Product;
  unitPrice: number;
  compareAtPrice?: number;
  image?: string;
  items: RelatedProduct[];
  purchasable: boolean;
}

/** "اشترِ معه" bundle builder with live total and one-tap multi-add. */
export function BuyTogether({ product, unitPrice, compareAtPrice, image, items, purchasable }: Props) {
  const { addToCart, pushToast } = useStore();
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item, i) => [item.id, i < 2 && item.inStock]))
  );
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => items.filter((item) => checked[item.id] && item.inStock), [items, checked]);
  const bundleTotal = unitPrice + selected.reduce((sum, item) => sum + item.price, 0);
  const bundleOriginal =
    (compareAtPrice ?? unitPrice) + selected.reduce((sum, item) => sum + (item.compareAtPrice ?? item.price), 0);
  const saving = Math.max(0, bundleOriginal - bundleTotal);

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const addBundle = async () => {
    setBusy(true);
    let added = 0;
    for (const item of [
      {
        productId: product.id,
        variantId: `${product.id}-base`,
        sku: product.sku,
        name: product.name,
        selectionLabel: "الخيار الحالي",
        unitPrice,
        quantity: 1,
        image,
      },
      ...selected.map((item) => ({
        productId: item.id,
        variantId: item.id,
        sku: item.slug.toUpperCase(),
        name: item.name,
        selectionLabel: item.brand,
        unitPrice: item.price,
        quantity: 1,
        image: item.image,
      })),
    ]) {
      const ok = await addToCart(item, { silent: true });
      if (ok) added += 1;
    }
    setBusy(false);
    pushToast({
      tone: added > 0 ? "success" : "error",
      title: added > 0 ? `تمت إضافة ${added} منتجات إلى السلة` : "تعذّرت إضافة الطقم",
      description: added > 0 ? `الإجمالي ${formatMoney(unitPrice + selected.reduce((s, i) => s + i.price, 0))}` : "حاول مرة أخرى.",
    });
  };

  return (
    <section className="scroll-mt-24">
      <SectionHeading
        eyebrow="وفّر أكثر"
        title="اشترِ معه"
        description="اختر القطع المكمّلة وأضفها كلها إلى السلة بضغطة واحدة."
      />

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-card">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap items-start gap-3">
            {/* Main product */}
            <label className="flex w-full items-start gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 sm:w-auto sm:min-w-[260px]">
              <input type="checkbox" checked disabled className="mt-1 size-4 accent-[var(--color-brand-700)]" aria-hidden="true" />
              <span className="size-16 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                {image ? (
                  <img src={image} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <LogoMark className="size-full p-2" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-bold text-aqua-700">{product.brand}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12.5px] font-bold leading-5 text-ink-900">
                  {product.name}
                </span>
                <span className="mt-1 block font-display text-[15px] font-extrabold tabular-nums text-ink-950">
                  {formatMoney(unitPrice)}
                </span>
              </span>
            </label>

            <span className="grid size-9 shrink-0 place-items-center self-center rounded-full bg-ink-950 text-aqua-300">
              <Icon name="plus" size={17} strokeWidth={2.2} />
            </span>

            {/* Companions */}
            <div className="flex w-full flex-wrap gap-3 sm:w-auto">
              {items.map((item) => {
                const isChecked = Boolean(checked[item.id]) && item.inStock;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 transition sm:w-auto sm:min-w-[230px]",
                      isChecked ? "border-brand-300 bg-brand-50/30" : "border-ink-100 bg-surface hover:border-ink-300",
                      !item.inStock && "cursor-not-allowed opacity-55"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!item.inStock}
                      onChange={() => toggle(item.id)}
                      className="mt-1 size-4 accent-[var(--color-brand-700)]"
                      aria-label={`إضافة ${item.name} إلى الطقم`}
                    />
                    <span className="size-16 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                      <img src={item.image} alt="" loading="lazy" className="size-full object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-bold text-aqua-700">{item.brand}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] font-bold leading-5 text-ink-900">
                        {item.name}
                      </span>
                      <span className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-display text-[15px] font-extrabold tabular-nums text-ink-950">
                          {formatMoney(item.price)}
                        </span>
                        {item.compareAtPrice && (
                          <s className="text-[11px] tabular-nums text-ink-400">{formatMoney(item.compareAtPrice)}</s>
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-ink-950 p-4 text-white lg:min-w-[240px]">
            <p className="text-[11.5px] text-ink-300">إجمالي الطقم ({selected.length + 1} منتجات)</p>
            <p className="mt-1 font-display text-[28px] font-extrabold leading-none tabular-nums text-aqua-300">
              {formatMoney(bundleTotal)}
            </p>
            {saving > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-success-soft">
                <Icon name="tag" size={12} />
                توفير {formatMoney(saving)} ({discountPercent(bundleTotal, bundleOriginal)}%)
              </p>
            )}
            <button
              type="button"
              onClick={addBundle}
              disabled={busy || !purchasable}
              className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-aqua-400 px-4 font-display text-[13.5px] font-extrabold text-ink-950 transition hover:bg-aqua-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Icon name="refresh" size={16} className="animate-spin-slow" /> : <Icon name="cart" size={16} />}
              {busy ? "جارٍ الإضافة…" : purchasable ? "أضف المحدد للسلة" : "المنتج الرئيسي غير متوفر"}
            </button>
            <p className="mt-2 text-center text-[10.5px] leading-4 text-ink-300">
              يُطبَّق الشحن المجاني تلقائيًا إذا تجاوز الإجمالي 250 ر.س
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
