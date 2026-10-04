/**
 * Maintenance planning maths.
 *
 * Everything is derived from catalogue data (replacement interval of the
 * cartridge) plus the dates the customer provides. No health, quality or
 * laboratory claims are produced here — only arithmetic a shopper can verify.
 */
import { catalogEntries, productBySlug, summaryBySlug } from "@/data/catalog";
import { partsForDeviceSlug } from "@/lib/compatibility";
import type { ProductSummary } from "@/types/catalog";

export interface CustomerDevice {
  id: string;
  /** Catalogue slug of the installed system. */
  deviceSlug: string;
  deviceName: string;
  /** Optional serial/model written on the unit (from the box label). */
  serial?: string;
  city?: string;
  installedAt: string;
  lastCartridgeChange: string;
  /** Months between replacements — taken from the catalogue, editable by support. */
  intervalMonths: number;
  /** Catalogue slug of the cartridge set currently installed. */
  cartridgeSetSlug?: string;
  reminderChannels: ReminderChannels;
  createdAt: string;
}

export interface ReminderChannels {
  /** Scaffolding only: nothing is sent until a backend/provider is connected. */
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  /** Days before the due date a reminder should go out. */
  leadDays: number;
}

export interface MaintenancePlan {
  nextChangeAt: string;
  daysUntil: number;
  /** 0–100, clamped. 100 = just replaced, 0 = due/overdue. */
  percentRemaining: number;
  state: "ok" | "due_soon" | "overdue";
  /** Human label for the progress bar. */
  stateLabel: string;
  /** Cartridge set the catalogue recommends for this device, when known. */
  recommendedSet?: { summary: ProductSummary; note: string };
  /** Alternative sets, flagged as compatible-but-different. */
  alternatives: ProductSummary[];
}

export const DEFAULT_REMINDER_CHANNELS: ReminderChannels = {
  whatsapp: false,
  sms: false,
  email: false,
  leadDays: 14,
};

export function defaultIntervalMonths(deviceSlug: string): number {
  const summary = summaryBySlug(deviceSlug);
  const interval = summary?.attributes?.replacementMonths;
  if (typeof interval === "number" && interval > 0) return interval;
  // Fallback used only when the catalogue does not publish an interval.
  return 6;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + (to.getDate() - from.getDate()) / 30;
}

export function planFor(device: CustomerDevice, now = new Date()): MaintenancePlan {
  const last = new Date(device.lastCartridgeChange);
  const next = new Date(last);
  next.setMonth(next.getMonth() + device.intervalMonths);

  const daysUntil = Math.round((next.getTime() - now.getTime()) / 86_400_000);
  const state: MaintenancePlan["state"] = daysUntil < 0 ? "overdue" : daysUntil <= 30 ? "due_soon" : "ok";

  const elapsedMonths = monthsBetween(last, now);
  const usedRatio = device.intervalMonths > 0 ? elapsedMonths / device.intervalMonths : 1;
  const percentRemaining = Math.max(0, Math.min(100, Math.round((1 - usedRatio) * 100)));

  const compatibility = partsForDeviceSlug(device.deviceSlug);
  const sets = (compatibility?.parts ?? []).filter((part) => part.summary.subcategorySlug === "cartridge-sets");
  const explicitSet = device.cartridgeSetSlug ? summaryBySlug(device.cartridgeSetSlug) : undefined;

  const recommendedSet = explicitSet
    ? { summary: explicitSet, note: "الطقم المسجّل على هذا الجهاز في حسابك." }
    : sets[0]
      ? { summary: sets[0].summary, note: "الطقم الذي تُعلن بيانات الكتالوج توافقه مع هذا الجهاز." }
      : undefined;

  return {
    nextChangeAt: next.toISOString(),
    daysUntil,
    percentRemaining,
    state,
    stateLabel:
      state === "overdue"
        ? "تجاوزت الموعد الموصى به"
        : state === "due_soon"
          ? "الاستبدال قريب"
          : "الوضع جيد",
    recommendedSet,
    alternatives: sets
      .slice(1, 4)
      .map((part) => part.summary)
      .filter((summary) => summary.slug !== recommendedSet?.summary.slug),
  };
}

/** Short Arabic description of what the customer should do next. */
export function adviceFor(plan: MaintenancePlan): string {
  if (plan.state === "overdue") {
    return `مرّ موعد الاستبدال الموصى به بـ ${Math.abs(plan.daysUntil)} يومًا. اطلب طقم الشمعات المناسب أو احجز زيارة فني.`;
  }
  if (plan.state === "due_soon") {
    return `باقي ${plan.daysUntil} يومًا على موعد الاستبدال الموصى به — الوقت مناسب لطلب الطقم.`;
  }
  return `لا حاجة لإجراء الآن. الموعد التالي المتوقع بعد ${plan.daysUntil} يومًا حسب دورة الاستبدال المسجّلة.`;
}

/** Sum of a device's next maintenance visit requests — used by the account summary. */
export function devicesNeedingAttention(devices: CustomerDevice[]): CustomerDevice[] {
  return devices.filter((device) => planFor(device).state !== "ok");
}

/** Catalogue systems that can be registered as a customer device. */
export function deviceOptions(): ProductSummary[] {
  // Systems live in the device categories; anything else (cartridges, meters)
  // is a part, not a device that needs its own maintenance schedule.
  const DEVICE_CATEGORIES = ["water-filters", "whole-house", "desalination", "pumps-equipment"];
  return catalogEntries
    .filter((entry) => DEVICE_CATEGORIES.includes(entry.summary.categorySlug))
    .map((entry) => entry.summary);
}

/** Product line used by “Buy Again”. */
export function buyAgainLine(slug: string): { summary: ProductSummary; sku: string; price: number } | undefined {
  const product = productBySlug(slug);
  const summary = summaryBySlug(slug);
  if (!product || !summary) return undefined;
  return { summary, sku: product.variants[0]?.sku ?? product.sku, price: product.variants[0]?.price ?? product.price };
}

/**
 * Reminder delivery is scaffolding until a provider is connected: this returns
 * what *would* be sent, so the UI can show it without ever claiming a message
 * was delivered.
 */
export function reminderPreview(device: CustomerDevice, plan: MaintenancePlan): string {
  const channels = [
    device.reminderChannels.whatsapp ? "واتساب" : null,
    device.reminderChannels.sms ? "رسالة نصية" : null,
    device.reminderChannels.email ? "بريد إلكتروني" : null,
  ].filter(Boolean) as string[];

  if (channels.length === 0) return "لم تُفعّل أي قناة تذكير بعد.";
  return `سيُرسل تذكير عبر ${channels.join(" و")} قبل ${device.reminderChannels.leadDays} يومًا من الموعد (${new Date(
    plan.nextChangeAt
  ).toLocaleDateString("ar-SA")}). لم يتم ربط مزوّد إرسال فعلي بعد.`;
}
