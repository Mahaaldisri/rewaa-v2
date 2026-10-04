import type { BadgeTone, StockStatus } from "./product";

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */
export type CategoryIconName =
  | "droplet"
  | "layers"
  | "home"
  | "building"
  | "waves"
  | "settings"
  | "gauge"
  | "sparkles"
  | "snow"
  | "store"
  | "package"
  | "shield"
  | "bolt"
  | "scale"
  | "search"
  | "grid"
  | "truck"
  | "refresh"
  | "rotate"
  | "headset"
  | "clock"
  | "tag";

export interface CategorySeo {
  title: string;
  description: string;
  /** نص تعريفي أسفل صفحة القسم */
  intro?: string;
  /** أقسام نصية إضافية (نصائح، طريقة الاختيار، أسئلة شائعة) */
  sections?: { id: string; title: string; body: string[]; bullets?: string[] }[];
  faqIds?: string[];
}

export interface CategoryNode {
  id: string;
  slug: string;
  /** مسارات بديلة محفوظة للتوافق مع روابط قديمة */
  aliases?: string[];
  name: string;
  nameEn: string;
  shortDescription: string;
  description: string;
  icon: CategoryIconName;
  accent: "brand" | "aqua" | "flow" | "ink" | "success" | "neutral";
  /** القيمة المبدئية تُصحّح من الكتالوج عبر categoryProductCounts */
  productCountPlaceholder?: number;
  /** يُحسب من الكتالوج عند البناء */
  productCount?: number;
  heroImage?: string;
  benefits?: { title: string; description: string; icon: CategoryIconName }[];
  buyingGuide?: { title: string; steps: string[] };
  filterGroups: readonly FilterGroupId[];
  seo: CategorySeo;
  children: CategoryNode[];
}

export type Category = CategoryNode;

export interface CategoryListing {
  category: CategoryNode;
  subcategory?: CategoryNode;
  breadcrumbs: { label: string; href: string }[];
  siblings: CategoryNode[];
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */
export type FilterGroupId =
  | "price"
  | "brand"
  | "stages"
  | "systemType"
  | "capacity"
  | "flowRate"
  | "pump"
  | "tank"
  | "usage"
  | "installation"
  | "warranty"
  | "availability"
  | "rating"
  | "replacementInterval"
  | "compatibleModels"
  /* Derived groups — see src/lib/filter-model.ts for the mapping rules. */
  | "useCase"
  | "users"
  | "installType"
  | "features"
  | "offers";

export type FilterKind = "range" | "list" | "toggle" | "search";

export interface FilterOption {
  id: string;
  label: string;
  count: number;
  swatch?: string;
}

export interface FilterGroup {
  id: FilterGroupId;
  label: string;
  kind: FilterKind;
  hint?: string;
  options: FilterOption[];
  /** range only */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface ActiveFilter {
  groupId: FilterGroupId;
  optionId: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Product summary (listings, rails, wishlist, compare)                */
/* ------------------------------------------------------------------ */
export interface ProductAttributes {
  stages?: number;
  systemType?: string;
  capacityLiters?: number;
  flowRateGpd?: number;
  replacementMonths?: number;
  hasPump?: boolean;
  hasTank?: boolean;
  usage?: "home" | "commercial" | "both";
  installationIncluded?: boolean;
  warrantyMonths?: number;
  voltage?: string;
  dimensions?: string;
  weightKg?: number;
  compatibleModels?: string[];
  /** أي وصف إضافي يمكن عرضه في صفحة المقارنة */
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  sku: string;
  brand: string;
  brandSlug: string;
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  image: string;
  imageHover?: string;
  badge?: { label: string; tone: BadgeTone };
  inStock: boolean;
  stockStatus: StockStatus;
  isNew?: boolean;
  releasedAt?: string;
  tags: string[];
  attributes: ProductAttributes;
  shortDescription: string;
  highlights?: string[];
  /** يحدد نوع باقات الخدمة المرتبطة (تركيب/صيانة/بدون) */
  planKind?: "system" | "spares" | "none";
}

/* ------------------------------------------------------------------ */
/* Query & listing                                                     */
/* ------------------------------------------------------------------ */
export type SortKey =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "best_selling"
  /** Largest absolute discount first — only meaningful with discount data. */
  | "savings_desc";

export interface CatalogQuery {
  categorySlug?: string;
  subcategorySlug?: string;
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  stages?: number[];
  systemType?: string[];
  usage?: ("home" | "commercial" | "both")[];
  hasPump?: boolean;
  hasTank?: boolean;
  installationIncluded?: boolean;
  minWarrantyMonths?: number;
  availability?: "in_stock" | "coming_soon";
  minRating?: number;
  replacementMonths?: number[];
  /** شرائح السعة: small | medium | large */
  capacityBuckets?: string[];
  /** شرائح معدل الإنتاج: low | mid | high */
  flowRateBuckets?: string[];
  compatibleModel?: string;
  /** Derived: place-of-use ids (see filter-model). */
  useCase?: string[];
  /** Derived: household size bands. */
  users?: string[];
  /** Derived: under-sink | countertop | central | standalone. */
  installationType?: string[];
  /** Feature toggles that only apply when the catalogue declares them. */
  hasUv?: boolean;
  hasRo?: boolean;
  /** Only products with an active discount. */
  discounted?: boolean;
  search?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface CatalogResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: FilterGroup[];
  /** عدد الفلاتر المطبّقة فعليًا */
  appliedCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/* Brands                                                             */
/* ------------------------------------------------------------------ */
export interface Brand {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  country: string;
  tagline: string;
  description: string;
  story: string[];
  /** أحرف تُعرض داخل الشعار النصي (لا شعارات وهمية) */
  logoText: string;
  accent: BadgeTone;
  highlights: { title: string; body: string }[];
  warrantyNote: string;
  serviceNote: string;
  categories: string[];
}

/* ------------------------------------------------------------------ */
/* Search                                                             */
/* ------------------------------------------------------------------ */
export interface SearchSuggestion {
  id: string;
  kind: "product" | "category" | "brand" | "guide" | "service" | "term";
  label: string;
  meta?: string;
  href: string;
  image?: string;
}

export interface SearchResponse {
  query: string;
  products: ProductSummary[];
  categories: { name: string; slug: string; productCount: number }[];
  brands: { name: string; slug: string; productCount: number }[];
  guides: { title: string; slug: string }[];
  suggestions: SearchSuggestion[];
  total: number;
  fallbackTerms: string[];
}
