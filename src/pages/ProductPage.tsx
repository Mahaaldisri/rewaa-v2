import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Product, ProductImage, RelatedProduct } from "@/types/product";
import { ApiError } from "@/types/product";
import { productApi } from "@/services/api";
import {
  availabilityOf,
  getDefaultSelection,
  getVariant,
  imagesForSelection,
  quotePrice,
  selectionLabel,
  type Selection,
} from "@/lib/product-logic";
import { clamp, discountPercent, formatMoney } from "@/lib/format";
import { shipping } from "@/config/site";
import { track } from "@/services/analytics";
import { itemFromProduct } from "@/services/analytics/map";
import { useScrolledPast, useReveal } from "@/hooks/useUi";
import { useStore } from "@/store/StoreProvider";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductTabs } from "@/components/product/ProductTabs";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { BuyTogether } from "@/components/product/BuyTogether";
import { ProductRail } from "@/components/product/ProductCard";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { QuestionsSection } from "@/components/qa/QuestionsSection";
import { Lightbox } from "@/components/product/Lightbox";
import { ProductSeo } from "@/components/seo/ProductSeo";
import { ProductErrorState, ProductPageSkeleton } from "@/components/product/ProductPageSkeleton";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

const DEFAULT_SLUG = "water-filters/rewaa-pro-ro7";

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)}>
      {children}
    </div>
  );
}

interface FailureState {
  title: string;
  description: string;
}

export function ProductPage() {
  const navigate = useNavigate();
  const params = useParams<{ "*": string }>();
  const slug = params["*"] && params["*"].length > 0 ? params["*"] : DEFAULT_SLUG;
  const { addToCart, addingToCart, pushToast, isWishlisted, toggleWishlist, markViewed } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<FailureState | null>(null);

  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [servicePlanId, setServicePlanId] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const { ref: buyBoxRef, past: pastBuyBox } = useScrolledPast<HTMLDivElement>("-30% 0px 0px 0px");

  /* ------------------------------ Loading ------------------------------ */
  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const data = await productApi.getBySlug(slug);
      setProduct(data);
      setSelection(getDefaultSelection(data));
      setServicePlanId(
        (data.servicePlans.find((p) => p.recommended) ?? data.servicePlans[0])?.id ?? ""
      );
      setQuantity(1);
      setImageIndex(0);
      setRelated(await productApi.listRelated(data.id));
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_FOUND") {
        setFailure({
          title: "لم نعثر على هذا المنتج",
          description: "ربما تم إيقاف بيعه أو تغيير رابطه. تصفّح المجموعة أو عد للرئيسية لمتابعة التسوق.",
        });
      } else {
        setFailure({
          title: "تعذّر تحميل صفحة المنتج",
          description: "حدث خطأ في الاتصال بالخادم أثناء جلب بيانات المنتج. حاول مجددًا بعد لحظات.",
        });
      }
    } finally {
      setLoading(false);
    }
    // `scenario` deliberately not a dependency: it is resolved inside the service layer.
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Recently-viewed: recorded once the product resolves, keyed by slug. */
  useEffect(() => {
    if (product) markViewed(product.slug);
  }, [product, markViewed]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ------------------------------ Derived ------------------------------ */
  const variant = useMemo(
    () => (product ? getVariant(product, selection) : undefined),
    [product, selection]
  );
  const availability = useMemo(() => availabilityOf(variant), [variant]);
  const images: ProductImage[] = useMemo(
    () => (product ? imagesForSelection(product, selection) : []),
    [product, selection]
  );
  const quote = useMemo(
    () => (product ? quotePrice(variant, product, quantity) : null),
    [product, variant, quantity]
  );

  /* Analytics: view_item for the resolved variant (consent-gated upstream). */
  useEffect(() => {
    if (!product || !variant) return;
    track("view_item", {
      currency: product.currency,
      value: quote?.unitPrice ?? variant.price,
      items: [itemFromProduct(product, variant.sku, quote?.unitPrice ?? variant.price, variant.sku)],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, variant?.sku]);

  const grouped = useMemo(
    () => ({
      similar: related.filter((item) => item.group === "similar"),
      bought: related.filter((item) => item.group === "bought_together"),
      recent: related.filter((item) => item.group === "recently_viewed"),
    }),
    [related]
  );

  const servicePlan = useMemo(
    () => product?.servicePlans.find((plan) => plan.id === servicePlanId),
    [product, servicePlanId]
  );
  const servicePrice = servicePlan?.price ?? 0;

  const maxQuantity = availability.purchasable && variant ? Math.max(1, Math.min(variant.stock, 10)) : 1;

  /* ----------------------------- Handlers ------------------------------ */
  const handleSelectionChange = (groupId: string, optionId: string) => {
    if (!product) return;
    const next: Selection = { ...selection, [groupId]: optionId };
    const nextVariant = getVariant(product, next);

    if (!nextVariant) {
      pushToast({
        tone: "warning",
        title: "هذا المزيج غير متوفر",
        description: "جرّب اختيار إصدار أو حجم آخر من القائمة.",
      });
      return;
    }

    setSelection(next);
    setImageIndex(0);
    setQuantity((q) => clamp(q, 1, Math.max(1, Math.min(nextVariant.stock || 1, 10))));
  };

  const handleAddToCart = useCallback(async () => {
    if (!product || !variant || !quote) return false;

    const ok = await addToCart({
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      name: product.name,
      selectionLabel: selectionLabel(product, selection),
      unitPrice: variant.price,
      quantity,
      image: images[0]?.thumb,
    });

    if (ok) {
      track("add_to_cart", {
        currency: product.currency,
        value: variant.price * quantity,
        items: [
          {
            item_id: variant.sku,
            item_name: product.name,
            item_brand: product.brand,
            item_category: product.category.name,
            item_category2: product.subcategory.name,
            price: variant.price,
            quantity,
          },
        ],
      });
    }

    // Paid service packages are submitted as their own cart line.
    if (ok && servicePlan && servicePlan.price > 0) {
      await addToCart(
        {
          productId: product.id,
          variantId: `${product.id}-${servicePlan.id}`,
          sku: `SRV-${servicePlan.id.toUpperCase()}`,
          name: servicePlan.name,
          selectionLabel: "باقة تركيب وصيانة",
          unitPrice: servicePlan.price,
          quantity: 1,
          image: images[0]?.thumb,
        },
        { silent: true }
      );
    }
    return ok;
  }, [addToCart, images, product, quantity, quote, selection, servicePlan, variant]);

  const handleBuyNow = useCallback(async () => {
    if (!product || !variant) return;
    const added = await handleAddToCart();
    if (!added) return;
    pushToast({
      tone: "success",
      title: "جارٍ تحويلك إلى صفحة الدفع",
      description: "أكمل بيانات الشحن والدفع لإتمام طلبك.",
      duration: 2000,
    });
    navigate("/checkout");
  }, [handleAddToCart, navigate, product, pushToast, variant]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: product.shortDescription,
      url: product.meta.canonical,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      pushToast({
        tone: "success",
        title: "تم نسخ رابط المنتج",
        description: shareData.url,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      pushToast({
        tone: "warning",
        title: "تعذّرت المشاركة",
        description: `انسخ الرابط يدويًا: ${shareData.url}`,
      });
    }
  }, [product, pushToast]);

  const handleQuickAdd = useCallback(
    (item: RelatedProduct) => {
      void addToCart({
        productId: item.id,
        variantId: item.id,
        sku: item.slug.toUpperCase(),
        name: item.name,
        selectionLabel: item.brand,
        unitPrice: item.price,
        quantity: 1,
        image: item.image,
      });
    },
    [addToCart]
  );

  /* ------------------------------- Render ------------------------------- */
  if (loading && !product) {
    return (
      <>
        <div className="border-b border-ink-100 bg-surface/70">
          <div className="container-x py-3">
            <div className="flex items-center gap-2 text-[12px] text-ink-400">
              <span className="size-3 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
              جارٍ تحميل بيانات المنتج…
            </div>
          </div>
        </div>
        <ProductPageSkeleton />
      </>
    );
  }

  if (failure || !product || !quote) {
    return (
      <ProductErrorState
        title={failure?.title ?? "تعذّر عرض المنتج"}
        description={failure?.description ?? "لم نتمكن من تحميل بيانات هذه الصفحة."}
        onRetry={() => void load()}
        retrying={loading}
      />
    );
  }

  const discount = discountPercent(quote.unitPrice, quote.compareAtPrice);
  const stickyVisible = pastBuyBox && !lightboxOpen;

  return (
    <>
      <ProductSeo product={product} variant={variant} />

      <main className="bg-ambient">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-fine opacity-[0.35]" aria-hidden="true" />

        {/* Breadcrumbs */}
        <div className="border-b border-ink-100/80 bg-surface/60 backdrop-blur-sm">
          <div className="container-x flex flex-wrap items-center justify-between gap-2 py-2.5">
            <Breadcrumbs items={product.breadcrumbs} />
            <div className="flex items-center gap-3 text-[11.5px] text-ink-500">
              <a href="/c/water-filters/ro-systems" className="transition hover:text-brand-700">
                كل أنظمة التناضح العكسي
              </a>
              <span className="text-ink-200">|</span>
              <span className="hidden sm:inline">
                تم التحديث: <span className="font-mono text-ink-600">{product.id.slice(0, 10)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="container-x py-5 sm:py-7">
          {/* -------------------- Hero: gallery + purchase panel -------------------- */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
              <ProductGallery
                images={images}
                productName={product.name}
                badges={product.badges}
                discountBadge={discount > 0 ? `خصم ${discount}%` : undefined}
                wishlisted={isWishlisted(product.id)}
                onToggleWishlist={() => void toggleWishlist(product)}
                onShare={() => void handleShare()}
                onOpenLightbox={(index) => {
                  setImageIndex(index);
                  setLightboxOpen(true);
                }}
                activeIndex={imageIndex}
                onIndexChange={setImageIndex}
              />
            </div>

            <ProductInfo
              product={product}
              variant={variant}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              quantity={quantity}
              onQuantityChange={(value) => setQuantity(clamp(value, 1, maxQuantity))}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onShare={() => void handleShare()}
              images={images}
              buyBoxRef={buyBoxRef}
              servicePlanId={servicePlanId}
              onServicePlanChange={setServicePlanId}
              servicePlan={servicePlan}
            />
          </div>

          {/* ------------------------------- Details ------------------------------- */}
          <Reveal className="mt-10 lg:mt-14">
            <ProductTabs product={product} reviewCount={product.reviewCount} />
          </Reveal>

          {/* ------------------------------ Buy together --------------------------- */}
          <Reveal className="mt-10 lg:mt-14">
            <BuyTogether
              product={product}
              unitPrice={quote.unitPrice}
              compareAtPrice={quote.compareAtPrice}
              image={images[0]?.thumb}
              items={grouped.bought}
              purchasable={availability.purchasable}
            />
          </Reveal>

          {/* -------------------------------- Reviews ------------------------------ */}
          <Reveal className="mt-10 lg:mt-14">
            <ReviewsSection product={product} />
          </Reveal>

          {/* ------------------------------- Questions ----------------------------- */}
          <Reveal className="mt-10 lg:mt-14">
            <QuestionsSection product={product} />
          </Reveal>

          {/* ---------------------------- Recommendations -------------------------- */}
          <Reveal className="mt-10 lg:mt-14">
            <ProductRail
              eyebrow="أكمل التجربة"
              title="منتجات قد تعجبك"
              subtitle="قطع غيار وأنظمة مكمّلة اختارها عملاء هذا المنتج."
              items={grouped.similar}
              onAdd={handleQuickAdd}
              id="rail-similar"
            />
          </Reveal>

          <Reveal className="mt-10">
            <ProductRail
              eyebrow="من زياراتك السابقة"
              title="شوهدت مؤخرًا"
              subtitle="أنظمة ومعدات تصفحتها خلال الأيام الماضية."
              items={grouped.recent}
              onAdd={handleQuickAdd}
              id="rail-recent"
            />
          </Reveal>

          {/* ------------------------------ Value strip ---------------------------- */}
          <Reveal className="mt-12">
            <div className="grid gap-3 overflow-hidden rounded-xl bg-ink-950 p-6 text-white sm:grid-cols-2 lg:grid-cols-4">
              {[
                product.servicePlans.length > 0
                  ? {
                      icon: "package" as const,
                      title: "تركيب وصيانة متوفرة",
                      body: `${product.servicePlans.length} باقة يمكن إضافتها قبل الإتمام`,
                    }
                  : {
                      icon: "rotate" as const,
                      title: "قطع استهلاكية متوفرة",
                      body: "شمعات وقطع متوافقة قابلة للاستبدال",
                    },
                {
                  icon: "shield" as const,
                  title: `ضمان ${product.warranty.months} شهرًا`,
                  body: product.warranty.provider,
                },
                {
                  icon: "refresh" as const,
                  title: `إرجاع خلال ${product.returns.days} يومًا`,
                  body: "وفق شروط معلنة على صفحة الإرجاع",
                },
                {
                  icon: "truck" as const,
                  title: `شحن مجاني فوق ${formatMoney(shipping.freeShippingThreshold)}`,
                  body: "تُعرض التكلفة والمدة حسب المدينة",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/8 text-aqua-300 ring-1 ring-inset ring-white/10">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <p className="font-display text-[13.5px] font-bold">{item.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-4 text-ink-300">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Spacer so the sticky bar never covers content */}
        <div className={cn("transition-all", stickyVisible ? "h-24 lg:h-8" : "h-4")} aria-hidden="true" />
      </main>

      {/* --------------------------- Sticky purchase bar --------------------------- */}
      <StickyBuyBar
        visible={stickyVisible}
        product={product}
        variant={variant}
        quote={quote}
        addonPrice={servicePrice}
        addonLabel={servicePlan?.name}
        availability={availability}
        quantity={quantity}
        onQuantityChange={(value) => setQuantity(clamp(value, 1, maxQuantity))}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        adding={addingToCart}
        image={images[imageIndex] ?? images[0]}
      />

      {/* -------------------------------- Lightbox -------------------------------- */}
      <Lightbox
        images={images}
        index={imageIndex}
        open={lightboxOpen && images.length > 0}
        alt={product.name}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setImageIndex}
      />

      {/* ------------------------------- Back to top ------------------------------ */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="العودة إلى أعلى الصفحة"
        className={cn(
          "fixed bottom-24 start-5 z-30 hidden size-11 place-items-center rounded-full bg-surface text-ink-700 shadow-lift ring-1 ring-ink-200 transition-all duration-300 hover:bg-ink-950 hover:text-aqua-300 lg:grid",
          showTop && !lightboxOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <Icon name="chevronUp" size={19} strokeWidth={2.2} />
      </button>

      {/* Screen-reader summary of the current configuration */}
      <p className="sr-only" aria-live="polite">
        {`${product.name}، ${selectionLabel(product, selection)}، السعر ${formatMoney(quote.unitPrice)}، ${availability.label}`}
      </p>
    </>
  );
}
