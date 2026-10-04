/**
 * Editorial & commercial content types — guides, FAQs, branches, offers,
 * service offerings, maintenance plans, B2B solutions and legal documents.
 * Mirrors the future CMS/Content API contract.
 */

/* -------------------------------- Guides -------------------------------- */

export interface ArticleSection {
  id: string;
  heading: string;
  /** Paragraphs of the section. */
  body: string[];
  bullets?: string[];
  callout?: { tone: "info" | "warning" | "success"; title: string; body: string };
  table?: { columns: string[]; rows: string[][] };
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  categoryId: string;
  categoryLabel: string;
  heroImage: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  sections: ArticleSection[];
  faqs: { q: string; a: string }[];
  relatedProductSlugs: string[];
  relatedServiceSlug?: string;
  tags: string[];
  featured?: boolean;
}

/* --------------------------------- FAQs --------------------------------- */

export type FaqGroupId =
  | "products"
  | "installation"
  | "maintenance"
  | "shipping"
  | "payment"
  | "warranty"
  | "returns"
  | "water-quality"
  | "commercial";

export interface FaqItem {
  id: string;
  group: FaqGroupId;
  question: string;
  answer: string;
  relatedGuideSlug?: string;
}

export const FAQ_GROUP_LABELS: Record<FaqGroupId, string> = {
  products: "المنتجات والاختيار",
  installation: "التركيب والتشغيل",
  maintenance: "الصيانة والشمعات",
  shipping: "الشحن والتسليم",
  payment: "الدفع والتقسيط",
  warranty: "الضمان",
  returns: "الإرجاع والاستبدال",
  "water-quality": "جودة المياه",
  commercial: "المشاريع التجارية",
};

/* -------------------------------- Branches ------------------------------- */

export interface Branch {
  id: string;
  name: string;
  city: string;
  cityId: string;
  district: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  hoursNote?: string;
  services: string[];
  /** PLACEHOLDER coordinates used only to build a directions deep link. */
  coordinates: { lat: number; lng: number };
  mapsQuery: string;
  isFlagship?: boolean;
}

/* -------------------------------- Offers -------------------------------- */

export type OfferType = "product" | "bundle" | "installation" | "maintenance" | "coupon" | "seasonal";

export interface Offer {
  id: string;
  type: OfferType;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  code?: string;
  /** Absolute ISO dates — a countdown is only rendered when endsAt exists. */
  startsAt: string;
  endsAt?: string;
  terms: string[];
  productSlugs?: string[];
  bundleItems?: { label: string; slug?: string }[];
  href?: string;
  ctaLabel: string;
  savingsLabel?: string;
  tone: "aqua" | "brand" | "flow" | "danger";
}

/* ----------------------------- Announcements ---------------------------- */

export type AnnouncementKind = "shipping" | "service" | "tool" | "maintenance" | "offer";

/**
 * Short homepage notices (shipping thresholds, available tools, service
 * reminders). Nothing here is a marketing claim: each notice restates a
 * configured value or links to a feature that already exists in the store.
 *
 * A notice is shown only while it is scheduled to be live: `startsAt` (if any)
 * must be in the past and `endsAt` (if any) in the future. Notices without
 * dates are evergreen.
 */
export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  icon: string;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
  startsAt?: string;
  endsAt?: string;
  /** Featured notices take the wider slot on large screens. */
  featured?: boolean;
  tone: "brand" | "aqua" | "success" | "warning";
}

/* ------------------------------- Services ------------------------------- */

export interface ServiceOffering {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  summary: string;
  icon: string;
  startingPrice?: number;
  priceNote: string;
  durationLabel: string;
  coverageNote: string;
  includes: { title: string; body: string }[];
  process: { step: string; title: string; body: string }[];
  requirements?: string[];
  signals?: { title: string; body: string }[];
  faqIds?: string[];
  faqs?: { q: string; a: string }[];
  relatedGuideSlugs?: string[];
  relatedCategorySlug?: string;
  ctaLabel: string;
  heroImage?: string;
}

export interface MaintenancePlan {
  id: string;
  name: string;
  badge?: string;
  recommended?: boolean;
  pricePerYear: number;
  compareAtPrice?: number;
  visits: number;
  cartridgesIncluded: boolean;
  cartridgeSets: number;
  responseHours: number;
  priority: "قياسية" | "عالية" | "عاجلة";
  includes: string[];
  excludes: string[];
  bestFor: string;
  /** Months between recommended cartridge changes — drives the reminder feature. */
  cartridgeIntervalMonths: number;
}

/* ------------------------------ Commercial ------------------------------ */

export interface Industry {
  id: string;
  name: string;
  icon: string;
  problem: string;
  solution: string;
  recommendedSystems: string[];
  capacityHint: string;
}

export interface CommercialCaseStudy {
  id: string;
  sector: string;
  city: string;
  challenge: string;
  solution: string;
  outcome: string;
  /** Demo block — clearly labelled as illustrative in the UI. */
  metrics: { label: string; value: string }[];
  equipment: string[];
}

export interface CommercialSolution {
  id: string;
  name: string;
  description: string;
  capacity: string;
  bestFor: string;
  highlights: string[];
  icon: string;
}

/* ------------------------------ Shop by need ----------------------------- */

export interface NeedSolution {
  id: string;
  slug: string;
  title: string;
  problem: string;
  icon: string;
  /** Short guidance shown on the landing card. */
  guidance: string;
  recommendedSystemTypes: string[];
  recommendedTags: string[];
  categorySlug: string;
  relatedGuideSlug?: string;
  suggestedServiceSlug?: string;
}

/* --------------------------------- Legal -------------------------------- */

export interface LegalSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
  /** Rendered at the top: this is a template, not final legal advice. */
  disclaimer: string;
}

/* ------------------------------- Company -------------------------------- */

export interface CompanyValue {
  title: string;
  body: string;
  icon: string;
}

export interface CompanyStat {
  label: string;
  value: string;
  /** When true the UI renders the placeholder flag next to the number. */
  placeholder?: boolean;
}
