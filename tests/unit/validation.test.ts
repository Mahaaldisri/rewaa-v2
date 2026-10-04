import { describe, expect, it } from "vitest";
import { emailError, formatSaudiPhone, isPhone, passwordStrength, patterns, phoneError, required } from "@/lib/validation";

describe("Saudi phone validation", () => {
  it.each(["0512345678", "512345678", "+966512345678", "966512345678"])("accepts %s", (value) => {
    expect(isPhone(value)).toBe(true);
    expect(phoneError(value)).toBeUndefined();
  });

  it.each(["0412345678", "12345", "05123456789", "abc"])("rejects %s", (value) => {
    expect(isPhone(value)).toBe(false);
    expect(phoneError(value)).toBeTruthy();
  });

  it("normalises numbers for display", () => {
    expect(formatSaudiPhone("512345678")).toMatch(/^0?5/);
  });
});

describe("email + required validation", () => {
  it("accepts a valid address and rejects a malformed one", () => {
    expect(emailError("user@example.com")).toBeUndefined();
    expect(emailError("user@")).toBeTruthy();
  });

  it("honours the optional flag", () => {
    expect(emailError("", false)).toBeUndefined();
    expect(phoneError("", false)).toBeUndefined();
    expect(required("", "الاسم")).toBeTruthy();
  });
});

describe("references and passwords", () => {
  it("matches order and service reference formats", () => {
    expect(patterns.orderNumber.test("RWA-20260101-1234")).toBe(true);
    expect(patterns.orderReference.test("RWA-SRV-2026-12345")).toBe(true);
    expect(patterns.orderNumber.test("1234")).toBe(false);
  });

  it("scores weak and strong passwords differently", () => {
    expect(passwordStrength("1234").score).toBeLessThan(passwordStrength("Str0ng!Pass2026").score);
  });
});
