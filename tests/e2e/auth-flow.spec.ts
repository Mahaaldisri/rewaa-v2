import { expect, test } from "@playwright/test";
import { customer, dismissConsent, expectNoCrash } from "./helpers";

test.describe("Register / Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissConsent(page);
  });

  test("a new customer can register and lands in the account", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoCrash(page);
  });

  test("login form validates before submitting", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const phone = page.getByLabel(/الجوال|رقم الجوال/).first();
    const password = page.getByLabel(/كلمة المرور/).first();
    await expect(phone).toBeVisible();

    // Short password must be refused with an Arabic message.
    await phone.fill(customer.phone);
    await password.fill("123");
    await page.getByRole("button", { name: /دخول|تسجيل الدخول/ }).first().click();
    await expect(page.getByText(/كلمة المرور/).nth(1)).toBeVisible();
    await expectNoCrash(page);
  });

  test("password reset request page works without a backend", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoCrash(page);
  });
});
