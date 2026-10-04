import type { PaymentMethodId } from "@/types/order";
import { ApiError } from "@/types/product";
import { env } from "@/config/env";

/**
 * Payment provider abstraction.
 *
 * The storefront NEVER keeps, logs or transmits a raw card number:
 *   - `hosted-fields` (production): the card fields are rendered by the gateway's
 *     own SDK inside its own iframes; the app only ever receives an opaque
 *     token. Wiring it means loading the gateway SDK and calling
 *     `window.__REWAA_PAYMENT_SDK__.createToken()` below — no other UI change.
 *   - `demo` (development only): a sandbox that accepts documented test card
 *     numbers, produces a fake token, and discards the input immediately.
 *   - `none` (production default): the card form is not rendered at all; the
 *     checkout tells the shopper that online payment is not enabled yet.
 *
 * No credential of any kind lives in this file.
 */

export type PaymentProviderId = "demo" | "hosted-fields" | "none";
export type CardFormMode = "none" | "app-form" | "hosted-fields";

export interface PaymentToken {
  /** Opaque reference the backend/gateway needs — never a PAN. */
  id: string;
  provider: PaymentProviderId;
  method: PaymentMethodId;
  /** Safe display label, e.g. "مدى •••• 4242". */
  label: string;
  brand?: string;
  createdAt: string;
  /** True when produced by the sandbox — drives the "no money moves" notice. */
  test: boolean;
}

export interface CardInput {
  cardNumber: string;
  holderName: string;
  expiry: string;
  cvv: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly displayName: string;
  /** True only when a live gateway is connected and could really charge. */
  readonly live: boolean;
  /** Whether this build can produce a token at all. */
  readonly available: boolean;
  readonly cardFormMode: CardFormMode;
  /** Explains, in shopper-facing Arabic, what the current mode means. */
  readonly notice: string;
  tokenizeCard(input: CardInput, method: PaymentMethodId): Promise<PaymentToken>;
  tokenizeWallet(method: PaymentMethodId, reference: string): Promise<PaymentToken>;
}

/** Documented sandbox cards. Any other number is rejected in demo mode too. */
export const DEMO_TEST_CARDS = [
  { number: "4242424242424242", brand: "visa", label: "فيزا — اختبار ناجح" },
  { number: "5555555555554444", brand: "mastercard", label: "ماستركارد — اختبار ناجح" },
  { number: "4000000000000002", brand: "visa", label: "فيزا — اختبار رفض" },
] as const;

const DEMO_REJECT_CARD = "4000000000000002";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function last4(value: string): string {
  return digitsOnly(value).slice(-4);
}

function detectBrand(number: string): string {
  const digits = digitsOnly(number);
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^(5[06-9]|6\d)/.test(digits)) return "mada";
  if (/^3[47]/.test(digits)) return "amex";
  return "card";
}

/* ------------------------------------------------------------------ */
/* Demo provider — development only                                    */
/* ------------------------------------------------------------------ */

const demoProvider: PaymentProvider = {
  id: "demo",
  displayName: "بيئة تجريبية (بدون بوابة دفع)",
  live: false,
  // Available only where it is explicitly allowed: development / demo builds.
  available: env.devTools || env.mock.enabled,
  cardFormMode: "app-form",
  notice: "وضع تجريبي: لا توجد بوابة دفع متصلة، ولن يُخصم أي مبلغ. تُقبل أرقام اختبار فقط.",
  async tokenizeCard(input, method) {
    const digits = digitsOnly(input.cardNumber);
    const known = DEMO_TEST_CARDS.some((card) => card.number === digits);
    if (!known) {
      throw new ApiError(
        "وضع تجريبي: استخدم رقم بطاقة اختبار. لا تُدخل بيانات بطاقة حقيقية.",
        "DEMO_CARD_REQUIRED",
        422
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (digits === DEMO_REJECT_CARD) {
      throw new ApiError("تم رفض البطاقة (محاكاة فشل من البوابة التجريبية).", "CARD_DECLINED", 402);
    }
    // The card input is dropped here on purpose — nothing is persisted.
    return {
      id: `tok_demo_${Date.now().toString(36)}`,
      provider: "demo",
      method,
      label: `${method === "mada" ? "مدى" : "بطاقة"} •••• ${last4(input.cardNumber)}`,
      brand: detectBrand(input.cardNumber),
      createdAt: new Date().toISOString(),
      test: true,
    };
  },
  async tokenizeWallet(method) {
    await new Promise((resolve) => setTimeout(resolve, 420));
    return {
      id: `tok_demo_wallet_${Date.now().toString(36)}`,
      provider: "demo",
      method,
      label: method === "applepay" ? "Apple Pay (تجريبي)" : "محفظة إلكترونية (تجريبي)",
      createdAt: new Date().toISOString(),
      test: true,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Hosted-fields provider — production                                 */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    __REWAA_PAYMENT_SDK__?: {
      /** Loads the gateway's hosted fields into the given container. */
      mount?: (options: { container: HTMLElement; publicKey: string; amount: number; currency: string }) => void;
      /** Returns an opaque token created by the gateway (never a PAN). */
      createToken?: () => Promise<{ id: string; brand?: string; last4?: string }>;
    };
  }
}

const hostedFieldsProvider: PaymentProvider = {
  id: "hosted-fields",
  displayName: "بوابة دفع (حقول مستضافة)",
  live: true,
  available: env.api.configured && env.payments.publicKey.length > 0,
  cardFormMode: "hosted-fields",
  notice: "تُدخل بيانات البطاقة داخل حقول بوابة الدفع المستضافة، ولا تمر عبر خوادم المتجر.",
  async tokenizeCard() {
    const sdk = typeof window === "undefined" ? undefined : window.__REWAA_PAYMENT_SDK__;
    if (!sdk?.createToken) {
      throw new ApiError(
        "بوابة الدفع غير محمّلة. تأكد من تحميل SDK البوابة وإعداد VITE_PAYMENT_PUBLIC_KEY.",
        "PAYMENT_SDK_MISSING",
        503
      );
    }
    const token = await sdk.createToken();
    return {
      id: token.id,
      provider: "hosted-fields",
      method: "mada",
      label: `${token.brand ?? "بطاقة"} •••• ${token.last4 ?? "****"}`,
      brand: token.brand,
      createdAt: new Date().toISOString(),
      test: false,
    };
  },
  async tokenizeWallet(method, reference) {
    return {
      id: `tok_${reference}`,
      provider: "hosted-fields",
      method,
      label: reference,
      createdAt: new Date().toISOString(),
      test: false,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Disabled provider — production without a gateway                    */
/* ------------------------------------------------------------------ */

const disabledProvider: PaymentProvider = {
  id: "none",
  displayName: "غير مهيأة",
  live: false,
  available: false,
  cardFormMode: "none",
  notice: "الدفع الإلكتروني غير مهيأ في هذه البيئة. يمكنك إتمام الطلب بالدفع عند الاستلام أو التحويل البنكي.",
  async tokenizeCard() {
    throw new ApiError(
      "الدفع الإلكتروني غير مهيأ لهذه البيئة. اختر وسيلة دفع أخرى أو تواصل معنا.",
      "PAYMENT_NOT_CONFIGURED",
      503
    );
  },
  async tokenizeWallet() {
    throw new ApiError(
      "المحفظة الإلكترونية غير مهيأة لهذه البيئة. اختر وسيلة دفع أخرى.",
      "PAYMENT_NOT_CONFIGURED",
      503
    );
  },
};

/* ------------------------------------------------------------------ */
/* Facade                                                              */
/* ------------------------------------------------------------------ */

function pickProvider(): PaymentProvider {
  switch (env.payments.provider) {
    case "hosted-fields":
      return hostedFieldsProvider.available ? hostedFieldsProvider : disabledProvider;
    case "demo":
      return demoProvider.available ? demoProvider : disabledProvider;
    default:
      return disabledProvider;
  }
}

let active = pickProvider();

/** Payment methods that actually work in this build (drives the method grid). */
function usableMethods(): PaymentMethodId[] {
  if (!active.available) {
    // Offline methods need no gateway and stay available everywhere.
    return ["cod", "bank"];
  }
  if (active.id === "demo") {
    return ["mada", "visa", "mastercard", "applepay", "stcpay", "tabby", "tamara", "cod", "bank"];
  }
  return ["mada", "visa", "mastercard", "applepay", "stcpay", "tabby", "tamara", "cod", "bank"];
}

export const payments = {
  /** Currently selected provider (read-only view for the UI). */
  current(): PaymentProvider {
    return active;
  },

  /** Allows tests and local overrides to swap the provider. */
  setProvider(provider: PaymentProvider): void {
    active = provider;
  },

  reset(): void {
    active = pickProvider();
  },

  status(): {
    id: PaymentProviderId;
    displayName: string;
    live: boolean;
    available: boolean;
    cardFormMode: CardFormMode;
    notice: string;
    methods: PaymentMethodId[];
    testMode: boolean;
  } {
    return {
      id: active.id,
      displayName: active.displayName,
      live: active.live,
      available: active.available,
      cardFormMode: active.cardFormMode,
      notice: active.notice,
      methods: usableMethods(),
      testMode: active.id === "demo",
    };
  },

  isMethodUsable(method: PaymentMethodId): boolean {
    return usableMethods().includes(method);
  },

  /** Creates an opaque token. Raw card values must never leave this call. */
  async tokenizeCard(input: CardInput, method: PaymentMethodId): Promise<PaymentToken> {
    return active.tokenizeCard(input, method);
  },

  async tokenizeWallet(method: PaymentMethodId, reference: string): Promise<PaymentToken> {
    return active.tokenizeWallet(method, reference);
  },
};

export type { PaymentMethodId };
