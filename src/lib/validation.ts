/**
 * Form validation helpers with Arabic messages.
 * Kept dependency-free and framework-agnostic so every form in the storefront
 * validates the same way.
 */

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export const patterns = {
  /** Saudi mobile: 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX */
  saudiMobile: /^(?:\+?966|0)?5\d{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  /** Order / service references handed out by the store. */
  orderReference: /^RWA-[A-Z]{3}-\d{4}-\d{4,5}$/i,
  orderNumber: /^RWA-\d{8}-\d{3,5}$/i,
  digits: /^\d+$/,
  serial: /^[A-Z0-9-]{4,24}$/i,
};

export function required(value: string | undefined | null, label = "هذا الحقل"): string | undefined {
  if (!value || !value.trim()) return `${label} مطلوب`;
  return undefined;
}

export function minLength(value: string, length: number, label = "هذا الحقل"): string | undefined {
  if (value.trim().length < length) return `${label} يجب أن يكون ${length} أحرف على الأقل`;
  return undefined;
}

export function isPhone(value: string): boolean {
  return patterns.saudiMobile.test(value.replace(/[\s-]/g, ""));
}

export function phoneError(value: string, requiredField = true): string | undefined {
  const clean = value.replace(/[\s-]/g, "");
  if (!clean) return requiredField ? "رقم الجوال مطلوب" : undefined;
  if (!isPhone(clean)) return "أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX";
  return undefined;
}

export function emailError(value: string, requiredField = true): string | undefined {
  const clean = value.trim();
  if (!clean) return requiredField ? "البريد الإلكتروني مطلوب" : undefined;
  if (!patterns.email.test(clean)) return "صيغة البريد الإلكتروني غير صحيحة";
  return undefined;
}

export function firstError<T extends Record<string, unknown>>(errors: ValidationErrors<T>): string | undefined {
  return Object.values(errors).find((value) => typeof value === "string") as string | undefined;
}

export function hasErrors<T extends Record<string, unknown>>(errors: ValidationErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Password strength shown on register / reset screens. */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: "danger" | "warning" | "info" | "success";
  hints: string[];
}

export function passwordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  let score = 0;
  if (password.length >= 8) score += 1;
  else hints.push("8 أحرف على الأقل");
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  else hints.push("حروف وأرقام معًا");
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else hints.push("رمز واحد على الأقل");
  if (password.length >= 12) score += 1;

  const bounded = Math.min(4, score) as PasswordStrength["score"];
  const meta: Record<number, { label: string; tone: PasswordStrength["tone"] }> = {
    0: { label: "ضعيفة جدًا", tone: "danger" },
    1: { label: "ضعيفة", tone: "danger" },
    2: { label: "متوسطة", tone: "warning" },
    3: { label: "جيدة", tone: "info" },
    4: { label: "قوية", tone: "success" },
  };

  return { score: bounded, ...meta[bounded], hints };
}

/** Formats a phone number for display without changing the stored value. */
export function formatSaudiPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("966") ? `0${digits.slice(3)}` : digits;
  if (local.length === 10) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  return value;
}
