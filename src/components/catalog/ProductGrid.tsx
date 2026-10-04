import { useState } from "react";
import type { ProductSummary } from "@/types/catalog";
import type { RelatedProduct } from "@/types/product";
import { productApi } from "@/services/api";
import { useStore } from "@/store/StoreProvider";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/utils/cn";

interface Props {
  items: ProductSummary[];
  /** Group tag handed to the cards (affects nothing but analytics/placement). */
  group?: RelatedProduct["group"];
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Responsive grid of catalogue cards with a working quick-add button.
 * Quick add resolves the real product + default variant before touching the cart,
 * so the cart line always carries a valid variant id, SKU and price.
 */
export function ProductGrid({ items, group = "similar", columns = 4, className }: Props) {
  const { addToCart, pushToast } = useStore();
  const [addingId, setAddingId] = useState<string | null>(null);

  const quickAdd = async (card: RelatedProduct) => {
    setAddingId(card.id);
    try {
      const product = await productApi.getBySlug(card.slug);
      const variant =
        product.variants.find((item) => item.id === product.defaultVariantId) ?? product.variants[0];
      if (!variant) {
        pushToast({ tone: "error", title: "تعذّر إضافة المنتج", description: "لا يوجد خيار متاح للشراء حاليًا." });
        return;
      }
      await addToCart({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        name: product.name,
        selectionLabel: product.brand,
        unitPrice: variant.price,
        quantity: 1,
        image: product.images[0]?.thumb,
      });
    } catch {
      pushToast({ tone: "error", title: "تعذّر إضافة المنتج", description: "حاول مرة أخرى بعد لحظات." });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      className={cn(
        "grid gap-3.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {items.map((product) => (
        <ProductCard
          key={product.id}
          fluid
          product={{
                id: product.id,
                name: product.name,
                brand: product.brand,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                rating: product.rating,
                reviewCount: product.reviewCount,
                image: product.image,
                badge: product.badge,
                inStock: product.inStock,
            group,
          }}
          onAdd={addingId === product.id ? undefined : quickAdd}
        />
      ))}
    </div>
  );
}
