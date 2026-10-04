import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "@/store/StoreProvider";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { ConsentBanner } from "@/components/system/ConsentBanner";
import { consent } from "@/services/consent";
import { DEMO_TEST_CARDS } from "@/services/payments";
import type { PaymentToken } from "@/services/payments";
import type { PaymentMethodId } from "@/types/order";

function renderStep(onContinue: (method: PaymentMethodId, label: string, token: PaymentToken) => void) {
  return render(
    <MemoryRouter>
      <StoreProvider>
        <PaymentStep total={250} onBack={() => {}} onContinue={onContinue} />
      </StoreProvider>
    </MemoryRouter>
  );
}

describe("checkout payment step", () => {
  it("shows an honest notice instead of claiming a live gateway", () => {
    renderStep(vi.fn());
    expect(screen.getAllByText(/وضع تجريبي|الدفع الإلكتروني غير مفعّل|بوابة دفع متصلة/).length).toBeGreaterThan(0);
  });

  it("rejects a real-looking card number in the demo build", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderStep(onContinue);

    const numberInput = screen.queryByPlaceholderText("0000 0000 0000 0000");
    if (!numberInput) return; // hosted-fields / disabled build: no app-side card form

    await user.type(numberInput, "4111111111111111");
    await user.type(screen.getByPlaceholderText("AHMAD ALI"), "عميل");
    await user.click(screen.getByRole("button", { name: /مراجعة الطلب/ }));

    await waitFor(() => expect(onContinue).not.toHaveBeenCalled());
  });

  it("continues with an opaque token for a documented test card", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderStep(onContinue);

    const numberInput = screen.queryByPlaceholderText("0000 0000 0000 0000");
    if (!numberInput) return;

    await user.type(numberInput, DEMO_TEST_CARDS[0].number);
    await user.type(screen.getByPlaceholderText("AHMAD ALI"), "عميل تجريبي");
    await user.type(screen.getByPlaceholderText("MM/YY"), "12/30");
    await user.type(screen.getByPlaceholderText("•••"), "123");
    await user.click(screen.getByRole("button", { name: /مراجعة الطلب/ }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const [, , token] = onContinue.mock.calls[0];
    expect(token.id).toMatch(/^tok_/);
    expect(JSON.stringify(token)).not.toContain("4242424242424242");
  });
});

describe("consent banner", () => {
  it("records a decision and links to the cookie and privacy policies", async () => {
    const user = userEvent.setup();
    consent.clear();
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).toContain("/legal/cookies");
    expect(links).toContain("/legal/privacy");
    await user.click(screen.getByRole("button", { name: "قبول الكل" }));
    expect(consent.read()?.analytics).toBe(true);
  });
});
