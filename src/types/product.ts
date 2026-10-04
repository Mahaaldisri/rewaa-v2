/**
 * Domain types for the storefront.
 * These mirror the shape of the future REST/GraphQL API responses so that
 * swapping `src/data/*` mocks for real endpoints requires no UI changes.
 */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

export type CurrencyCode = "SAR";

export type BadgeTone = "brand" | "aqua" | "danger" | "success" | "neutral" | "info";

export interface ProductBadge {
  id: string;
  label: string;
  tone: BadgeTone;
  icon?: string;
}

/** Responsive image set — every size the UI may need. */
export interface ProductImage {
  id: string;
  alt: string;
  thumb: string;
  medium: string;
  large: string;
  zoom: string;
  ratio: "square" | "portrait" | "landscape";
  /** Option ids this image belongs to (used to swap the gallery per variant). */
  optionIds?: string[];
}

export interface VariantOption {
  id: string;
  /** Machine value, e.g. "100ml" */
  value: string;
  /** Human label, e.g. "100 مل" */
  label: string;
  /** Optional visual swatch colour (hex or css gradient) */
  swatch?: string;
  /** Optional meta shown under the label, e.g. "+40 ر.س" */
  note?: string;
  disabled?: boolean;
}

export type OptionGroupType = "swatch" | "chip" | "select";

export interface VariantOptionGroup {
  id: string;
  name: string;
  type: OptionGroupType;
  /** e.g. "اللون", "الحجم", "السعة", "النكهة" — fully generic */
  hint?: string;
  options: VariantOption[];
}

/** One purchasable combination of options. */
export interface Variant {
  id: string;
  sku: string;
  barcode?: string;
  /** optionGroupId -> optionId */
  selection: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  costCurrency: CurrencyCode;
  stock: number;
  lowStockThreshold: number;
  status: StockStatus;
  availableAt?: string;
  weightGrams?: number;
  imageIds?: string[];
}

export type PromotionType =
  | "percentage"
  | "fixed_amount"
  | "buy_x_get_y"
  | "flash_sale"
  | "coupon"
  | "free_shipping"
  | "free_gift"
  | "multi_buy"
  | "bundle"
  | "installments";

export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  description?: string;
  /** percentage value or SAR amount depending on `type` */
  value?: number;
  code?: string;
  startsAt?: string;
  endsAt?: string;
  terms?: string[];
  tone?: "brand" | "aqua" | "danger";
  /** Rendered prominently with a countdown when true */
  highlight?: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  kind: "standard" | "express" | "same_day";
  price: number;
  etaLabel: string;
}

export interface City {
  id: string;
  name: string;
  region: string;
  /** [min, max] business days for standard shipping */
  standardEta: [number, number];
  expressEta: [number, number];
  sameDayAvailable: boolean;
}

export interface PickupBranch {
  id: string;
  city: string;
  name: string;
  address: string;
  hours: string;
  stock: number;
  distanceKm?: number;
}

export interface ShippingConfig {
  freeShippingThreshold: number;
  flatRate: number;
  expressRate: number;
  carriers: Carrier[];
  cities: City[];
  branches: PickupBranch[];
  international: boolean;
  note: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  kind: "card" | "wallet" | "cod" | "bnpl" | "bank";
  enabled: boolean;
  note?: string;
}

export interface InstallmentProvider {
  id: string;
  name: string;
  nameAr: string;
  installments: number;
  apr: number;
  minAmount: number;
  maxAmount: number;
  /** extra fees, if any */
  feePercent: number;
  accent: string;
}

export interface SpecRow {
  label: string;
  value: string;
  group?: string;
}

/**
 * Installation / maintenance package sold alongside the hardware.
 * Priced as an add-on line so the Cart API receives it as a separate item.
 */
export interface ServicePlan {
  id: string;
  name: string;
  price: number;
  /** 0 = one-off visit (no recurring coverage) */
  durationMonths: number;
  highlights: string[];
  badge?: string;
  recommended?: boolean;
}

export interface DescriptionBlock {
  id: string;
  title: string;
  /** list of paragraphs, or bullet points for list-style blocks */
  body?: string[];
  bullets?: string[];
  tone?: "default" | "warning" | "info";
}

export interface Seller {
  id: string;
  name: string;
  rating: number;
  ordersFulfilled: number;
  responseTime: string;
  verified: boolean;
  since: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  slug: string;
  brand: string;
  brandSlug: string;
  shortDescription: string;
  description: DescriptionBlock[];
  category: Category;
  subcategory: Category;
  breadcrumbs: { label: string; href: string }[];
  price: number;
  compareAtPrice: number;
  currency: CurrencyCode;
  vatPercent: number;
  costPrice?: number;
  images: ProductImage[];
  optionGroups: VariantOptionGroup[];
  variants: Variant[];
  defaultVariantId: string;
  rating: number;
  reviewCount: number;
  ratingBreakdown: Record<5 | 4 | 3 | 2 | 1, number>;
  soldCount: number;
  badges: ProductBadge[];
  promotions: Promotion[];
  shipping: ShippingConfig;
  paymentMethods: PaymentMethod[];
  installmentProviders: InstallmentProvider[];
  /** Installation & maintenance packages offered with this product */
  servicePlans: ServicePlan[];
  specifications: SpecRow[];
  seller: Seller;
  tags: string[];
  releasedAt?: string;
  warranty: { months: number; provider: string; summary: string };
  returns: { days: number; summary: string; conditions: string[] };
  meta: { title: string; description: string; canonical: string; keywords: string[] };
}

/* ------------------------------- Reviews ------------------------------- */

export interface Review {
  id: string;
  productId: string;
  author: string;
  avatarHue: number;
  city: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  variantLabel?: string;
  images?: string[];
  helpfulCount: number;
  sellerReply?: { body: string; createdAt: string };
}

/* ------------------------------ Questions ------------------------------ */

export interface ProductQuestion {
  id: string;
  productId: string;
  author: string;
  city?: string;
  question: string;
  createdAt: string;
  answer?: { body: string; answeredBy: string; createdAt: string };
  helpfulCount: number;
}

/* --------------------------- Related products --------------------------- */

export interface RelatedProduct {
  id: string;
  name: string;
  brand: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  badge?: { label: string; tone: BadgeTone };
  inStock: boolean;
  group: "similar" | "bought_together" | "recently_viewed";
}

/* -------------------------------- Errors -------------------------------- */

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "UNKNOWN", status = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
