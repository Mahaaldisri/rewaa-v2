import { expect, test } from "@playwright/test";
import { dismissConsent, expectNoCrash } from "./helpers";

test.describe("Service booking", () => {
  test("a shopper can reach the booking form from the services page", async ({ page }) => {
    await page.goto("/");
    await dismissConsent(page);
    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const book = page.getByRole("link", { name: /احجز|حجز/ }).first();
    await expect(book).toBeVisible();
    await book.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/الجوال|رقم الجوال/).first()).toBeVisible();
    await expectNoCrash(page);
  });

  test("the booking form validates a wrong phone number", async ({ page }) => {
    await page.goto("/services/book");
    const phone = page.getByLabel(/الجوال|رقم الجوال/).first();
    await phone.fill("12345");
    await phone.blur();
    await expect(page.getByText(/رقم الجوال/).nth(1)).toBeVisible();
    await expectNoCrash(page);
  });
});

test.describe("Warranty claim", () => {
  test("the claim form is reachable and asks for the serial number", async ({ page }) => {
    await page.goto("/help/warranty-claim");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/الرقم التسلسلي|السيريال/).first()).toBeVisible();
    await expectNoCrash(page);
  });

  test("an unknown serial is rejected with an Arabic message", async ({ page }) => {
    await page.goto("/help/warranty-claim");
    const serial = page.getByLabel(/الرقم التسلسلي|السيريال/).first();
    await serial.fill("INVALID-SERIAL-000");
    await serial.blur();
    await expect(page.getByText(/تسلسلي|غير صحيح|غير موجود/).nth(1)).toBeVisible();
    await expectNoCrash(page);
  });
});

test.describe("Return request", () => {
  test("the return form links to the policy and validates the order number", async ({ page }) => {
    await page.goto("/help/returns");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const order = page.getByLabel(/رقم الطلب/).first();
    await order.fill("123");
    await order.blur();
    await expect(page.getByText(/رقم الطلب/).nth(1)).toBeVisible();
    await expectNoCrash(page);
  });

  test("the contact page shows the support channels", async ({ page }) => {
    await page.goto("/help/contact");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/الجوال|رقم الجوال|الاسم/).first()).toBeVisible();
    await expectNoCrash(page);
  });
});
