/**
 * Smoke test: server-renders every major component with real mock data to
 * catch render-time crashes, bad props and broken imports before shipping.
 * Run: node scripts/ssr-smoke.mjs (bundled with esbuild first).
 */
import { renderToString } from "react-dom/server";
import { createElement as h, StrictMode } from "react";
import { StoreProvider } from "../src/store/StoreProvider";
import { mockProduct, mockRelated } from "../src/data/mockProduct";
import {
  getDefaultSelection,
  getVariant,
  imagesForSelection,
  quotePrice,
  availabilityOf,
} from "../src/lib/product-logic";

import { AnnouncementBar } from "../src/components/layout/AnnouncementBar";
import { SiteHeader } from "../src/components/layout/SiteHeader";
import { SiteFooter } from "../src/components/layout/SiteFooter";
import { Breadcrumbs } from "../src/components/layout/Breadcrumbs";
import { ProductGallery } from "../src/components/product/ProductGallery";
import { ProductInfo } from "../src/components/product/ProductInfo";
import { ProductTabs } from "../src/components/product/ProductTabs";
import { StickyBuyBar } from "../src/components/product/StickyBuyBar";
import { BuyTogether } from "../src/components/product/BuyTogether";
import { ProductRail, ProductCard } from "../src/components/product/ProductCard";
import { PromotionPanel } from "../src/components/product/PromotionPanel";
import { ShippingPanel } from "../src/components/product/ShippingPanel";
import { TrustStrip, SellerCard } from "../src/components/product/TrustStrip";
import { PaymentMethodsPanel } from "../src/components/product/PaymentMethods";
import { InstallmentWidget } from "../src/components/product/InstallmentWidget";
import { VariantSelector } from "../src/components/product/VariantSelector";
import { QuantityPicker } from "../src/components/product/QuantityPicker";
import { PriceBlock } from "../src/components/product/PriceBlock";
import { Lightbox } from "../src/components/product/Lightbox";
import { ProductSeo } from "../src/components/seo/ProductSeo";
import { ProductPageSkeleton, ProductErrorState } from "../src/components/product/ProductPageSkeleton";
import { ReviewsSection } from "../src/components/reviews/ReviewsSection";
import { QuestionsSection } from "../src/components/qa/QuestionsSection";
import { ToastViewport } from "../src/components/ui/ToastViewport";
import { ServicePlanPicker } from "../src/components/product/ServicePlanPicker";
import { Logo, LogoMark, LogoBadge } from "../src/components/brand/Logo";
import App from "../src/App";

const selection = getDefaultSelection(mockProduct);
const variant = getVariant(mockProduct, selection);
const images = imagesForSelection(mockProduct, selection);
const quote = quotePrice(variant, mockProduct, 2);
const availability = availabilityOf(variant);

const cases: [string, () => unknown][] = [
  ["App", () => h(App)],
  ["AnnouncementBar", () => h(AnnouncementBar)],
  ["SiteHeader", () => h(SiteHeader)],
  ["SiteFooter", () => h(SiteFooter)],
  ["Breadcrumbs", () => h(Breadcrumbs, { items: mockProduct.breadcrumbs })],
  [
    "ProductGallery",
    () =>
      h(ProductGallery, {
        images,
        productName: mockProduct.name,
        badges: mockProduct.badges,
        discountBadge: "خصم 25%",
        wishlisted: false,
        onToggleWishlist: () => {},
        onShare: () => {},
        onOpenLightbox: () => {},
        activeIndex: 0,
        onIndexChange: () => {},
      }),
  ],
  ["ProductGallery/empty", () =>
    h(ProductGallery, {
      images: [],
      productName: mockProduct.name,
      badges: [],
      wishlisted: false,
      onToggleWishlist: () => {},
      onShare: () => {},
      onOpenLightbox: () => {},
      activeIndex: 0,
      onIndexChange: () => {},
    })],
  [
    "ProductInfo",
    () =>
      h(ProductInfo, {
        product: mockProduct,
        variant,
        selection,
        onSelectionChange: () => {},
        quantity: 2,
        onQuantityChange: () => {},
        onAddToCart: async () => true,
        onBuyNow: async () => {},
        onShare: () => {},
        images,
        buyBoxRef: { current: null },
        servicePlanId: mockProduct.servicePlans[1].id,
        onServicePlanChange: () => {},
        servicePlan: mockProduct.servicePlans[1],
      }),
  ],
  ["ProductTabs", () => h(ProductTabs, { product: mockProduct, reviewCount: mockProduct.reviewCount })],
  [
    "StickyBuyBar",
    () =>
      h(StickyBuyBar, {
        visible: true,
        product: mockProduct,
        variant,
        quote,
        addonPrice: 390,
        addonLabel: "باقة العناية — سنة",
        availability,
        quantity: 2,
        onQuantityChange: () => {},
        onAddToCart: async () => true,
        onBuyNow: async () => {},
        adding: false,
        image: images[0],
      }),
  ],
  [
    "BuyTogether",
    () =>
      h(BuyTogether, {
        product: mockProduct,
        unitPrice: quote.unitPrice,
        compareAtPrice: quote.compareAtPrice,
        image: images[0]?.thumb,
        items: mockRelated.filter((r) => r.group === "bought_together"),
        purchasable: true,
      }),
  ],
  [
    "ProductRail",
    () =>
      h(ProductRail, {
        title: "منتجات قد تعجبك",
        items: mockRelated.filter((r) => r.group === "similar"),
        onAdd: () => {},
        id: "rail-test",
      }),
  ],
  ["ProductCard", () => h(ProductCard, { product: mockRelated[0], onAdd: () => {} })],
  ["PromotionPanel", () => h(PromotionPanel, { promotions: mockProduct.promotions, soldPercent: 72 })],
  ["ShippingPanel", () => h(ShippingPanel, { product: mockProduct, orderValue: 598, purchasable: true })],
  ["TrustStrip", () => h(TrustStrip, { product: mockProduct })],
  ["SellerCard", () => h(SellerCard, { product: mockProduct })],
  ["PaymentMethodsPanel", () => h(PaymentMethodsPanel, { methods: mockProduct.paymentMethods })],
  [
    "InstallmentWidget",
    () => h(InstallmentWidget, { providers: mockProduct.installmentProviders, total: 598 }),
  ],
  ["VariantSelector", () => h(VariantSelector, { product: mockProduct, selection, onChange: () => {} })],
  ["QuantityPicker", () => h(QuantityPicker, { value: 2, onChange: () => {}, max: 5 })],
  ["PriceBlock", () => h(PriceBlock, { quote, vatPercent: 15, unitLabel: "2.99 ر.س / مل" })],
  [
    "Lightbox",
    () =>
      h(Lightbox, {
        images,
        index: 1,
        open: true,
        onClose: () => {},
        onIndexChange: () => {},
        alt: mockProduct.name,
      }),
  ],
  ["ProductSeo", () => h(ProductSeo, { product: mockProduct, variant })],
  ["ProductPageSkeleton", () => h(ProductPageSkeleton)],
  [
    "ProductErrorState",
    () => h(ProductErrorState, { title: "x", description: "y", onRetry: () => {}, retrying: false }),
  ],
  ["ReviewsSection", () => h(ReviewsSection, { product: mockProduct })],
  ["QuestionsSection", () => h(QuestionsSection, { product: mockProduct })],
  ["ToastViewport", () => h(ToastViewport)],
  ["Logo", () => h(Logo)],
  ["LogoMark", () => h(LogoMark, { title: "رواء" })],
  ["LogoBadge", () => h(LogoBadge)],
  [
    "ServicePlanPicker",
    () =>
      h(ServicePlanPicker, {
        plans: mockProduct.servicePlans,
        selectedId: mockProduct.servicePlans[1].id,
        onSelect: () => {},
      }),
  ],
];

let failed = 0;
for (const [name, render] of cases) {
  try {
    const html = renderToString(h(StrictMode, null, h(StoreProvider, null, render())));
    if (!html || html.length < 20) throw new Error("empty markup");
    console.log(`  ok   ${name.padEnd(24)} ${String(html.length).padStart(7)} chars`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(failed === 0 ? "\nALL COMPONENTS RENDERED" : `\n${failed} COMPONENT(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
