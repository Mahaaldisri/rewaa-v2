/** Formatting helpers — locale-aware, centralised so the whole store stays consistent. */

export const AR_SA_LOCALE = "ar-SA-u-nu-latn";

/** Prices use Latin digits (common in Saudi e-commerce) with the SAR symbol. */
const currencyFormatter = new Intl.NumberFormat(AR_SA_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number, withCurrency = true): string {
  const safe = Number.isFinite(value) ? value : 0;
  const num = currencyFormatter.format(safe);
  return withCurrency ? `${num} ر.س` : num;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(AR_SA_LOCALE).format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(AR_SA_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffDays = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `قبل ${diffDays} أيام`;
  if (diffDays < 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `قبل ${Math.floor(diffDays / 30)} أشهر`;
  return `قبل ${Math.floor(diffDays / 365)} سنة`;
}

/** Discount percentage between compare-at price and current price. */
export function discountPercent(price: number, compareAt?: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function savedAmount(price: number, compareAt?: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return compareAt - price;
}

/** Pads a number to two digits for countdown displays. */
export function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function rangeLabel(range: [number, number]): string {
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
