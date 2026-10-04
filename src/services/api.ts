/**
 * Service layer — the ONLY module the UI talks to.
 *
 * Transport selection is driven entirely by `src/config/env.ts`:
 *   - development: mock data behind realistic latency/error simulation,
 *   - staging/production: HTTP through `request()`, mock disabled unless
 *     `VITE_ENABLE_MOCK=true` is set explicitly for a demo deployment.
 * A production build with no `VITE_API_URL` never falls back to mock data — it
 * fails loudly (see `src/components/system/ConfigErrorScreen.tsx`).
 * No component imports mock data directly, so nothing else has to change.
 */
import { mockProduct } from "@/data/mockProduct";
import { DEMO_ADDRESSES, DEMO_CREDENTIALS, DEMO_ORDERS, DEMO_USER } from "@/data/mockAccount";
import { catalogEntryById, productBySlug, relatedProducts } from "@/data/catalog";
import {
  findQuestionById,
  findReviewById,
  questionsForProduct,
  reviewsForProduct,
} from "@/data/reviews";
import type {
  Product,
  ProductQuestion,
  RelatedProduct,
  Review,
  StockStatus,
} from "@/types/product";
import { ApiError } from "@/types/product";
import { getDefaultSelection, getVariant } from "@/lib/product-logic";
import type { Address, AddressInput, LoginPayload, RegisterPayload, User } from "@/types/auth";
import type { CreateOrderPayload, Order } from "@/types/order";
import { readJSON, writeJSON } from "@/lib/localStore";
import { env } from "@/config/env";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */
export interface ApiClientConfig {
  baseUrl: string;
  useMock: boolean;
  /** simulated network latency in ms */
  latencyMs: number;
  /** 0..1 probability of an artificial failure, used to exercise error states */
  failureRate: number;
}

/**
 * Base URL now comes from `VITE_API_URL` (see `src/config/env.ts`), and mock
 * mode from `VITE_ENABLE_MOCK` — never from an empty string by accident.
 */
export const API_BASE_URL = env.api.url;

export const apiConfig: ApiClientConfig = {
  baseUrl: API_BASE_URL,
  useMock: env.mock.enabled,
  latencyMs: 620,
  failureRate: 0,
};

/**
 * Real HTTP transport. Wired but dormant while `useMock` is true — this is the
 * single place to add auth headers, retries, and response normalisation.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiConfig.baseUrl) {
    throw new ApiError(
      "إعداد ناقص: VITE_API_URL غير مضبوط لهذه البيئة.",
      "CONFIG_MISSING",
      503
    );
  }
  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 404) throw new ApiError("المنتج غير موجود", "NOT_FOUND", 404);
    throw new ApiError("تعذّر الاتصال بالخادم", "NETWORK", res.status);
  }
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Demo scenarios (used by the in-page QA switcher)                    */
/* ------------------------------------------------------------------ */
export type ScenarioId =
  | "default"
  | "low_stock"
  | "out_of_stock"
  | "coming_soon"
  | "not_found"
  | "network_error"
  | "no_images"
  | "no_reviews"
  | "promo_expired"
  | "cart_error"
  | "slow";

export const SCENARIOS: { id: ScenarioId; label: string; hint: string }[] = [
  { id: "default", label: "الحالة الطبيعية", hint: "نظام متوفر + عرض فعّال + تقييمات" },
  { id: "low_stock", label: "آخر الوحدات", hint: "متبقي وحدتان من الطراز المختار" },
  { id: "out_of_stock", label: "نفد المخزون", hint: "كل الطرازات نافدة مع تنبيه توفر" },
  { id: "coming_soon", label: "متوفر قريبًا", hint: "حجز مسبق بتاريخ وصول الشحنة" },
  { id: "promo_expired", label: "عرض منتهي", hint: "تحول تلقائي لحالة انتهاء العرض" },
  { id: "no_reviews", label: "بدون تقييمات", hint: "حالة فراغ لقسم التقييمات" },
  { id: "no_images", label: "بدون صور", hint: "Placeholder بعلامة رواء" },
  { id: "cart_error", label: "فشل إضافة للسلة", hint: "رسالة خطأ + إعادة محاولة" },
  { id: "network_error", label: "فشل تحميل المنتج", hint: "شاشة خطأ مع زر إعادة المحاولة" },
  { id: "not_found", label: "منتج غير موجود", hint: "استجابة 404" },
  { id: "slow", label: "اتصال بطيء", hint: "لمشاهدة حالات التحميل (Skeleton)" },
];

let currentScenario: ScenarioId = "default";

/**
 * Scenario switching is a development tool. In any build that is not running
 * the mock transport it is ignored, so a real shopper can never reach a
 * simulated stock/error state.
 */
export function setScenario(id: ScenarioId): void {
  if (!env.devTools || !apiConfig.useMock) return;
  currentScenario = id;
  apiConfig.latencyMs = id === "slow" ? 2400 : id === "default" ? 620 : 780;
  apiConfig.failureRate = 0;
}

export function getScenario(): ScenarioId {
  return env.devTools ? currentScenario : "default";
}

/* ------------------------------------------------------------------ */
/* Simulation helpers                                                  */
/* ------------------------------------------------------------------ */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(): number {
  return apiConfig.latencyMs * (0.75 + Math.random() * 0.5);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyScenario(product: Product): Product {
  if (!env.devTools || currentScenario === "default") return product;
  const next = clone(product);
  const setAll = (status: StockStatus, stock: number, availableAt?: string) => {
    next.variants = next.variants.map((v) => ({ ...v, status, stock, availableAt }));
    const selection = getDefaultSelection(next);
    const variant = getVariant(next, selection);
    if (variant) next.defaultVariantId = variant.id;
  };

  switch (currentScenario) {
    case "low_stock":
      next.variants = next.variants.map((v) => ({ ...v, status: "low_stock", stock: 2 }));
      next.badges = [...next.badges, { id: "b-last", label: "آخر الوحدات", tone: "danger", icon: "clock" }];
      break;
    case "out_of_stock":
      setAll("out_of_stock", 0);
      break;
    case "coming_soon":
      setAll("coming_soon", 0, new Date(Date.now() + 12 * 86_400_000).toISOString());
      break;
    case "promo_expired":
      next.promotions = next.promotions.map((p) =>
        p.highlight ? { ...p, endsAt: new Date(Date.now() - 3_600_000).toISOString() } : p
      );
      break;
    case "no_images":
      next.images = [];
      next.variants = next.variants.map((v) => ({ ...v, imageIds: [] }));
      break;
    default:
      break;
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Product API                                                         */
/* ------------------------------------------------------------------ */
export const productApi = {
  /** GET /v1/products/:slug */
  async getBySlug(slug: string): Promise<Product> {
    if (!apiConfig.useMock) return request<Product>(`/v1/products/${slug}`);
    await delay(jitter());

    if (currentScenario === "network_error") {
      throw new ApiError("تعذّر تحميل بيانات المنتج", "NETWORK_ERROR", 503);
    }
    if (currentScenario === "not_found" || slug === "__missing__") {
      throw new ApiError("لم نعثر على هذا المنتج", "NOT_FOUND", 404);
    }
    const product = productBySlug(slug) ?? (slug === mockProduct.slug ? mockProduct : undefined);
    if (!product) {
      throw new ApiError("لم نعثر على هذا المنتج", "NOT_FOUND", 404);
    }
    return applyScenario(product);
  },

  /** GET /v1/products/:id/related?group=similar,bought_together,recently_viewed */
  async listRelated(productId: string): Promise<RelatedProduct[]> {
    if (!apiConfig.useMock) return request<RelatedProduct[]>(`/v1/products/${productId}/related`);
    await delay(jitter() * 0.6);
    const resolvedSlug = catalogEntryById(productId)?.summary.slug ?? mockProduct.slug;
    return [
      ...relatedProducts(resolvedSlug, "similar", { limit: 6 }),
      ...relatedProducts(resolvedSlug, "bought_together", { limit: 4 }),
      ...relatedProducts(resolvedSlug, "recently_viewed", { limit: 4 }),
    ];
  },
};

/* ------------------------------------------------------------------ */
/* Reviews API                                                         */
/* ------------------------------------------------------------------ */
export interface ReviewQuery {
  productId: string;
  sort?: "recent" | "helpful" | "highest" | "lowest";
  rating?: number | "all";
  verifiedOnly?: boolean;
  withImagesOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReviewPage {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
}

export const reviewsApi = {
  /** GET /v1/products/:id/reviews */
  async list(query: ReviewQuery): Promise<ReviewPage> {
    const {
      productId,
      sort = "recent",
      rating = "all",
      verifiedOnly = false,
      withImagesOnly = false,
      search = "",
      page = 1,
      pageSize = 4,
    } = query;

    if (!apiConfig.useMock) {
      const params = new URLSearchParams({ sort: String(sort), page: String(page) });
      return request<ReviewPage>(`/v1/products/${productId}/reviews?${params}`);
    }

    await delay(jitter() * 0.85);

    const entry = catalogEntryById(productId);
    let items = clone(
      reviewsForProduct(productId, entry?.summary.rating, entry?.summary.reviewCount, entry?.summary.slug)
    );
    if (currentScenario === "no_reviews") items = [];
    if (rating !== "all") items = items.filter((r) => r.rating === rating);
    if (verifiedOnly) items = items.filter((r) => r.verifiedPurchase);
    if (withImagesOnly) items = items.filter((r) => r.images?.length);
    if (search.trim()) {
      const q = search.trim();
      items = items.filter((r) => r.body.includes(q) || r.title.includes(q) || r.author.includes(q));
    }

    items.sort((a, b) => {
      switch (sort) {
        case "helpful":
          return b.helpfulCount - a.helpfulCount;
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return { items, total: items.length, page, pageSize };
  },

  /** POST /v1/products/:id/reviews */
  async submit(
    productId: string,
    payload: { rating: number; title: string; body: string; author: string; city?: string }
  ): Promise<Review> {
    if (!apiConfig.useMock) {
      return request<Review>(`/v1/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await delay(700);
    if (currentScenario === "cart_error") {
      throw new ApiError("تعذّر إرسال تقييمك الآن", "VALIDATION", 422);
    }
    if (!payload.title.trim() || !payload.body.trim()) {
      throw new ApiError("يرجى كتابة عنوان ونص التقييم", "VALIDATION", 422);
    }
    return {
      id: `rev-local-${Date.now()}`,
      productId,
      author: payload.author.trim() || "عميل رواء",
      avatarHue: Math.floor(Math.random() * 360),
      city: payload.city ?? "الرياض",
      rating: Math.min(5, Math.max(1, Math.round(payload.rating))) as Review["rating"],
      title: payload.title.trim(),
      body: payload.body.trim(),
      createdAt: new Date().toISOString(),
      verifiedPurchase: false,
      helpfulCount: 0,
    };
  },

  /** POST /v1/reviews/:id/helpful */
  async markHelpful(reviewId: string): Promise<{ reviewId: string; helpfulCount: number }> {
    if (!apiConfig.useMock) return request(`/v1/reviews/${reviewId}/helpful`, { method: "POST" });
    await delay(320);
    const review = findReviewById(reviewId);
    if (!review) throw new ApiError("التقييم غير موجود", "NOT_FOUND", 404);
    review.helpfulCount += 1;
    return { reviewId, helpfulCount: review.helpfulCount };
  },
};

/* ------------------------------------------------------------------ */
/* Questions API                                                       */
/* ------------------------------------------------------------------ */
export const questionsApi = {
  /** GET /v1/products/:id/questions */
  async list(productId: string): Promise<ProductQuestion[]> {
    if (!apiConfig.useMock) return request<ProductQuestion[]>(`/v1/products/${productId}/questions`);
    await delay(jitter() * 0.5);
    const entry = catalogEntryById(productId);
    return clone(questionsForProduct(productId, entry?.summary.slug));
  },

  /** POST /v1/products/:id/questions */
  async ask(productId: string, payload: { question: string; author: string }): Promise<ProductQuestion> {
    if (!apiConfig.useMock) {
      return request<ProductQuestion>(`/v1/products/${productId}/questions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await delay(520);
    if (currentScenario === "cart_error") {
      throw new ApiError("تعذّر إرسال السؤال", "VALIDATION", 422);
    }
    return {
      id: `q-local-${Date.now()}`,
      productId,
      author: payload.author || "زائر",
      question: payload.question,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };
  },

  /** POST /v1/questions/:id/helpful */
  async markHelpful(questionId: string): Promise<{ questionId: string; helpfulCount: number }> {
    if (!apiConfig.useMock) return request(`/v1/questions/${questionId}/helpful`, { method: "POST" });
    await delay(260);
    const q = findQuestionById(questionId);
    if (q) q.helpfulCount += 1;
    return { questionId, helpfulCount: q?.helpfulCount ?? 1 };
  },
};

/* ------------------------------------------------------------------ */
/* Cart / Wishlist API                                                 */
/* ------------------------------------------------------------------ */
export interface AddToCartPayload {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  selectionLabel: string;
  unitPrice: number;
}

export const cartApi = {
  /** POST /v1/cart/items */
  async addItem(payload: AddToCartPayload): Promise<{ cartCount: number; lineId: string }> {
    if (!apiConfig.useMock) {
      return request("/v1/cart/items", { method: "POST", body: JSON.stringify(payload) });
    }
    await delay(720);
    if (currentScenario === "cart_error") {
      throw new ApiError(
        "تعذّرت إضافة المنتج إلى السلة بسبب ضغط على المستودع",
        "CART_UNAVAILABLE",
        503
      );
    }
    if (payload.quantity > 99) {
      throw new ApiError("الحد الأقصى للطلب هو 99 قطعة", "VALIDATION", 422);
    }
    return { cartCount: payload.quantity, lineId: `line-${Date.now()}` };
  },

  /** POST /v1/checkout/buy-now */
  async buyNow(payload: AddToCartPayload): Promise<{ checkoutToken: string }> {
    if (!apiConfig.useMock) {
      return request("/v1/checkout/buy-now", { method: "POST", body: JSON.stringify(payload) });
    }
    await delay(880);
    if (currentScenario === "cart_error") {
      throw new ApiError("تعذّر بدء عملية الشراء الآن", "CHECKOUT_UNAVAILABLE", 503);
    }
    return { checkoutToken: `chk_${Date.now()}` };
  },
};

export const wishlistApi = {
  /** POST /v1/wishlist/:productId  |  DELETE /v1/wishlist/:productId */
  async toggle(productId: string, active: boolean): Promise<{ active: boolean }> {
    if (!apiConfig.useMock) {
      return request(`/v1/wishlist/${productId}`, { method: active ? "POST" : "DELETE" });
    }
    await delay(280);
    return { active };
  },
};

export const compareApi = {
  /** POST /v1/compare/:productId */
  async toggle(productId: string, active: boolean): Promise<{ active: boolean }> {
    if (!apiConfig.useMock) {
      return request(`/v1/compare/${productId}`, { method: active ? "POST" : "DELETE" });
    }
    await delay(240);
    return { active };
  },
};

/* ------------------------------------------------------------------ */
/* Shipping / Pricing API                                              */
/* ------------------------------------------------------------------ */
export const shippingApi = {
  /** GET /v1/shipping/estimate?city=&variant=&qty= */
  async estimate(params: { cityId: string; variantId: string; quantity: number }) {
    if (!apiConfig.useMock) {
      const query = new URLSearchParams({ ...params, quantity: String(params.quantity) });
      return request(`/v1/shipping/estimate?${query}`);
    }
    await delay(420);
    return { ok: true as const, params };
  },
};

export const pricingApi = {
  /** POST /v1/pricing/quote — server-side re-validation of price, coupon and fees */
  async quote(payload: { variantId: string; quantity: number; coupon?: string }) {
    if (!apiConfig.useMock) {
      return request("/v1/pricing/quote", { method: "POST", body: JSON.stringify(payload) });
    }
    await delay(360);
    const variant = mockProduct.variants.find((v) => v.id === payload.variantId);
    if (!variant) throw new ApiError("الخيار غير صالح", "INVALID_VARIANT", 400);
    const subtotal = variant.price * payload.quantity;
    const coupon =
      payload.coupon?.toUpperCase() === "REWAA30" && subtotal >= 250 ? 30 : 0;
    const shipping = subtotal - coupon >= mockProduct.shipping.freeShippingThreshold ? 0 : mockProduct.shipping.flatRate;
    return {
      subtotal,
      couponDiscount: coupon,
      shipping,
      vatIncluded: Math.round((subtotal - subtotal / 1.15) * 100) / 100,
      total: subtotal - coupon + shipping,
      currency: "SAR" as const,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Auth API                                                             */
/* ------------------------------------------------------------------ */
interface StoredUser extends User {
  password: string;
}

const USERS_KEY = "rewaa_users_db";
const OTP_KEY = "rewaa_otp_db";

function seedUsers(): StoredUser[] {
  const existing = readJSON<StoredUser[] | null>(USERS_KEY, null);
  if (existing && existing.length > 0) return existing;
  const seeded: StoredUser[] = [{ ...DEMO_USER, password: DEMO_CREDENTIALS.password }];
  writeJSON(USERS_KEY, seeded);
  return seeded;
}

function stripPassword(user: StoredUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

export const authApi = {
  /** POST /v1/auth/login */
  async login(payload: LoginPayload): Promise<User> {
    if (!apiConfig.useMock) {
      return request<User>("/v1/auth/login", { method: "POST", body: JSON.stringify(payload) });
    }
    await delay(680);
    const users = seedUsers();
    const email = payload.email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === email);
    if (!found || found.password !== payload.password) {
      throw new ApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة", "AUTH_INVALID", 401);
    }
    return stripPassword(found);
  },

  /** POST /v1/auth/register */
  async register(payload: RegisterPayload): Promise<User> {
    if (!apiConfig.useMock) {
      return request<User>("/v1/auth/register", { method: "POST", body: JSON.stringify(payload) });
    }
    await delay(780);
    const users = seedUsers();
    const email = payload.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw new ApiError("هذا البريد الإلكتروني مُسجَّل بالفعل، جرّب تسجيل الدخول.", "EMAIL_TAKEN", 409);
    }
    const user: StoredUser = {
      id: `usr_${Date.now()}`,
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      createdAt: new Date().toISOString(),
      password: payload.password,
    };
    writeJSON(USERS_KEY, [...users, user]);
    return stripPassword(user);
  },

  /** POST /v1/auth/otp/send — in production this triggers a real SMS; the mock
   *  returns the code only so the demo UI can display it inline. */
  async sendOtp(phone: string): Promise<{ sentTo: string; demoCode: string }> {
    if (!apiConfig.useMock) {
      return request("/v1/auth/otp/send", { method: "POST", body: JSON.stringify({ phone }) });
    }
    await delay(520);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const store = readJSON<Record<string, string>>(OTP_KEY, {});
    store[phone] = code;
    writeJSON(OTP_KEY, store);
    return { sentTo: phone, demoCode: code };
  },

  /** POST /v1/auth/otp/verify */
  async verifyOtp(phone: string, code: string): Promise<{ verified: true }> {
    if (!apiConfig.useMock) {
      return request("/v1/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) });
    }
    await delay(420);
    const store = readJSON<Record<string, string>>(OTP_KEY, {});
    if (store[phone] !== code) {
      throw new ApiError("رمز التحقق غير صحيح", "OTP_INVALID", 422);
    }
    return { verified: true };
  },

  /**
   * POST /v1/auth/password/forgot
   * Always resolves — the response never reveals whether the identifier is
   * registered. In the mock the code is returned so the demo can display it.
   */
  async requestPasswordReset(identifier: string): Promise<{ sentTo: string; demoCode: string }> {
    if (!apiConfig.useMock) {
      return request("/v1/auth/password/forgot", { method: "POST", body: JSON.stringify({ identifier }) });
    }
    await delay(560);
    const clean = identifier.trim().toLowerCase();
    const users = seedUsers();
    const found = users.find(
      (user) => user.email.toLowerCase() === clean || user.phone.replace(/\s/g, "") === identifier.replace(/\s/g, "")
    );
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const store = readJSON<Record<string, string>>(OTP_KEY, {});
    store[clean] = code;
    writeJSON(OTP_KEY, store);
    const phone = found?.phone ?? "05XXXXXXXX";
    const masked = `${phone.slice(0, 3)}****${phone.slice(-3)}`;
    return { sentTo: masked, demoCode: code };
  },

  /** POST /v1/auth/password/reset — code must match the one issued above. */
  async resetPassword(identifier: string, code: string, password: string): Promise<User> {
    if (!apiConfig.useMock) {
      return request<User>("/v1/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ identifier, code, password }),
      });
    }
    await delay(720);
    const clean = identifier.trim().toLowerCase();
    const store = readJSON<Record<string, string>>(OTP_KEY, {});
    if (store[clean] !== code) {
      throw new ApiError("رمز التحقق غير صحيح", "OTP_INVALID", 422);
    }
    const users = seedUsers();
    const index = users.findIndex(
      (user) => user.email.toLowerCase() === clean || user.phone.replace(/\s/g, "") === identifier.replace(/\s/g, "")
    );
    if (index === -1) {
      throw new ApiError("لم نجد حسابًا مطابقًا", "USER_NOT_FOUND", 404);
    }
    const updated: StoredUser = { ...users[index], password };
    users[index] = updated;
    writeJSON(USERS_KEY, users);
    delete store[clean];
    writeJSON(OTP_KEY, store);
    return stripPassword(updated);
  },
};

/* ------------------------------------------------------------------ */
/* Address book API                                                    */
/* ------------------------------------------------------------------ */
const ADDRESSES_KEY = "rewaa_addresses_db";

function readAddressBook(): Record<string, Address[]> {
  const db = readJSON<Record<string, Address[]>>(ADDRESSES_KEY, {});
  if (!db[DEMO_USER.id]) db[DEMO_USER.id] = DEMO_ADDRESSES;
  return db;
}

export const addressApi = {
  /** GET /v1/users/:id/addresses */
  async list(userId: string): Promise<Address[]> {
    if (!apiConfig.useMock) return request<Address[]>(`/v1/users/${userId}/addresses`);
    await delay(340);
    const db = readAddressBook();
    return db[userId] ?? [];
  },

  /** POST /v1/users/:id/addresses */
  async create(userId: string, input: AddressInput): Promise<Address> {
    if (!apiConfig.useMock) {
      return request<Address>(`/v1/users/${userId}/addresses`, { method: "POST", body: JSON.stringify(input) });
    }
    await delay(480);
    const db = readAddressBook();
    const list = db[userId] ?? [];
    const makeDefault = input.isDefault ?? list.length === 0;
    const address: Address = { ...input, id: `addr_${Date.now()}`, isDefault: makeDefault };
    const next = makeDefault ? list.map((a) => ({ ...a, isDefault: false })) : list;
    db[userId] = [...next, address];
    writeJSON(ADDRESSES_KEY, db);
    return address;
  },

  /** PATCH /v1/users/:id/addresses/:addressId */
  async update(userId: string, address: Address): Promise<Address> {
    if (!apiConfig.useMock) {
      return request<Address>(`/v1/users/${userId}/addresses/${address.id}`, {
        method: "PATCH",
        body: JSON.stringify(address),
      });
    }
    await delay(420);
    const db = readAddressBook();
    const list = db[userId] ?? [];
    db[userId] = list.map((a) =>
      a.id === address.id ? address : address.isDefault ? { ...a, isDefault: false } : a
    );
    writeJSON(ADDRESSES_KEY, db);
    return address;
  },

  /** DELETE /v1/users/:id/addresses/:addressId */
  async remove(userId: string, addressId: string): Promise<{ addressId: string }> {
    if (!apiConfig.useMock) {
      return request(`/v1/users/${userId}/addresses/${addressId}`, { method: "DELETE" });
    }
    await delay(360);
    const db = readAddressBook();
    db[userId] = (db[userId] ?? []).filter((a) => a.id !== addressId);
    writeJSON(ADDRESSES_KEY, db);
    return { addressId };
  },

  /** POST /v1/users/:id/addresses/:addressId/default */
  async setDefault(userId: string, addressId: string): Promise<Address[]> {
    if (!apiConfig.useMock) {
      return request(`/v1/users/${userId}/addresses/${addressId}/default`, { method: "POST" });
    }
    await delay(300);
    const db = readAddressBook();
    db[userId] = (db[userId] ?? []).map((a) => ({ ...a, isDefault: a.id === addressId }));
    writeJSON(ADDRESSES_KEY, db);
    return db[userId];
  },
};

/* ------------------------------------------------------------------ */
/* Orders API                                                           */
/* ------------------------------------------------------------------ */
const ORDERS_KEY = "rewaa_orders_db";

function readOrders(): Order[] {
  const stored = readJSON<Order[] | null>(ORDERS_KEY, null);
  if (stored && stored.length > 0) return stored;
  writeJSON(ORDERS_KEY, DEMO_ORDERS);
  return DEMO_ORDERS;
}

function nextOrderNumber(existing: Order[]): string {
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;
  return `RWA-${stamp}-${1000 + existing.length + 1}`;
}

export const ordersApi = {
  /** POST /v1/orders — creates the order then (conceptually) the Payment API confirms it. */
  async create(payload: CreateOrderPayload): Promise<Order> {
    if (!apiConfig.useMock) return request<Order>("/v1/orders", { method: "POST", body: JSON.stringify(payload) });

    await delay(900);
    if (currentScenario === "cart_error") {
      throw new ApiError("تعذّر إتمام عملية الدفع، لم يتم خصم أي مبلغ.", "PAYMENT_FAILED", 402);
    }

    const existing = readOrders();
    const now = new Date();
    const order: Order = {
      id: `ord_${Date.now()}`,
      number: nextOrderNumber(existing),
      status: "confirmed",
      items: payload.items,
      address: payload.address,
      shippingMethod: payload.shippingMethod,
      shippingLabel: payload.shippingLabel,
      paymentMethod: payload.paymentMethod,
      paymentLabel: payload.paymentLabel,
      couponCode: payload.couponCode,
      subtotal: payload.subtotal,
      discount: payload.discount,
      shippingCost: payload.shippingCost,
      vatIncluded: payload.vatIncluded,
      total: payload.total,
      createdAt: now.toISOString(),
      estimatedDeliveryFrom: new Date(now.getTime() + 86_400_000).toISOString(),
      estimatedDeliveryTo: new Date(now.getTime() + 3 * 86_400_000).toISOString(),
      timeline: [
        { status: "confirmed", label: "تم تأكيد الطلب واستلام الدفع", at: now.toISOString() },
        { status: "preparing", label: "جارٍ تجهيز الطلب" },
        { status: "shipped", label: "تم شحن الطلب" },
        { status: "delivered", label: "تم التسليم" },
      ],
      userId: payload.userId,
      guestEmail: payload.guestEmail,
    };

    writeJSON(ORDERS_KEY, [order, ...existing]);
    return order;
  },

  /** GET /v1/orders?userId=|guestToken= */
  async list(owner: { userId?: string; guestToken?: string }): Promise<Order[]> {
    if (!apiConfig.useMock) {
      const query = new URLSearchParams(owner as Record<string, string>);
      return request<Order[]>(`/v1/orders?${query}`);
    }
    await delay(420);
    const all = readOrders();
    return all
      .filter((order) => (owner.userId ? order.userId === owner.userId : order.userId === undefined))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /** GET /v1/orders/:id */
  async get(orderId: string): Promise<Order> {
    if (!apiConfig.useMock) return request<Order>(`/v1/orders/${orderId}`);
    await delay(320);
    const order = readOrders().find((o) => o.id === orderId);
    if (!order) throw new ApiError("لم نعثر على هذا الطلب", "NOT_FOUND", 404);
    return order;
  },
};
