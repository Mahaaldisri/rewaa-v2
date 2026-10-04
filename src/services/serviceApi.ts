import type {
  MaintenanceReminder,
  MaintenanceReminderView,
  ServiceRequest,
  ServiceRequestInput,
  ServiceRequestStatus,
  ServiceRequestType,
} from "@/types/service";
import { ApiError } from "@/types/product";
import { readJSON, writeJSON } from "@/lib/localStore";
import { bookableServiceTypes } from "@/data/content/services";

/**
 * Service-request API (installation, maintenance, cartridge change, water test,
 * faults and leaks). Data persists in localStorage with references shaped like
 * `RWA-SRV-2026-00042` so the tracking page has something real to resolve.
 */

const REQUESTS_KEY = "rewaa_service_requests";
const REMINDERS_KEY = "rewaa_maintenance_reminders";

function delay(ms = 620): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typeLabel(type: ServiceRequestType): string {
  return bookableServiceTypes.find((item) => item.id === type)?.label ?? "خدمة";
}

function readRequests(): ServiceRequest[] {
  return readJSON<ServiceRequest[]>(REQUESTS_KEY, []);
}

function writeRequests(items: ServiceRequest[]): void {
  writeJSON(REQUESTS_KEY, items.slice(0, 120));
}

function nextServiceReference(existing: ServiceRequest[]): string {
  const year = new Date().getFullYear();
  const sequence = String(10000 + existing.length + 1).slice(-5);
  return `RWA-SRV-${year}-${sequence}`;
}

function buildTimeline(status: ServiceRequestStatus, createdAt: string): ServiceRequest["timeline"] {
  const steps: ServiceRequest["timeline"] = [
    { status: "submitted", label: "تم استلام طلب الخدمة", at: createdAt },
    { status: "confirmed", label: "تأكيد الطلب وتحديد الفريق" },
    { status: "technician_assigned", label: "تعيين الفني" },
    { status: "scheduled", label: "تثبيت الموعد" },
    { status: "in_progress", label: "تنفيذ الزيارة" },
    { status: "completed", label: "إغلاق الطلب" },
  ];
  const index = steps.findIndex((step) => step.status === status);
  return steps.map((step, i) => (i <= index ? { ...step, at: step.at ?? createdAt } : step));
}

const TECHNICIANS = [
  { name: "أحمد الغامدي", phone: "0551234567", rating: 4.9 },
  { name: "سعد العتيبي", phone: "0559876543", rating: 4.8 },
  { name: "ياسر الحربي", phone: "0553456789", rating: 4.7 },
];

export const serviceApi = {
  /** POST /v1/service-requests */
  async create(input: ServiceRequestInput): Promise<ServiceRequest> {
    await delay(900);
    if (!input.customerName.trim() || !input.phone.trim()) {
      throw new ApiError("يرجى إدخال الاسم ورقم الجوال", "VALIDATION", 422);
    }
    if (!input.cityId) {
      throw new ApiError("يرجى اختيار المدينة", "VALIDATION", 422);
    }

    const existing = readRequests();
    const createdAt = new Date().toISOString();
    const request: ServiceRequest = {
      id: `srv_${Date.now()}`,
      reference: nextServiceReference(existing),
      type: input.type,
      typeLabel: typeLabel(input.type),
      productSlug: input.productSlug,
      productLabel: input.productLabel,
      deviceDescription: input.deviceDescription,
      cityId: input.cityId,
      cityName: input.cityName,
      district: input.district,
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim(),
      preferredDate: input.preferredDate,
      preferredSlot: input.preferredSlot,
      description: input.description,
      attachments: input.attachments,
      status: "submitted",
      createdAt,
      timeline: buildTimeline("submitted", createdAt),
      estimatedVisit: "خلال 24 – 48 ساعة عمل",
      planId: input.planId,
      userId: input.userId,
    };

    writeRequests([request, ...existing]);
    return request;
  },

  /** GET /v1/service-requests?userId= */
  async list(userId?: string): Promise<ServiceRequest[]> {
    await delay(320);
    const all = readRequests();
    return all
      .filter((request) => (userId ? request.userId === userId : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /** GET /v1/service-requests/:reference */
  async getByReference(reference: string): Promise<ServiceRequest> {
    await delay(320);
    const normalized = reference.trim().toUpperCase();
    const found = readRequests().find((request) => request.reference.toUpperCase() === normalized);
    if (!found) throw new ApiError("لم نعثر على طلب خدمة بهذا الرقم", "NOT_FOUND", 404);
    return found;
  },

  /** POST /v1/service-requests/:id/cancel */
  async cancel(id: string): Promise<ServiceRequest> {
    await delay(420);
    const all = readRequests();
    const target = all.find((request) => request.id === id);
    if (!target) throw new ApiError("الطلب غير موجود", "NOT_FOUND", 404);
    if (target.status === "completed") {
      throw new ApiError("لا يمكن إلغاء طلب مكتمل — تواصل مع الدعم", "VALIDATION", 422);
    }
    const updated: ServiceRequest = {
      ...target,
      status: "cancelled",
      timeline: [...target.timeline, { status: "cancelled", label: "تم إلغاء الطلب", at: new Date().toISOString() }],
    };
    writeRequests(all.map((request) => (request.id === id ? updated : request)));
    return updated;
  },

  /** Demo progression used by the tracking page to show a live timeline. */
  async advance(id: string): Promise<ServiceRequest> {
    await delay(360);
    const all = readRequests();
    const target = all.find((request) => request.id === id);
    if (!target) throw new ApiError("الطلب غير موجود", "NOT_FOUND", 404);

    const order: ServiceRequestStatus[] = [
      "submitted",
      "confirmed",
      "technician_assigned",
      "scheduled",
      "in_progress",
      "completed",
    ];
    const currentIndex = order.indexOf(target.status);
    const nextStatus = order[Math.min(order.length - 1, currentIndex + 1)];
    const technician = target.technician ?? TECHNICIANS[Math.floor(Math.random() * TECHNICIANS.length)];

    const updated: ServiceRequest = {
      ...target,
      status: nextStatus,
      technician: currentIndex >= 1 ? technician : target.technician,
      timeline: buildTimeline(nextStatus, target.createdAt),
    };
    writeRequests(all.map((request) => (request.id === id ? updated : request)));
    return updated;
  },

  /* --------------------------- Maintenance reminders -------------------------- */
  async listReminders(): Promise<MaintenanceReminder[]> {
    await delay(220);
    return readJSON<MaintenanceReminder[]>(REMINDERS_KEY, []);
  },

  async addReminder(input: Omit<MaintenanceReminder, "id" | "createdAt">): Promise<MaintenanceReminder> {
    await delay(420);
    const existing = readJSON<MaintenanceReminder[]>(REMINDERS_KEY, []);
    const reminder: MaintenanceReminder = {
      ...input,
      id: `rem_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    writeJSON(REMINDERS_KEY, [reminder, ...existing].slice(0, 30));
    return reminder;
  },

  async removeReminder(id: string): Promise<{ id: string }> {
    await delay(240);
    const existing = readJSON<MaintenanceReminder[]>(REMINDERS_KEY, []);
    writeJSON(
      REMINDERS_KEY,
      existing.filter((item) => item.id !== id)
    );
    return { id };
  },
};

/** Adds the derived fields (next date, countdown, state) used by the UI. */
export function toReminderView(
  reminder: MaintenanceReminder,
  image?: string
): MaintenanceReminderView {
  const last = new Date(reminder.lastCartridgeChange).getTime();
  const next = new Date(last);
  next.setMonth(next.getMonth() + reminder.intervalMonths);
  const daysUntil = Math.round((next.getTime() - Date.now()) / 86_400_000);
  const state: MaintenanceReminderView["state"] = daysUntil < 0 ? "overdue" : daysUntil <= 30 ? "due_soon" : "ok";

  return {
    ...reminder,
    nextChangeAt: next.toISOString(),
    daysUntil,
    state,
    image,
  };
}
