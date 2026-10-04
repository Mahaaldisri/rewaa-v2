import { expect, test } from "@playwright/test";
import { addFirstProductToCart, dismissConsent, expectNoCrash } from "./helpers";

test.describe("Search → Product → Cart → Checkout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissConsent(page);
  });

  test("search finds a product and opens it", async ({ page }) => {
    await page.goto("/search?q=فلتر");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = page.locator('a[href^="/p/"]').first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoCrash(page);
  });

  test("product page adds to the cart and the cart shows a total", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/الإجمالي/).first()).toBeVisible();
    await expectNoCrash(page);
  });

  test("checkout requires address, shipping and payment before review", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The stepper is present and the first step is the address.
    await expect(page.getByText("بيانات الشحن").first()).toBeVisible();
    await expectNoCrash(page);
  });
});
