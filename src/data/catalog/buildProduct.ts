import type {
  BadgeTone,
  DescriptionBlock,
  Product,
  ProductBadge,
  ProductImage,
  Promotion,
  SpecRow,
  Variant,
  VariantOption,
  VariantOptionGroup,
  OptionGroupType,
} from "@/types/product";
import type { ProductAttributes, ProductSummary } from "@/types/catalog";
import { buildImages } from "@/data/images";
import { findBrandBySlug } from "./brands";
import { findCategoryBySlug } from "./categories";
import {
  installmentProviders,
  paymentMethods,
  seller,
  servicePlansForCategory,
  shipping,
} from "./support";
import { legal, seo, shipping as shippingCopy } from "@/config/site";

/* ------------------------------------------------------------------ */
/* Seed contract                                                       */
/* ------------------------------------------------------------------ */
export interface SeedImage {
  id: number;
  alt: string;
  optionIds?: string[];
  ratio?: ProductImage["ratio"];
}

export interface SeedOption {
  id: string;
  value: string;
  label: string;
  swatch?: string;
  note?: string;
  /** Price difference added to the base price. */
  delta?: number;
  /** Optional separate delta for the compare-at price (keeps discounts realistic). */
  compareAtDelta?: number;
  disabled?: boolean;
}

export interface SeedOptionGroup {
  id: string;
  name: string;
  type: OptionGroupType;
  hint?: string;
  options: SeedOption[];
}

export interface ProductSeed {
  slug: string;
  id?: string;
  skuPrefix: string;
  name: string;
  nameEn: string;
  brandSlug: string;
  categorySlug: string;
  subcategorySlug: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  shortDescription: string;
  description: DescriptionBlock[];
  rating: number;
  reviewCount: number;
  ratingBreakdown?: Record<5 | 4 | 3 | 2 | 1, number>;
  soldCount: number;
  tags: string[];
  attributes: ProductAttributes;
  images: SeedImage[];
  optionGroups?: SeedOptionGroup[];
  defaultSelection?: Record<string, string>;
  specifications: SpecRow[];
  badges?: ProductBadge[];
  promotions?: Promotion[];
  /** key: option ids joined with "|" */
  stockOverrides?: Record<string, Partial<Variant>>;
  releasedAt?: string;
  featured?: boolean;
  /** Consumables skip the yearly care plan. */
  planKind?: "system" | "spares" | "none";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/** Stable pseudo-random in [0,1) so the catalog looks identical on every load. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const PRODUCT_ID_PREFIX: Record<string, string> = {
  "water-filters": "prd_wf",
  cartridges: "prd_ct",
  "whole-house": "prd_wh",
  desalination: "prd_ds",
  "pumps-equipment": "prd_pp",
  testing: "prd_ts",
  dispensers: "prd_dp",
};

function cartesian(groups: SeedOptionGroup[]): Record<string, string>[] {
  return groups.reduce<Record<string, string>[]>(
    (acc, group) => acc.flatMap((combo) => group.options.map((opt) => ({ ...combo, [group.id]: opt.id }))),
    [{}]
  );
}

function buildRatingBreakdown(rating: number, reviewCount: number): Record<5 | 4 | 3 | 2 | 1, number> {
  const weights: Record<5 | 4 | 3 | 2 | 1, number> =
    rating >= 4.7
      ? { 5: 0.7, 4: 0.2, 3: 0.06, 2: 0.025, 1: 0.015 }
      : rating >= 4.4
        ? { 5: 0.58, 4: 0.26, 3: 0.09, 2: 0.04, 1: 0.03 }
        : { 5: 0.45, 4: 0.28, 3: 0.15, 2: 0.07, 1: 0.05 };
  const entries = ([5, 4, 3, 2, 1] as const).map((star) => [star, Math.round(reviewCount * weights[star])] as const);
  const sum = entries.reduce((acc, [, count]) => acc + count, 0);
  const diff = reviewCount - sum;
  entries[0] = [5, entries[0][1] + diff];
  return Object.fromEntries(entries) as Record<5 | 4 | 3 | 2 | 1, number>;
}

function defaultBadges(seed: ProductSeed): ProductBadge[] {
  if (seed.badges) return seed.badges;
  const badges: ProductBadge[] = [];
  const attrs = seed.attributes;
  if (seed.compareAtPrice && seed.compareAtPrice > seed.price) {
    const off = Math.round(((seed.compareAtPrice - seed.price) / seed.compareAtPrice) * 100);
    badges.push({ id: "b-sale", label: `خصم ${off}%`, tone: "danger", icon: "tag" });
  }
  if (attrs.installationIncluded) badges.push({ id: "b-install", label: "تركيب متوفر", tone: "brand", icon: "package" });
  if ((attrs.warrantyMonths ?? 0) >= 24) {
    badges.push({ id: "b-warranty", label: `ضمان ${Math.round((attrs.warrantyMonths ?? 0) / 12)} سنوات`, tone: "success", icon: "shield" });
  }
  if (seed.soldCount > 400) badges.push({ id: "b-popular", label: "الأكثر مبيعًا", tone: "aqua", icon: "flame" });
  return badges;
}

function defaultPromotions(seed: ProductSeed): Promotion[] {
  if (seed.promotions) return seed.promotions;
  const promos: Promotion[] = [];
  if (seed.compareAtPrice && seed.compareAtPrice > seed.price) {
    promos.push({
      id: "promo-price",
      type: "percentage",
      title: "عرض السعر",
      description: `السعر مخفّض من ${seed.compareAtPrice} إلى ${seed.price} ر.س — الكمية محدودة من الدفعة الحالية`,
      value: Math.round(((seed.compareAtPrice - seed.price) / seed.compareAtPrice) * 100),
      tone: "danger",
      highlight: true,
      endsAt: hoursFromNow(30 + Math.round(hash01(seed.slug) * 60)),
      terms: ["يسري على الطرازات المتوفرة فقط", "لا يشمل قطع الغيار الاستهلاكية"],
    });
  }
  promos.push({
    id: "promo-coupon",
    type: "coupon",
    title: "كوبون إضافي 100 ر.س",
    description: "استخدم الكود عند إتمام الطلب للطلبات فوق 900 ر.س",
    code: "REWAA100",
    value: 100,
    endsAt: hoursFromNow(96),
    tone: "brand",
    terms: ["مرة واحدة لكل عميل", "يُطبَّق بعد خصم العرض الحالي"],
  });
  if (seed.attributes.installationIncluded) {
    promos.push({
      id: "promo-service",
      type: "buy_x_get_y",
      title: "أول زيارة صيانة مجانية",
      description: "زيارة فحص وتنظيف بعد 6 أشهر من التركيب دون رسوم",
      tone: "aqua",
    });
  }
  promos.push({
    id: "promo-shipping",
    type: "free_shipping",
    title: "شحن مجاني",
    description: `على الطلبات التي تتجاوز ${shippingCopy.freeShippingThreshold} ر.س`,
    value: shippingCopy.freeShippingThreshold,
    tone: "brand",
  });
  return promos;
}

function warrantyCopy(seed: ProductSeed): Product["warranty"] {
  const months = seed.attributes.warrantyMonths ?? 12;
  const isConsumable = seed.planKind === "spares" || seed.categorySlug === "testing";
  return {
    months,
    provider: isConsumable ? `${seller.name} — موزع معتمد` : `${seller.name} — البيع والخدمة مباشرة`,
    summary: isConsumable
      ? `ضمان ${months} شهرًا ضد عيوب التصنيع. القطع الاستهلاكية (الشمعات والممبرينات المستهلكة) تُستثنى من الضمان بعد التشغيل.`
      : `ضمان ${months} شهرًا على الوحدة الرئيسية ضد عيوب التصنيع، مع توفّر قطع الغيار والخدمة الفنية من رواء في المدن المخدومة.`,
  };
}

const RETURNS: Product["returns"] = {
  days: 14,
  summary: "إرجاع خلال 14 يومًا للوحدات غير المركّبة وبحالتها الأصلية، أو استبدال فوري عند وجود عيب صناعة.",
  conditions: [
    "أن تكون الوحدة غير مركّبة وبكامل ملحقاتها وتغليفها الأصلي",
    "إرفاق رقم الطلب والفاتورة الضريبية",
    "الوحدات المركّبة تخضع للاستبدال أو الإصلاح وليس للإرجاع النقدي",
    "تُستثنى الشمعات والممبرين المفتوحة لأسباب صحية",
    "يُرد المبلغ خلال 3–7 أيام عمل إلى وسيلة الدفع الأصلية",
  ],
};

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */
export function buildProduct(seed: ProductSeed): Product {
  const category = findCategoryBySlug(seed.categorySlug);
  const subcategory = category?.children.find((child) => child.slug === seed.subcategorySlug);
  if (!category) throw new Error(`Unknown category slug: ${seed.categorySlug}`);

  const brand = findBrandBySlug(seed.brandSlug);
  const brandName = brand?.name ?? seed.brandSlug;

  const productSlug = seed.slug;
  const productId = seed.id ?? `${PRODUCT_ID_PREFIX[seed.categorySlug] ?? "prd"}_${productSlug.split("/").pop()}`;
  const images = buildImages(seed.images).map((img, index) => ({ ...img, id: `${productId}-img-${index + 1}` }));

  const groups = seed.optionGroups ?? [];
  const combos = groups.length > 0 ? cartesian(groups) : [{}];

  const variants: Variant[] = combos.map((selection, index) => {
    let delta = 0;
    let compareAtDelta = 0;
    groups.forEach((group) => {
      const option = group.options.find((opt) => opt.id === selection[group.id]);
      delta += option?.delta ?? 0;
      compareAtDelta += option?.compareAtDelta ?? option?.delta ?? 0;
    });
    const optionIds = Object.values(selection);
    const overrideKey = optionIds.join("|");
    const override = seed.stockOverrides?.[overrideKey] ?? {};
    const rnd = hash01(`${productSlug}-${index}`);
    const generatedStock = rnd < 0.1 ? 0 : rnd < 0.28 ? 2 + Math.floor(rnd * 8) : 12 + Math.floor(rnd * 40);
    const stock = override.stock ?? generatedStock;
    const status = override.status ?? (stock === 0 ? "out_of_stock" : stock <= 5 ? "low_stock" : "in_stock");
    const variantImageIds = images
      .filter((img) => !img.optionIds || img.optionIds.some((id) => optionIds.includes(id)))
      .map((img) => img.id);

    return {
      id: `${productId}-v${index + 1}`,
      sku: `${seed.skuPrefix}-${optionIds.map((id) => id.slice(0, 3).toUpperCase()).join("") || "STD"}`,
      barcode: `628${String(100000 + index)}${String(seed.price + delta).padStart(5, "0").slice(0, 5)}`,
      selection,
      price: seed.price + delta,
      compareAtPrice: seed.compareAtPrice ? seed.compareAtPrice + compareAtDelta : undefined,
      costCurrency: "SAR",
      stock,
      lowStockThreshold: 5,
      status,
      availableAt: override.availableAt,
      weightGrams: 1000 + Math.round(hash01(productSlug) * 9000),
      imageIds: variantImageIds.length > 0 ? variantImageIds : images.map((img) => img.id),
      ...override,
    };
  });

  const defaultVariant =
    (seed.defaultSelection
      ? variants.find((variant) =>
          Object.entries(seed.defaultSelection!).every(([groupId, optionId]) => variant.selection[groupId] === optionId)
        )
      : undefined) ??
    variants.find((variant) => variant.compareAtPrice && variant.status === "in_stock") ??
    variants[0];

  const categories = {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
  const subcategories = {
    id: subcategory?.id ?? category.id,
    name: subcategory?.name ?? category.name,
    slug: subcategory?.slug ?? category.slug,
  };

  const planKind = seed.planKind ?? "system";
  const servicePlans =
    planKind === "none" ? [] : servicePlansForCategory(seed.categorySlug, seed.subcategorySlug);

  return {
    id: productId,
    sku: defaultVariant?.sku ?? seed.skuPrefix,
    name: seed.name,
    nameEn: seed.nameEn,
    slug: productSlug,
    brand: brandName,
    brandSlug: seed.brandSlug,
    shortDescription: seed.shortDescription,
    description: seed.description,
    category: categories,
    subcategory: subcategories,
    breadcrumbs: [
      { label: "الرئيسية", href: "/" },
      { label: category.name, href: `/c/${category.slug}` },
      ...(subcategory ? [{ label: subcategory.name, href: `/c/${category.slug}/${subcategory.slug}` }] : []),
      { label: brandName, href: `/b/${seed.brandSlug}` },
      { label: seed.name, href: `/p/${productSlug}` },
    ],
    price: defaultVariant?.price ?? seed.price,
    compareAtPrice: defaultVariant?.compareAtPrice ?? seed.compareAtPrice ?? seed.price,
    currency: "SAR",
    vatPercent: legal.vatPercent,
    costPrice: seed.costPrice,
    images,
    optionGroups: groups.map<VariantOptionGroup>((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      hint: group.hint,
      options: group.options.map<VariantOption>(
        ({ delta: _delta, compareAtDelta: _compareAtDelta, ...option }) => option
      ),
    })),
    variants,
    defaultVariantId: defaultVariant?.id ?? "",
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    ratingBreakdown: seed.ratingBreakdown ?? buildRatingBreakdown(seed.rating, seed.reviewCount),
    soldCount: seed.soldCount,
    badges: defaultBadges(seed),
    promotions: defaultPromotions(seed),
    shipping,
    paymentMethods,
    installmentProviders,
    servicePlans,
    specifications: seed.specifications,
    seller: { ...seller },
    tags: seed.tags,
    releasedAt: seed.releasedAt ?? daysAgo(30 + Math.round(hash01(productSlug) * 400)),
    warranty: warrantyCopy(seed),
    returns: RETURNS,
    meta: {
      title: `${seed.name} | ${brandName} – رواء`,
      description: `${seed.shortDescription} شحن لكل مدن المملكة من رواء.`,
      canonical: `${seo.siteUrl}/p/${productSlug}`,
      keywords: seed.tags,
    },
  };
}

/** Lightweight projection used by grids, rails, search and the compare table. */
export function toSummary(product: Product, attributes: ProductAttributes): ProductSummary {
  const defaultVariant = product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0];
  const inStock = product.variants.some((v) => v.status === "in_stock" || v.status === "low_stock");
  const badge = product.badges.find((b) => b.tone === "danger") ?? product.badges[0];

  return {
    id: product.id,
    sku: defaultVariant?.sku ?? product.sku,
    name: product.name,
    nameEn: product.nameEn,
    slug: product.slug,
    brand: product.brand,
    brandSlug: product.brandSlug,
    categorySlug: product.category.slug,
    categoryName: product.category.name,
    subcategorySlug: product.subcategory.slug,
    subcategoryName: product.subcategory.name,
    price: defaultVariant?.price ?? product.price,
    compareAtPrice: defaultVariant?.compareAtPrice ?? product.compareAtPrice,
    currency: product.currency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    image: product.images[0]?.medium ?? "",
    imageHover: product.images[1]?.medium,
    inStock,
    stockStatus: defaultVariant?.status ?? "in_stock",
    isNew: Boolean(product.releasedAt && Date.now() - new Date(product.releasedAt).getTime() < 90 * 86_400_000),
    planKind: product.servicePlans.length > 0 ? "system" : "none",
    badge: badge ? { label: badge.label, tone: badge.tone as BadgeTone } : undefined,
    shortDescription: product.shortDescription,
    tags: product.tags,
    attributes,
    releasedAt: product.releasedAt,
  };
}
