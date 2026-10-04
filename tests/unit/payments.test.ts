import { describe, expect, it, beforeEach } from "vitest";
import { payments, DEMO_TEST_CARDS, type PaymentProvider } from "@/services/payments";
import { ApiError } from "@/types/product";

const validCard = {
  cardNumber: DEMO_TEST_CARDS[0].number,
  holderName: "عميل تجريبي",
  expiry: "12/30",
  cvv: "123",
};

describe("payment provider abstraction", () => {
  beforeEach(() => payments.reset());

  it("never asks the UI for a live gateway in a non-production build", () => {
    const status = payments.status();
    expect(status.cardFormMode).not.toBe("hosted-fields");
    expect(status.testMode || !status.available).toBe(true);
  });

  it("refuses real-looking card numbers in the demo provider", async () => {
    if (!payments.status().available) return; // production-style build: nothing to test here
    await expect(payments.tokenizeCard({ ...validCard, cardNumber: "4111111111111111" }, "visa")).rejects.toBeInstanceOf(
      ApiError
    );
  });

  it("returns an opaque token and drops the card fields", async () => {
    if (!payments.status().available) return;
    const token = await payments.tokenizeCard(validCard, "mada");
    expect(token.id).toMatch(/^tok_/);
    expect(token.test).toBe(true);
    expect(token.label).toContain("4242");
    // The token is the only thing that may travel further; no PAN anywhere.
    expect(JSON.stringify(token)).not.toContain(validCard.cardNumber);
    expect(JSON.stringify(token)).not.toContain(validCard.cvv);
  });

  it("surfaces gateway declines as an ApiError", async () => {
    if (!payments.status().available) return;
    await expect(
      payments.tokenizeCard({ ...validCard, cardNumber: "4000000000000002" }, "visa")
    ).rejects.toMatchObject({ code: "CARD_DECLINED" });
  });

  it("keeps offline methods usable when no gateway is connected", () => {
    const disabled: PaymentProvider = {
      id: "none",
      displayName: "غير مهيأة",
      live: false,
      available: false,
      cardFormMode: "none",
      notice: "غير مهيأ",
      tokenizeCard: async () => {
        throw new ApiError("غير مهيأ", "PAYMENT_NOT_CONFIGURED", 503);
      },
      tokenizeWallet: async () => {
        throw new ApiError("غير مهيأ", "PAYMENT_NOT_CONFIGURED", 503);
      },
    };
    payments.setProvider(disabled);
    expect(payments.isMethodUsable("cod")).toBe(true);
    expect(payments.isMethodUsable("bank")).toBe(true);
    expect(payments.isMethodUsable("mada")).toBe(false);
    expect(payments.status().cardFormMode).toBe("none");
  });
});
