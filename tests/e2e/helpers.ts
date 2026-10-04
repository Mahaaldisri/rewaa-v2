import { expect, type Page } from "@playwright/test";

/**
 * Shared steps for the E2E flows. Selectors prefer accessible roles and Arabic
 * labels (what a shopper actually sees) over CSS classes.
 */

/** Deterministic customer data for the mock service layer. */
export const customer = {
  name: "عميل اختباري",
  phone: "0512345678",
  email: "e2e@rewaa.test",
  password: "Rewaa!Test2026",
  city: "الرياض",
  district: "العليا",
  addressLine: "طريق الملك فهد، مبنى 12",
};

export async function dismissConsent(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "قبول الكل" });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

export async function expectNoCrash(page: Page): Promise<void> {
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByText("حدث خطأ غير متوقع")).toHaveCount(0);
}

export async function addFirstProductToCart(page: Page): Promise<void> {
  await page.goto("/c/water-filters");
  const firstProduct = page.locator('a[href^="/p/"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const addToCart = page.getByRole("button", { name: /أضف إلى السلة|أضف للسلة/ }).first();
  await addToCart.click();
  await expect(page.getByText(/تمت الإضافة|أُضيف|في السلة/).first()).toBeVisible({ timeout: 10_000 });
}

export async function fillAddress(page: Page): Promise<void> {
  await page.getByLabel(/الاسم|الاسم الكامل/).first().fill(customer.name);
  await page.getByLabel(/الجوال|رقم الجوال/).first().fill(customer.phone);
  const email = page.getByLabel(/البريد الإلكتروني/).first();
  if (await email.isVisible().catch(() => false)) await email.fill(customer.email);
  const city = page.getByLabel(/المدينة/).first();
  if (await city.isVisible().catch(() => false)) {
    await city.selectOption({ index: 1 }).catch(async () => {
      await city.fill(customer.city);
    });
  }
  const district = page.getByLabel(/الحي/).first();
  if (await district.isVisible().catch(() => false)) {
    await district.selectOption({ index: 1 }).catch(async () => {
      await district.fill(customer.district);
    });
  }
  await page.getByLabel(/العنوان|الشارع/).first().fill(customer.addressLine);
}
